import os
import re
import datetime
import logging
from typing import Optional, List, Dict, Any, Tuple
from bson import ObjectId
from fastapi import APIRouter, Form, HTTPException, status, Query
from pymongo import MongoClient
import numpy as np
import faiss
from pypdf import PdfReader
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

from services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

rag_router = APIRouter(tags=["RAG & Repository"])

# MongoDB connection
mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
mongo_db_name = os.getenv("MONGODB_DB", "ai_campus")
mongo_client = MongoClient(mongo_uri)
db = mongo_client[mongo_db_name]
uploads_collection = db['uploads']

# Dynamic Groq client for grounded answer synthesis
def get_groq_client() -> Optional[Groq]:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if api_key:
        try:
            return Groq(api_key=api_key)
        except Exception as e:
            logger.warning(f"Error initializing Groq client: {e}")
            return None
    return None

# Active RAG state with normalized FAISS IndexFlatIP
active_rag_state: Dict[str, Any] = {
    "file_id": None,
    "file_name": None,
    "file_path": None,
    "chunks": [],
    "chunk_metadata": [],
    "index": None,
    "chunk_count": 0,
    "indexed_at": None,
}


def recursive_semantic_split(text: str, max_chunk_chars: int = 950, overlap_chars: int = 160) -> List[str]:
    """
    Sentence-aware recursive text splitter.
    Preserves paragraph and sentence integrity, eliminating blind character slicing.
    """
    # 1. Clean up irregular whitespace, tabs, and duplicate empty lines
    clean_text = re.sub(r'\r\n|\r', '\n', text)
    clean_text = re.sub(r'\n{3,}', '\n\n', clean_text)
    clean_text = re.sub(r'[ \t]+', ' ', clean_text)

    # 2. Split by structural paragraph breaks
    paragraphs = clean_text.split('\n\n')
    chunks: List[str] = []
    current_chunk = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # If an individual paragraph exceeds max chunk size, break by sentences
        if len(para) > max_chunk_chars:
            sentences = re.split(r'(?<=[.!?])\s+', para)
            for s in sentences:
                s = s.strip()
                if not s:
                    continue
                if len(current_chunk) + len(s) + 1 <= max_chunk_chars:
                    current_chunk = (current_chunk + " " + s).strip()
                else:
                    if current_chunk and len(current_chunk) >= 60:
                        chunks.append(current_chunk)
                    # Carry forward overlapping tail to maintain semantic continuity
                    tail = current_chunk[-overlap_chars:] if len(current_chunk) > overlap_chars else ""
                    current_chunk = (tail + " " + s).strip()
        else:
            if len(current_chunk) + len(para) + 2 <= max_chunk_chars:
                current_chunk = (current_chunk + "\n\n" + para).strip()
            else:
                if current_chunk and len(current_chunk) >= 60:
                    chunks.append(current_chunk)
                tail = current_chunk[-overlap_chars:] if len(current_chunk) > overlap_chars else ""
                current_chunk = (tail + "\n\n" + para).strip()

    if current_chunk and len(current_chunk) >= 40:
        chunks.append(current_chunk)

    return chunks if chunks else [text[:1000]]


def synthesize_extractive_fallback(question: str, chunks: List[str], file_name: str) -> str:
    """
    High-quality structured synthesis when Groq LLM is offline or unconfigured.
    Scans retrieved chunks, ranks relevant sentences, and formats clear answer points.
    """
    q_words = set(re.findall(r'\b[a-zA-Z0-9_-]{3,}\b', question.lower()))

    ranked_sentences = []
    for chunk in chunks:
        sentences = re.split(r'(?<=[.!?\n])\s+', chunk)
        for s in sentences:
            s_clean = s.strip()
            if len(s_clean) < 30:
                continue
            s_lower = s_clean.lower()
            matches = sum(1 for w in q_words if w in s_lower)
            if matches > 0:
                score = matches / len(q_words)
                ranked_sentences.append((score, s_clean))

    ranked_sentences.sort(key=lambda x: x[0], reverse=True)

    if not ranked_sentences:
        # Fallback to key excerpt
        return (
            f"### Grounded Reference from `{file_name}`\n\n"
            f"{chunks[0]}\n\n"
            f"*(Add `GROQ_API_KEY` to `backend/.env` for conversational multi-sentence synthesis)*"
        )

    # Pick top unique sentences
    top_points = []
    seen = set()
    for _, sent in ranked_sentences:
        simplified = " ".join(sent.lower().split()[:6])
        if simplified not in seen:
            seen.add(simplified)
            top_points.append(sent)
        if len(top_points) >= 4:
            break

    bullet_list = "\n".join([f"• {pt}" for pt in top_points])
    return (
        f"### Key Findings from `{file_name}`:\n\n"
        f"{bullet_list}\n\n"
        f"--- \n*Extracted via semantic cosine retrieval from your verified course material.*"
    )


