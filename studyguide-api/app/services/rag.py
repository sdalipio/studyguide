"""Topic-scoped retrieval-augmented generation for the chat feature."""
import json
from typing import Iterator

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Chunk
from app.services import embeddings, llm

TOP_K = 5

SYSTEM_PROMPT = (
    "You are StudyGuide, a focused study assistant. Answer the student's question "
    "using ONLY the provided context from their document. Cite the source location "
    "in square brackets (e.g. [p. 41] or [§ Photosynthesis]) right after the claim "
    "it supports. If the answer is not in the context, say you couldn't find it in "
    "this topic. Be clear and concise."
)


def retrieve(db: Session, topic_id: int, question: str, k: int = TOP_K) -> list[Chunk]:
    qvec = embeddings.embed_query(question)
    stmt = (
        select(Chunk)
        .where(Chunk.topic_id == topic_id)
        .order_by(Chunk.embedding.cosine_distance(qvec))
        .limit(k)
    )
    return list(db.scalars(stmt).all())


def _build_context(chunks: list[Chunk]) -> str:
    return "\n\n".join(f"[{c.location}]\n{c.content}" for c in chunks)


def answer_sse(db: Session, topic_id: int, question: str) -> Iterator[str]:
    """Yield Server-Sent-Events: first the sources, then answer tokens, then done."""
    chunks = retrieve(db, topic_id, question)

    sources = [
        {"location": c.location, "snippet": c.content[:160].strip()} for c in chunks
    ]
    yield _sse({"type": "sources", "sources": sources})

    if not chunks:
        yield _sse(
            {
                "type": "token",
                "text": "I couldn't find anything about that in this topic.",
            }
        )
        yield _sse({"type": "done"})
        return

    context = _build_context(chunks)
    user = f"Context:\n{context}\n\nQuestion: {question}"
    try:
        for token in llm.stream(SYSTEM_PROMPT, user):
            yield _sse({"type": "token", "text": token})
    except Exception as exc:  # noqa: BLE001
        yield _sse({"type": "error", "text": str(exc)})
    yield _sse({"type": "done"})


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"
