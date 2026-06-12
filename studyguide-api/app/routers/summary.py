"""Topic summary (generated + cached)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Topic
from app.schemas import SummaryOut
from app.services import generate

router = APIRouter(prefix="/api/topics", tags=["summary"])


@router.get("/{topic_id}/summary", response_model=SummaryOut)
def get_summary(topic_id: int, db: Session = Depends(get_db)):
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(404, "Topic not found.")
    summary = generate.get_or_create_summary(db, topic)
    return SummaryOut(topic_id=topic_id, summary=summary)