@rag_router.get("/files")
async def list_uploaded_files(email: Optional[str] = Query(None)):
    """
    Retrieve all course materials and syllabus files uploaded by the student.
    """
    query = {}
    if email and email.strip():
        query["email"] = email.strip()

    try:
        cursor = uploads_collection.find(query).sort("_id", -1)
        files_list = []
        for doc in cursor:
            f_path = doc.get("filePath", "")
            exists = os.path.exists(f_path) if f_path else False
            size = os.path.getsize(f_path) if exists else 0

            files_list.append({
                "id": str(doc["_id"]),
                "fileName": doc.get("fileName", "Untitled Document"),
                "fileType": doc.get("fileType", "pdf"),
                "filePath": f_path,
                "email": doc.get("email", ""),
                "userId": doc.get("userId", ""),
                "uploadedAt": doc.get("uploadedAt", doc.get("createdAt", datetime.datetime.utcnow().strftime("%Y-%m-%d"))),
                "fileSize": size,
                "isPdf": str(doc.get("fileType", "")).lower() == "pdf" or str(f_path).lower().endswith(".pdf"),
                "isActiveInRag": (str(doc["_id"]) == str(active_rag_state.get("file_id"))),
            })
        return {"files": files_list, "total": len(files_list)}
    except Exception as e:
        logger.error(f"Error fetching uploaded files: {e}")
        raise HTTPException(status_code=500, detail="Database error retrieving files.")


