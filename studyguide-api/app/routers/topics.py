"""Single-topic metadata lookup (used by study pages to render headers)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Topic
from app.schemas import TopicDetailOut

router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.get("/{topic_id}", response_model=TopicDetailOut)
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(404, "Topic not found.")
    return TopicDetailOut(
        id=topic.id,
        title=topic.title,
        document_id=topic.document_id,
        document_title=topic.document.title,
    )
