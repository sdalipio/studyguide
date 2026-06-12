"""Topic-scoped streaming chat (RAG)."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db import get_db, SessionLocal
from app.models import Topic
from app.schemas import ChatRequest
from app.services import rag

router = APIRouter(prefix="/api/topics", tags=["chat"])


@router.post("/{topic_id}/chat")
def chat(topic_id: int, body: ChatRequest, db: Session = Depends(get_db)):
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(404, "Topic not found.")
    question = (body.question or "").strip()
    if not question:
        raise HTTPException(400, "Question is required.")

    def event_stream():
        # Use a dedicated session for the life of the stream.
        stream_db = SessionLocal()
        try:
            yield from rag.answer_sse(stream_db, topic_id, question)
        finally:
            stream_db.close()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
