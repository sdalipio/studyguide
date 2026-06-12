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

# How many chunks to embed per batch. Smaller = smoother progress bar; larger =
# fewer DB commits. 64 is a good balance even for very large chapters.
EMBED_BATCH = 64


def _set_progress(db, doc: Document, pct: int, stage: str | None) -> None:
    """Record ingestion progress and commit so the polling GET can see it."""
    doc.progress = pct
    doc.stage = stage
    db.commit()


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
        _set_progress(db, doc, 5, "Reading document")

        method, slices = detect_topics(parsed)
        doc.topic_method = method
        _set_progress(db, doc, 15, "Organizing topics")

        if not slices:
            doc.status = "error"
            doc.error = "No readable text found in the document."
            db.commit()
            return

        # Pre-chunk every topic first so we know the total work, then embed in
        # batches and advance the bar from 15% -> 95% as chunks are embedded.
        topic_plans = [(sl, _chunk_segments(sl.segments)) for sl in slices]
        total_chunks = sum(len(pairs) for _, pairs in topic_plans) or 1
        done = 0

        for sl, pairs in topic_plans:
            topic = Topic(
                document_id=doc.id,
                title=sl.title,
                order_index=sl.order_index,
                start_pos=sl.start_pos,
                end_pos=sl.end_pos,
            )
            db.add(topic)
            db.flush()  # assign topic.id

            for start in range(0, len(pairs), EMBED_BATCH):
                batch = pairs[start : start + EMBED_BATCH]
                vectors = embeddings.embed_texts([p[0] for p in batch])
                for (content, location), vec in zip(batch, vectors):
                    db.add(
                        Chunk(
                            document_id=doc.id,
                            topic_id=topic.id,
                            content=content,
                            location=location,
                            embedding=vec,
                        )
                    )
                done += len(batch)
                _set_progress(db, doc, 15 + int(80 * done / total_chunks), "Embedding passages")

        doc.status = "ready"
        _set_progress(db, doc, 100, None)
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
