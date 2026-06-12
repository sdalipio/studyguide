"""Topic quiz (generated + cached) and scoring."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Topic, QuizQuestion
from app.schemas import QuizQuestionOut, ScoreRequest, ScoreResult
from app.services import generate

router = APIRouter(prefix="/api/topics", tags=["quiz"])


@router.get("/{topic_id}/quiz", response_model=list[QuizQuestionOut])
def get_quiz(topic_id: int, db: Session = Depends(get_db)):
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(404, "Topic not found.")
    return generate.get_or_create_quiz(db, topic)


@router.post("/{topic_id}/quiz/more", response_model=list[QuizQuestionOut])
def generate_more_quiz(topic_id: int, db: Session = Depends(get_db)):
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(404, "Topic not found.")
    return generate.generate_more_quiz(db, topic)


@router.post("/{topic_id}/quiz/score", response_model=ScoreResult)
def score_quiz(topic_id: int, body: ScoreRequest, db: Session = Depends(get_db)):
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(404, "Topic not found.")

    questions = {q.id: q for q in topic.quiz_questions}
    results: dict[int, bool] = {}
    correct = 0
    for qid, chosen in body.answers.items():
        q = questions.get(int(qid))
        if q is None:
            continue
        # All-or-nothing: the chosen set must exactly match the correct set.
        is_right = {int(c) for c in chosen} == set(q.correct_indices)
        results[int(qid)] = is_right
        correct += int(is_right)

    # Total reflects this submission (a single round), not the whole question bank.
    return ScoreResult(total=len(results), correct=correct, results=results)
