"""StudyGuide API — FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.routers import documents, topics, chat, summary, flashcards, quiz


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="StudyGuide API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(topics.router)
app.include_router(chat.router)
app.include_router(summary.router)
app.include_router(flashcards.router)
app.include_router(quiz.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "groq_configured": settings.groq_configured}
