"""Local sentence-transformers embeddings (free, CPU). Model is loaded once."""
import os

# Ignore any (possibly expired) HuggingFace token cached on this machine — the
# embedding model is public and must download anonymously.
os.environ.setdefault("HF_HUB_DISABLE_IMPLICIT_TOKEN", "1")

from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.config import settings


@lru_cache(maxsize=1)
def _model() -> SentenceTransformer:
    return SentenceTransformer(settings.embedding_model, token=False)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts. Returns list of float vectors."""
    vectors = _model().encode(
        texts, normalize_embeddings=True, show_progress_bar=False
    )
    return [v.tolist() for v in vectors]


def embed_query(text: str) -> list[float]:
    """Embed a single query string."""
    return embed_texts([text])[0]
