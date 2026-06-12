"""SQLAlchemy ORM models for StudyGuide."""
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.config import settings


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(512))
    title: Mapped[str] = mapped_column(String(512))
    source_type: Mapped[str] = mapped_column(String(16))  # 'pdf' | 'docx'
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="processing")  # processing|ready|error
    topic_method: Mapped[str | None] = mapped_column(String(16), nullable=True)  # outline|ai
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    topics: Mapped[list["Topic"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(512))
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    start_pos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    end_pos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)  # cached

    document: Mapped["Document"] = relationship(back_populates="topics")
    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan"
    )
    flashcards: Mapped[list["Flashcard"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan"
    )
    quiz_questions: Mapped[list["QuizQuestion"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan"
    )


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), index=True
    )
    content: Mapped[str] = mapped_column(Text)
    location: Mapped[str] = mapped_column(String(128))  # "p. 41" or "§ Heading"
    embedding: Mapped[list[float]] = mapped_column(Vector(settings.embedding_dim))

    document: Mapped["Document"] = relationship(back_populates="chunks")
    topic: Mapped["Topic"] = relationship(back_populates="chunks")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), index=True
    )
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)

    topic: Mapped["Topic"] = relationship(back_populates="flashcards")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), index=True
    )
    question: Mapped[str] = mapped_column(Text)
    options: Mapped[list] = mapped_column(JSON)  # list[str]
    correct_index: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    topic: Mapped["Topic"] = relationship(back_populates="quiz_questions")
