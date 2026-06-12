"""Ingestion pipeline: parse -> detect topics -> chunk -> embed -> persist.

Runs in a FastAPI BackgroundTask. The document row is created first with
status='processing'; this function fills in topics/chunks and flips the status
to 'ready' (or 'error').
"""
from pathlib import Path

from app.db import SessionLocal
from app.config import settings
from app.models import Document, Topic, Chunk
from app.services.parsers import parse_file, Segment
from app.services.topics import detect_topics
from app.services import embeddings

# chunk_size/overlap are expressed in tokens; ~4 chars per token is a fine proxy.
_CHARS_PER_TOKEN = 4


def _chunk_segments(segments: list[Segment]) -> list[tuple[str, str]]:
    """Split a topic's segments into (text, location) chunks."""
    size = settings.chunk_size * _CHARS_PER_TOKEN
    overlap = settings.chunk_overlap * _CHARS_PER_TOKEN
    chunks: list[tuple[str, str]] = []

    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        if len(text) <= size:
            chunks.append((text, seg.location))
            continue
        start = 0
        while start < len(text):
            piece = text[start : start + size].strip()
            if piece:
                chunks.append((piece, seg.location))
            start += size - overlap
    return chunks


def _derive_title(filename: str) -> str:
    stem = Path(filename).stem.replace("_", " ").replace("-", " ").strip()
    return stem.title() if stem else filename


def process_document(doc_id: int, filename: str, data: bytes) -> None:
    db = SessionLocal()
    try:
        doc = db.get(Document, doc_id)
        if doc is None:
            return

        parsed = parse_file(filename, data)
        doc.page_count = parsed.page_count
        method, slices = detect_topics(parsed)
        doc.topic_method = method

        if not slices:
            doc.status = "error"
            doc.error = "No readable text found in the document."
            db.commit()
            return

        for sl in slices:
            topic = Topic(
                document_id=doc.id,
                title=sl.title,
                order_index=sl.order_index,
                start_pos=sl.start_pos,
                end_pos=sl.end_pos,
            )
            db.add(topic)
            db.flush()  # assign topic.id

            pairs = _chunk_segments(sl.segments)
            if not pairs:
                continue
            vectors = embeddings.embed_texts([p[0] for p in pairs])
            for (content, location), vec in zip(pairs, vectors):
                db.add(
                    Chunk(
                        document_id=doc.id,
                        topic_id=topic.id,
                        content=content,
                        location=location,
                        embedding=vec,
                    )
                )

        doc.status = "ready"
        db.commit()
    except Exception as exc:  # noqa: BLE001 - record failure for the UI
        db.rollback()
        doc = db.get(Document, doc_id)
        if doc is not None:
            doc.status = "error"
            doc.error = str(exc)[:1000]
            db.commit()
    finally:
        db.close()


def create_document_row(db, filename: str) -> Document:
    source_type = "pdf" if filename.lower().endswith(".pdf") else "docx"
    doc = Document(
        filename=filename,
        title=_derive_title(filename),
        source_type=source_type,
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc
