"""Generate (and cache) summaries, flashcards, and quizzes per topic."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Topic, Chunk, Flashcard, QuizQuestion
from app.services import llm

# Cap context sent to the LLM so generation stays fast and within limits.
MAX_CONTEXT_CHARS = 12000


def _topic_text(db: Session, topic_id: int) -> str:
    chunks = list(
        db.scalars(
            select(Chunk).where(Chunk.topic_id == topic_id).order_by(Chunk.id)
        ).all()
    )
    text = "\n\n".join(c.content for c in chunks)
    return text[:MAX_CONTEXT_CHARS]


def get_or_create_summary(db: Session, topic: Topic) -> str:
    if topic.summary:
        return topic.summary
    text = _topic_text(db, topic.id)
    summary = llm.complete(
        system=(
            "You summarize study material. Write a clear, well-structured summary "
            "of the topic in 4-7 sentences, capturing the key ideas a student must "
            "know. Plain prose, no preamble."
        ),
        user=f"Topic: {topic.title}\n\n{text}",
    ).strip()
    topic.summary = summary
    db.commit()
    return summary


FLASHCARD_SYSTEM = (
    "You create study flashcards. Return a JSON array of {count} objects, each "
    '{{"question": "...", "answer": "..."}} covering important points of the topic. '
    "Questions are concise; answers are 1-3 sentences."
)

QUIZ_SYSTEM = (
    "You write multiple-choice quizzes. Return a JSON array of {count} objects, "
    'each {{"question": "...", "options": ["a","b","c","d"], '
    '"correct_index": 0, "explanation": "..."}}. Exactly 4 options each; '
    "correct_index is the 0-based index of the correct option."
)


def _avoid_clause(existing_questions: list[str]) -> str:
    if not existing_questions:
        return ""
    listed = "\n".join(f"- {q}" for q in existing_questions)
    return (
        "\n\nThese questions already exist — create entirely NEW, different ones "
        f"and do not repeat or paraphrase them:\n{listed}"
    )


def _build_flashcards(db, topic_id, data, seen: set[str]) -> list[Flashcard]:
    cards: list[Flashcard] = []
    for item in _as_list(data):
        q = str(item.get("question", "")).strip()
        a = str(item.get("answer", "")).strip()
        if q and a and q.lower() not in seen:
            seen.add(q.lower())
            card = Flashcard(topic_id=topic_id, question=q, answer=a)
            db.add(card)
            cards.append(card)
    db.commit()
    for c in cards:
        db.refresh(c)
    return cards


def _build_quiz(db, topic_id, data, seen: set[str]) -> list[QuizQuestion]:
    questions: list[QuizQuestion] = []
    for item in _as_list(data):
        q = str(item.get("question", "")).strip()
        options = item.get("options") or []
        ci = item.get("correct_index", 0)
        if not q or q.lower() in seen or not isinstance(options, list) or len(options) < 2:
            continue
        seen.add(q.lower())
        options = [str(o).strip() for o in options][:4]
        try:
            ci = int(ci)
        except (TypeError, ValueError):
            ci = 0
        ci = max(0, min(ci, len(options) - 1))
        qq = QuizQuestion(
            topic_id=topic_id,
            question=q,
            options=options,
            correct_index=ci,
            explanation=str(item.get("explanation", "")).strip() or None,
        )
        db.add(qq)
        questions.append(qq)
    db.commit()
    for qq in questions:
        db.refresh(qq)
    return questions


def _existing_flashcards(db, topic_id) -> list[Flashcard]:
    return list(
        db.scalars(
            select(Flashcard).where(Flashcard.topic_id == topic_id).order_by(Flashcard.id)
        ).all()
    )


def _existing_quiz(db, topic_id) -> list[QuizQuestion]:
    return list(
        db.scalars(
            select(QuizQuestion).where(QuizQuestion.topic_id == topic_id).order_by(QuizQuestion.id)
        ).all()
    )


def get_or_create_flashcards(db: Session, topic: Topic) -> list[Flashcard]:
    existing = _existing_flashcards(db, topic.id)
    if existing:
        return existing
    data = llm.complete_json(
        system=FLASHCARD_SYSTEM.format(count=8),
        user=f"Topic: {topic.title}\n\n{_topic_text(db, topic.id)}",
    )
    return _build_flashcards(db, topic.id, data, set())


def generate_more_flashcards(db: Session, topic: Topic, count: int = 8) -> list[Flashcard]:
    existing = _existing_flashcards(db, topic.id)
    if not existing:
        return get_or_create_flashcards(db, topic)
    seen = {c.question.lower() for c in existing}
    data = llm.complete_json(
        system=FLASHCARD_SYSTEM.format(count=count),
        user=f"Topic: {topic.title}\n\n{_topic_text(db, topic.id)}{_avoid_clause([c.question for c in existing])}",
        temperature=0.8,
    )
    _build_flashcards(db, topic.id, data, seen)
    return _existing_flashcards(db, topic.id)


def get_or_create_quiz(db: Session, topic: Topic) -> list[QuizQuestion]:
    existing = _existing_quiz(db, topic.id)
    if existing:
        return existing
    data = llm.complete_json(
        system=QUIZ_SYSTEM.format(count=5),
        user=f"Topic: {topic.title}\n\n{_topic_text(db, topic.id)}",
    )
    return _build_quiz(db, topic.id, data, set())


def generate_more_quiz(db: Session, topic: Topic, count: int = 5) -> list[QuizQuestion]:
    existing = _existing_quiz(db, topic.id)
    if not existing:
        return get_or_create_quiz(db, topic)
    seen = {q.question.lower() for q in existing}
    data = llm.complete_json(
        system=QUIZ_SYSTEM.format(count=count),
        user=f"Topic: {topic.title}\n\n{_topic_text(db, topic.id)}{_avoid_clause([q.question for q in existing])}",
        temperature=0.8,
    )
    _build_quiz(db, topic.id, data, seen)
    return _existing_quiz(db, topic.id)


def _as_list(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        # Sometimes the model wraps the array in a key.
        for v in data.values():
            if isinstance(v, list):
                return v
    return []
