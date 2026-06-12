"""Document upload, listing, retrieval, deletion."""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Document, Topic, Chunk
from app.schemas import DocumentOut, TopicOut
from app.services import ingest

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED = (".pdf", ".docx")


@router.post("", response_model=DocumentOut, status_code=201)
async def upload_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(ALLOWED):
        raise HTTPException(400, "Only .pdf and .docx files are supported.")
    data = await file.read()
    if not data:
        raise HTTPException(400, "Uploaded file is empty.")

    doc = ingest.create_document_row(db, file.filename)
    background.add_task(ingest.process_document, doc.id, file.filename, data)
    return doc


@router.get("", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db)):
    return list(db.scalars(select(Document).order_by(Document.created_at.desc())).all())


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(404, "Document not found.")
    return doc


@router.get("/{doc_id}/topics", response_model=list[TopicOut])
def list_topics(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(404, "Document not found.")

    counts = dict(
        db.execute(
            select(Chunk.topic_id, func.count(Chunk.id))
            .where(Chunk.document_id == doc_id)
            .group_by(Chunk.topic_id)
        ).all()
    )
    topics = list(
        db.scalars(
            select(Topic).where(Topic.document_id == doc_id).order_by(Topic.order_index)
        ).all()
    )
    return [
        TopicOut(
            id=t.id,
            document_id=t.document_id,
            title=t.title,
            order_index=t.order_index,
            chunk_count=counts.get(t.id, 0),
        )
        for t in topics
    ]


@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(404, "Document not found.")
    db.delete(doc)
    db.commit()
