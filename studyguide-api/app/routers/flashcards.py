"""Topic flashcards (generated + cached)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Topic
from app.schemas import FlashcardOut
from app.services import generate

router = APIRouter(prefix="/api/topics", tags=["flashcards"])


@router.get("/{topic_id}/flashcards", response_model=list[FlashcardOut])
def get_flashcards(topic_id: int, db: Session = Depends(get_db)):
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(404, "Topic not found.")
    return generate.get_or_create_flashcards(db, topic)


@router.post("/{topic_id}/flashcards/more", response_model=list[FlashcardOut])
def generate_more_flashcards(topic_id: int, db: Session = Depends(get_db)):
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(404, "Topic not found.")
    return generate.generate_more_flashcards(db, topic)
