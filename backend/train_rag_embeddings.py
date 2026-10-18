"""
SYNAPTIQ - Custom RAG Embedding Fine-Tuning Script
Fine-tunes 'all-MiniLM-L6-v2' on your university course syllabus and notes using
MultipleNegativesRankingLoss (Contrastive In-Batch Negative Learning).

Usage:
    python train_rag_embeddings.py --pdf uploads/sample.pdf --epochs 3 --batch_size 8
    python train_rag_embeddings.py --auto --epochs 2
"""

import os
import re
import argparse
import logging
from typing import List, Tuple
from pypdf import PdfReader
from torch.utils.data import DataLoader
from sentence_transformers import SentenceTransformer, InputExample, losses

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text across all pages in PDF."""
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found at: {pdf_path}")

    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n\n"
    return text


def create_training_pairs_from_text(text: str, max_pairs: int = 150) -> List[InputExample]:
    """
    Extracts semantic query-passage training pairs from academic text.
    Extracts section titles, definition statements, and formulas to build (Query, Context) tuples.
    """
    # Clean whitespace
    clean_text = re.sub(r'[ \t]+', ' ', text)
    paragraphs = [p.strip() for p in clean_text.split('\n\n') if len(p.strip()) > 80]

    examples: List[InputExample] = []

    for para in paragraphs:
        # 1. Search for definition patterns: "X is a ...", "X refers to ...", "X consists of ..."
        def_matches = re.findall(r'([A-Z][a-zA-Z0-9\s_-]{2,30})\s+(?:is a|is defined as|refers to|consists of|are)\s+', para)
        for term in def_matches:
            term_clean = term.strip()
            if 3 < len(term_clean) < 35:
                query = f"What is {term_clean}?"
                examples.append(InputExample(texts=[query, para]))
                query_explain = f"Explain the role and mechanism of {term_clean}."
                examples.append(InputExample(texts=[query_explain, para]))

        # 2. Search for numbered lists or steps
        if re.search(r'(?:Step \d|1\.|First,|Phase \d)', para):
            first_sentence = para.split('.')[0]
            query = f"What are the steps involved in {first_sentence[:50]}?"
            examples.append(InputExample(texts=[query, para]))

        # 3. Sentence-level concept queries
        sentences = re.split(r'(?<=[.!?])\s+', para)
        if len(sentences) >= 2:
            first_sent = sentences[0].strip()
            if len(first_sent) > 25 and not first_sent.startswith('Page'):
                query = f"Explain: {first_sent}"
                examples.append(InputExample(texts=[query, para]))

        if len(examples) >= max_pairs:
            break

    # If document has sparse patterns, fall back to sequential section queries
    if len(examples) < 10:
        for i, para in enumerate(paragraphs[:20]):
            snippet = para[:60].strip()
            query = f"What does the syllabus mention regarding {snippet}?"
            examples.append(InputExample(texts=[query, para]))

    logger.info(f"Generated {len(examples)} contrastive training pairs from document.")
    return examples


def train_custom_embeddings(
    pdf_paths: List[str],
    output_dir: str = "models/campus-minilm-custom",
    epochs: int = 3,
    batch_size: int = 8,
    learning_rate: float = 2e-5
):
    """
    Fine-tunes all-MiniLM-L6-v2 on university syllabus pairs with MultipleNegativesRankingLoss.
    """
    logger.info(f"Loading base embedding model 'all-MiniLM-L6-v2'...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    all_examples: List[InputExample] = []
    for path in pdf_paths:
        logger.info(f"Extracting training data from: {path}")
        try:
            doc_text = extract_text_from_pdf(path)
            pairs = create_training_pairs_from_text(doc_text)
            all_examples.extend(pairs)
        except Exception as e:
            logger.warning(f"Could not process {path}: {e}")

    if not all_examples:
        logger.error("No training pairs could be generated. Ensure your PDFs contain readable text.")
        return

    logger.info(f"Total training examples compiled: {len(all_examples)}")
    train_dataloader = DataLoader(all_examples, shuffle=True, batch_size=batch_size)

    # MultipleNegativesRankingLoss: Gold standard for passage retrieval
    # Given (query_i, pos_passage_i), treats pos_passage_j (j != i) as in-batch negative distractors!
    train_loss = losses.MultipleNegativesRankingLoss(model=model)

    warmup_steps = int(len(train_dataloader) * epochs * 0.1)

    logger.info(f"Starting fine-tuning: {epochs} epochs, batch_size={batch_size}, lr={learning_rate}, warmup_steps={warmup_steps}")

    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        epochs=epochs,
        warmup_steps=warmup_steps,
        optimizer_params={'lr': learning_rate},
        show_progress_bar=True
    )

    os.makedirs(output_dir, exist_ok=True)
    model.save(output_dir)
    logger.info(f"Custom fine-tuned embedding model successfully saved to: {output_dir}")

    # Quick evaluation
    test_q = "What are the core components?"
    sample_text = all_examples[0].texts[1]
    score = model.similarity(model.encode(test_q), model.encode(sample_text))
    logger.info(f"Sanity Check: Cosine similarity on syllabus test pair: {float(score):.4f}")
    logger.info("=" * 60)
    logger.info("To use this model in SYNAPTIQ, set:")
    logger.info(f"CUSTOM_EMBEDDING_MODEL={output_dir} in backend/.env")
    logger.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune all-MiniLM-L6-v2 on university syllabus documents.")
    parser.add_argument("--pdf", type=str, help="Path to specific syllabus PDF to train on")
    parser.add_argument("--auto", action="store_true", help="Automatically train on all PDFs found in uploads/ folder")
    parser.add_argument("--output_dir", type=str, default="models/campus-minilm-custom", help="Directory to save custom model")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs (default: 3)")
    parser.add_argument("--batch_size", type=int, default=8, help="Batch size (default: 8)")
    parser.add_argument("--lr", type=float, default=2e-5, help="Learning rate (default: 2e-5)")

    args = parser.parse_args()

    target_pdfs = []
    if args.pdf:
        target_pdfs.append(args.pdf)
    elif args.auto or not args.pdf:
        uploads_dir = "uploads"
        if os.path.exists(uploads_dir):
            for f in os.listdir(uploads_dir):
                if f.lower().endswith(".pdf"):
                    target_pdfs.append(os.path.join(uploads_dir, f))

    if not target_pdfs:
        print("No PDF files found to train on. Specify --pdf <path_to_pdf> or place a PDF in uploads/.")
    else:
        print(f"Target training PDFs ({len(target_pdfs)}): {target_pdfs}")
        train_custom_embeddings(
            pdf_paths=target_pdfs,
            output_dir=args.output_dir,
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.lr
        )
