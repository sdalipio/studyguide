# StudyGuide — AI-Powered Learning Platform (RAG)

Upload a **PDF or Word** document → StudyGuide automatically segments it into
**topics** → pick a topic and study it four ways:

- 💬 **Chat** with the topic (streaming RAG answers with source citations) — the hero feature
- 📜 **Summary** — a concise AI overview
- 🃏 **Flashcards** — flip-card study deck
- ✅ **Quiz** — scored multiple-choice test

Built to demonstrate an end-to-end **RAG pipeline**: parse → chunk → embed →
store in a vector database → retrieve → generate.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite, React Router, Framer Motion |
| Backend | Python, FastAPI, LangChain |
| LLM | **Groq** free tier (Llama 3.3 70B) — streaming |
| Embeddings | **sentence-transformers** `all-MiniLM-L6-v2` (local, free, 384-dim) |
| Vector DB + metadata | **PostgreSQL + pgvector** (Docker) |
| PDF / Word parsing | PyMuPDF / python-docx |
| Topic detection | Document TOC/headings, with embedding-based semantic segmentation fallback |

**Aesthetic:** an Editorial "Reading Room" — warm paper background, serif headlines,
calm teal accents, refined Framer Motion transitions.

---

## Architecture

```
Upload (PDF/DOCX)
      │  parse (PyMuPDF / python-docx)
      ▼
Topic detection ── has TOC/headings? ──► use outline  (free, instant)
      │                 └── no ──► semantic segmentation + LLM labels
      ▼
Chunk → embed (MiniLM) → store chunks + vectors in pgvector (tagged by topic)
      ▼
Per-topic study tools:
   Chat     : embed question → pgvector cosine search (topic-scoped) → stream Groq answer + citations
   Summary  : topic chunks → Groq → cached
   Flashcards/Quiz : topic chunks → Groq (structured JSON) → cached
```

Because every tool is **scoped to a single topic**, the app scales to very large
documents — the whole document is never sent to the LLM.

---

## Repository layout

This is a **monorepo** with two apps:

```
studyguide/
├── studyguide-frontend/   # React + Vite SPA          -> see its README
└── studyguide-api/        # FastAPI + RAG backend      -> see its README (doubles as a code study guide)
```

- **[studyguide-frontend/README.md](studyguide-frontend/README.md)** — UI, design system, pages, run steps
- **[studyguide-api/README.md](studyguide-api/README.md)** — architecture, the RAG similarity search explained, endpoints, data model

---

## Prerequisites

- Python 3.12+, Node 18+
- Docker Desktop (for the pgvector database)
- A free Groq API key — https://console.groq.com/keys

---

## Setup

### 1. Database (PostgreSQL + pgvector via Docker)

```bash
docker run -d --name studyguide-pg \
  -e POSTGRES_PASSWORD=systemadmin \
  -e POSTGRES_DB=studyguide \
  -p 5433:5432 \
  -v studyguide_pgdata:/var/lib/postgresql/data \
  pgvector/pgvector:pg17
```

### 2. Backend

```bash
cd studyguide-api
python -m venv venv
venv\Scripts\activate           # Windows  (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt

copy .env.example .env          # then edit .env and set GROQ_API_KEY
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd studyguide-frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## Environment variables (`studyguide-api/.env`)

```
GROQ_API_KEY=<your free Groq key>
GROQ_MODEL=llama-3.3-70b-versatile
DATABASE_URL=postgresql+psycopg://postgres:systemadmin@localhost:5433/studyguide
FRONTEND_ORIGIN=http://localhost:5173
```

The first run downloads the MiniLM embedding model (~90 MB) once.

---

## Cost

Free. Groq's free tier covers the LLM calls; embeddings run locally; PostgreSQL
runs in Docker. No paid APIs.
