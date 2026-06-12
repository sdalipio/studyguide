"""Pydantic request/response schemas."""
from datetime import datetime
from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: int
    filename: str
    title: str
    source_type: str
    page_count: int
    status: str
    topic_method: str | None = None
    error: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class TopicOut(BaseModel):
    id: int
    document_id: int
    title: str
    order_index: int
    chunk_count: int = 0

    class Config:
        from_attributes = True


class TopicDetailOut(BaseModel):
    id: int
    title: str
    document_id: int
    document_title: str


class ChatRequest(BaseModel):
    question: str


class Citation(BaseModel):
    location: str
    snippet: str


class SummaryOut(BaseModel):
    topic_id: int
    summary: str


class FlashcardOut(BaseModel):
    id: int
    question: str
    answer: str

    class Config:
        from_attributes = True


class QuizQuestionOut(BaseModel):
    id: int
    question: str
    options: list[str]
    correct_index: int
    explanation: str | None = None

    class Config:
        from_attributes = True


class ScoreRequest(BaseModel):
    answers: dict[int, int]  # quiz_question_id -> chosen option index


class ScoreResult(BaseModel):
    total: int
    correct: int
    results: dict[int, bool]
