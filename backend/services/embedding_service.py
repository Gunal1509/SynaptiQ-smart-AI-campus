import logging
import numpy as np
from typing import List, Union

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Embedding service utilizing the existing SentenceTransformer all-MiniLM-L6-v2 model.
    Encodes candidate educational video metadata and student learning needs
    into 384-dimensional vector space for semantic similarity ranking.
    """

    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
        return cls._instance

    def _get_model(self):
        if self._model is None:
            try:
                import os
                from sentence_transformers import SentenceTransformer
                model_name = os.getenv("CUSTOM_EMBEDDING_MODEL", "").strip()
                if not model_name or not os.path.exists(model_name):
                    model_name = "all-MiniLM-L6-v2"
                logger.info(f"Loading SentenceTransformer('{model_name}')...")
                self._model = SentenceTransformer(model_name)
                logger.info(f"SentenceTransformer model '{model_name}' loaded successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize SentenceTransformer: {e}. Using deterministic fallback encoder.")
                self._model = "fallback"
        return self._model

    def encode(self, texts: Union[str, List[str]]) -> np.ndarray:
        """Encode text or list of texts to normalized embeddings."""
        is_single = isinstance(texts, str)
        text_list = [texts] if is_single else texts

        model = self._get_model()

        if model != "fallback":
            try:
                embeddings = model.encode(text_list, normalize_embeddings=True)
                return embeddings[0] if is_single else embeddings
            except Exception as ex:
                logger.warning(f"Model encode failed: {ex}. Falling back to deterministic embedding.")

        # Deterministic semantic hash fallback for resilient execution
        dim = 384
        out = []
        for t in text_list:
            vec = np.zeros(dim, dtype=np.float32)
            # Token-based distribution
            words = t.lower().split()
            for i, w in enumerate(words):
                h = abs(hash(w)) % dim
                vec[h] += 1.0 / (1.0 + (i * 0.1))
            norm = np.linalg.norm(vec)
            if norm > 1e-6:
                vec = vec / norm
            else:
                vec[0] = 1.0
            out.append(vec)

        arr = np.array(out)
        return arr[0] if is_single else arr

    @staticmethod
    def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Compute cosine similarity between two vectors, normalized to [0.0, 1.0]."""
        dot = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 < 1e-6 or norm2 < 1e-6:
            return 0.5

        raw_sim = dot / (norm1 * norm2)
        # Clip to [-1.0, 1.0] and normalize to [0.0, 1.0]
        clipped = float(np.clip(raw_sim, -1.0, 1.0))
        # For normalized embeddings with positive dot product, keep in 0-1
        normalized_sim = (clipped + 1.0) / 2.0
        return round(normalized_sim, 4)

    def compute_batch_similarities(self, query_text: str, candidate_texts: List[str]) -> List[float]:
        """Compute cosine similarities between query and a batch of candidates."""
        if not candidate_texts:
            return []

        query_vec = self.encode(query_text)
        candidate_vecs = self.encode(candidate_texts)

        scores = []
        for c_vec in candidate_vecs:
            sim = self.cosine_similarity(query_vec, c_vec)
            scores.append(sim)

        return scores