@rag_router.delete("/files/{file_id}")
async def delete_uploaded_file(file_id: str):
    """
    Delete an uploaded document from the student's repository and disk.
    """
    try:
        doc = uploads_collection.find_one({"_id": ObjectId(file_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="File not found in repository.")

        file_path = doc.get("filePath")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as ex:
                logger.warning(f"Could not remove physical file: {ex}")

        uploads_collection.delete_one({"_id": ObjectId(file_id)})

        if str(active_rag_state.get("file_id")) == file_id:
            active_rag_state["file_id"] = None
            active_rag_state["file_name"] = None
            active_rag_state["file_path"] = None
            active_rag_state["chunks"] = []
            active_rag_state["chunk_metadata"] = []
            active_rag_state["index"] = None
            active_rag_state["chunk_count"] = 0
            active_rag_state["indexed_at"] = None

        return {"status": "success", "message": "File removed from repository."}
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@rag_router.get("/rag/active-file")
async def get_active_rag_document():
    """
    Returns metadata about the currently vectorized and loaded RAG document.
    """
    if not active_rag_state.get("index") or not active_rag_state.get("file_name"):
        return {"has_active_file": False, "file": None}

    return {
        "has_active_file": True,
        "file": {
            "file_id": active_rag_state["file_id"],
            "file_name": active_rag_state["file_name"],
            "chunk_count": active_rag_state["chunk_count"],
            "indexed_at": active_rag_state["indexed_at"],
        }
    }


@rag_router.post("/rag/index-file")
async def index_uploaded_file_for_rag(file_id: str = Form(...)):
    """
    Upgraded RAG Ingestion Pipeline:
    1. Extracts full text across pages.
    2. Performs recursive sentence-aware chunking (800-1000 chars, 160-char overlap).
    3. Normalizes dense vectors using all-MiniLM-L6-v2.
    4. Indexes into FAISS IndexFlatIP for true Cosine Similarity.
    """
    try:
        doc = uploads_collection.find_one({"_id": ObjectId(file_id)})
        if not doc:
            raise HTTPException(
                status_code=404,
                detail="Selected file does not exist in your repository. Please upload it first."
            )

        file_path = doc.get("filePath")
        file_name = doc.get("fileName", os.path.basename(file_path or "Document.pdf"))

        if not file_path or not os.path.exists(file_path):
            raise HTTPException(
                status_code=404,
                detail=f"Physical file for '{file_name}' not found on server disk."
            )

        # 1. Read document text
        text = ""
        page_indices = []
        if file_path.lower().endswith(".pdf"):
            reader = PdfReader(file_path)
            for page_num, page in enumerate(reader.pages):
                extracted = page.extract_text()
                if extracted and extracted.strip():
                    text += f"\n--- Page {page_num + 1} ---\n" + extracted
        elif file_path.lower().endswith(".txt"):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        else:
            try:
                reader = PdfReader(file_path)
                for page in reader.pages:
                    text += (page.extract_text() or "") + "\n"
            except Exception:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract readable text from document. Ensure it is not an image-only scan."
            )

        # 2. Recursive Sentence-Aware Semantic Chunking
        chunks = recursive_semantic_split(text, max_chunk_chars=950, overlap_chars=160)

        # 3. Dense Embedding Generation (all-MiniLM-L6-v2)
        embed_service = EmbeddingService()
        embeddings = embed_service.encode(chunks)
        embeddings = np.array(embeddings, dtype=np.float32)

        # 4. L2 Normalization for exact Cosine Similarity
        faiss.normalize_L2(embeddings)
        dim = embeddings.shape[1]

        # 5. Build FAISS IndexFlatIP (Inner Product of normalized vectors = Cosine Similarity)
        faiss_index = faiss.IndexFlatIP(dim)
        faiss_index.add(embeddings)

        # 6. Store in active RAG state
        active_rag_state["file_id"] = file_id
        active_rag_state["file_name"] = file_name
        active_rag_state["file_path"] = file_path
        active_rag_state["chunks"] = chunks
        active_rag_state["index"] = faiss_index
        active_rag_state["chunk_count"] = len(chunks)
        active_rag_state["indexed_at"] = datetime.datetime.utcnow().strftime("%H:%M:%S")

        logger.info(f"RAG successfully indexed '{file_name}': {len(chunks)} recursive chunks in IndexFlatIP (dim={dim})")

        return {
            "status": "success",
            "message": f"Successfully indexed '{file_name}' into vector space with cosine normalization.",
            "file_id": file_id,
            "file_name": file_name,
            "chunk_count": len(chunks)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error vectorizing file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@rag_router.post("/rag/ask")
async def query_rag_document(question: str = Form(...)):
    """
    Upgraded RAG Retrieval & Synthesis Pipeline:
    1. Normalized query embedding.
    2. Cosine Similarity search with FAISS IndexFlatIP (Top 5).
    3. Hybrid Re-ranking (Dense Semantic + Lexical Keyword match).
    4. Structured academic synthesis with citations.
    """
    if active_rag_state["index"] is None or not active_rag_state["chunks"]:
        return {
            "answer": "No uploaded document is currently loaded in RAG. Please choose an uploaded file from the left panel and click 'Load & Vectorize Document' first.",
            "has_context": False,
            "context": "",
            "fileName": None
        }

    q_clean = question.strip()
    if not q_clean:
        return {"answer": "Please provide a question."}

    try:
        embed_service = EmbeddingService()
        q_vec = embed_service.encode(q_clean)
        q_arr = np.array([q_vec], dtype=np.float32)
        faiss.normalize_L2(q_arr)

        # 1. Cosine search for Top-5 passages
        k_search = min(5, len(active_rag_state["chunks"]))
        cos_scores, indices = active_rag_state["index"].search(q_arr, k=k_search)

        # 2. Hybrid Keyword & Semantic Re-ranking
        q_keywords = [w.lower() for w in re.findall(r'\b[a-zA-Z0-9_-]{3,}\b', q_clean)]
        hybrid_ranked: List[Tuple[float, str]] = []

        for idx, sim in zip(indices[0], cos_scores[0]):
            if idx >= len(active_rag_state["chunks"]):
                continue
            chunk_text = active_rag_state["chunks"][idx]
            chunk_lower = chunk_text.lower()

            # Exact keyword match ratio
            matches = sum(1 for kw in q_keywords if kw in chunk_lower)
            lexical_ratio = (matches / len(q_keywords)) if q_keywords else 0.0

            # 75% vector cosine similarity + 25% lexical keyword boost
            combined_score = 0.75 * float(sim) + 0.25 * float(lexical_ratio)
            hybrid_ranked.append((combined_score, chunk_text))

        hybrid_ranked.sort(key=lambda x: x[0], reverse=True)
        retrieved_chunks = [item[1] for item in hybrid_ranked]
        context = "\n\n---\n\n".join(retrieved_chunks)

        file_name = active_rag_state["file_name"]

        # 3. Clean Synthesis (Groq Llama 3.3 or Extractive Fallback)
        groq = get_groq_client()
        if groq:
            try:
                system_prompt = (
                    f"You are an academic university teaching assistant. Answer the student's question clearly, thoroughly, "
                    f"and accurately based strictly on the excerpts from their uploaded course document: '{file_name}'.\n\n"
                    f"Guidelines:\n"
                    f"- Provide a direct, well-structured answer with numbered points or bullet lists where appropriate.\n"
                    f"- If key definitions, formulas, or acronyms (like Nova, Keystone, BCNF, 3NF, etc.) appear in the text, explain them clearly.\n"
                    f"- Cite specific concepts mentioned in the excerpts.\n"
                    f"- If the document excerpt does not contain the answer, state: 'The provided document excerpts do not cover this specific question.'\n\n"
                    f"--- DOCUMENT EXCERPTS ---\n{context}\n-------------------------"
                )
                response = groq.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": q_clean}
                    ],
                    max_tokens=600,
                    temperature=0.2
                )
                answer_text = response.choices[0].message.content
            except Exception as groq_err:
                logger.warning(f"Groq API call failed: {groq_err}. Using structured extractive synthesis fallback.")
                answer_text = synthesize_extractive_fallback(q_clean, retrieved_chunks, file_name)
        else:
            answer_text = synthesize_extractive_fallback(q_clean, retrieved_chunks, file_name)

        return {
            "answer": answer_text,
            "has_context": True,
            "context": context,
            "fileName": file_name,
            "retrieved_count": len(retrieved_chunks)
        }

    except Exception as e:
        logger.error(f"Error querying RAG document: {e}", exc_info=True)
        return {
            "answer": f"Error querying document: {str(e)}",
            "has_context": False,
            "context": ""
        }
