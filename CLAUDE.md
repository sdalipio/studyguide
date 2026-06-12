# CLAUDE.md

Guidance for working in this repo. Read this before making changes.

## What this is

**StudyGuide** — an AI-powered learning platform demonstrating an end-to-end **RAG**
pipeline (parse → chunk → embed → store in pgvector → retrieve → generate). Upload a
PDF/Word doc → it's auto-segmented into **topics** → study each topic four ways: streaming
**Chat** (RAG + citations, the hero feature), **Summary**, **Flashcards**, scored **Quiz**.

Single-user, no authentication. Portfolio project (companion to BudgetTracker).
Public monorepo: https://github.com/sdalipio/studyguide. Status: feature-complete and
verified end-to-end; deployment intentionally skipped (see Decisions).

## Monorepo layout

```
StudyGuide/
├── studyguide-frontend/   # React 19 + Vite SPA      (port 5173) — see its README
└── studyguide-api/        # FastAPI + RAG backend    (port 8000) — see its README
```

Both READMEs are thorough; `studyguide-api/README.md` doubles as a study guide of the
backend code (similarity search, streaming, the data model). Consult them before asking.

## Stack

- **Frontend:** React 19 + Vite, React Router 7, Framer Motion, axios, lucide-react.
- **Backend:** Python 3.12, FastAPI, SQLAlchemy, LangChain.
- **LLM:** Groq free tier, `llama-3.3-70b-versatile` (streaming via SSE).
- **Embeddings:** local sentence-transformers `all-MiniLM-L6-v2` (384-dim, CPU, free).
- **Vector DB:** PostgreSQL + pgvector. Parsing: PyMuPDF + python-docx.

## Running it (Windows / PowerShell)

```powershell
# 1. Start Docker Desktop engine, then start the pgvector container (port 5433)
docker start studyguide-pg     # verify with `docker ps`; see README for first-time `docker run`

# 2. Backend
cd studyguide-api
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000   # docs at http://localhost:8000/docs

# 3. Frontend
cd studyguide-frontend
npm run dev   # http://localhost:5173
```

Frontend lint: `npm run lint`. Build: `npm run build`. There is no backend test suite.

## Non-obvious gotchas (read before debugging)

- **pgvector is Docker-only, port 5433.** Container `studyguide-pg`, image
  `pgvector/pgvector:pg17`, db `studyguide`, password `systemadmin`. Native PG17 on 5432 is
  left alone and does NOT have the `vector` extension. `init_db()` runs
  `CREATE EXTENSION IF NOT EXISTS vector` on startup. The container has no restart policy,
  so it stops when Docker Desktop restarts — `docker start studyguide-pg` each session.
  Docker Desktop's GUI has been flaky on this machine; the engine + CLI work fine.
- **Secrets live in `studyguide-api/.env`** (gitignored): `GROQ_API_KEY`, `GROQ_MODEL`,
  `DATABASE_URL` (`postgresql+psycopg://postgres:systemadmin@localhost:5433/studyguide`),
  `FRONTEND_ORIGIN`. Copy from `.env.example`.
- **HuggingFace token:** an expired cached token (`~/.cache/huggingface/token`) caused 401s
  on model download → fixed in `app/services/embeddings.py` via
  `HF_HUB_DISABLE_IMPLICIT_TOKEN=1` + `token=False`. Don't remove these.
- **React StrictMode** double-invokes setState updaters → it once double-appended streamed
  chat tokens. Fix was making the updater in `ChatPage.jsx` pure. Keep setState updaters
  side-effect-free.
- **`lucide-react` has no `Github` brand icon** — use `GitBranch`.
- First backend run downloads the MiniLM model (~90 MB) once.

## Backend architecture (`studyguide-api/app/`)

`routers/` = the doors (URLs); `services/` = the workers (logic). **Routers stay thin and
call services.** Keep that separation.

- `main.py` wires the app; `config.py` reads `.env`; `db.py` connects + creates tables;
  `models.py` = 5 tables (Document, Topic, Chunk, Flashcard, QuizQuestion) with cascade
  delete; `schemas.py` = request/response shapes.
- Services: `parsers.py` (PDF/DOCX→text), `ingest.py` (parse→chunk→embed→store, runs in a
  background task), `topics.py` (hybrid topic detection: TOC/headings → `outline`, else
  semantic segmentation + LLM labels → `ai`), `embeddings.py`, `llm.py` (Groq),
  `rag.py` (cosine similarity search + streamed chat answer), `generate.py` (summary/
  flashcards/quiz, cached via `get_or_create_*`; `generate_more_*` grows the bank).
- Every study tool is **scoped to one topic** — the whole document is never sent to the
  LLM, so it scales to large docs. Preserve this when adding features.
- Chat streams via `StreamingResponse` + SSE (`sources` first, then `token` events, then
  `done`). API endpoints are under `/api/...`.

## Frontend architecture (`studyguide-frontend/src/`)

- **Routing split:** `App.jsx` mounts the public `LandingPage` at `/` and `AppShell` at
  `/*`. `AppShell.jsx` renders `AppLayout` (sidebar) + animated routes (`/library`,
  `/doc/:docId`, `/topic/:topicId`, and the four per-topic tools). Add new app routes in
  `AppShell.jsx`; keep `/` as the standalone landing.
- `AnimatePresence` + `PageTransition` drive route transitions (keyed on pathname).
- API calls go through `services/apiService.js` over `api/axiosInstance.js`. Shared
  document state in `context/DocumentContext.jsx`. Reusable primitives in `components/ui.jsx`.
- `PaperOrbs.jsx` = decorative drifting-orb background for the editorial aesthetic.
- **Flashcards/Quiz "sets":** each generation is a numbered set (`set_index` on both models).
  "Generate new set" creates an all-new set (the LLM is told not to repeat prior items); the
  page shows one set at a time with a `SetSwitcher` (in `components/ui.jsx`) to revisit older
  sets. Shuffle/option-shuffle remap so scoring stays correct (`utils/shuffle.js`).
  Quiz supports **SATA** (select-all-that-apply): `QuizQuestion.correct_indices` is a list;
  multi-answer questions render as checkboxes and score all-or-nothing.

## Design system — "Reading Room" editorial aesthetic

Warm paper background, serif headlines (**Fraunces**) + **Inter** body, calm **teal
`#0D9488`** accents, light mode, refined Framer Motion transitions. School/medical-friendly,
deliberately distinct from BudgetTracker's amber/dark look. Match this when adding UI — do
not introduce dark-mode or off-palette colors.

## Decisions

- Vector store: Docker pgvector on 5433 (native PG17 lacks the extension on Windows).
- LLM Groq + local MiniLM embeddings — both free; the app costs nothing to run.
- Monorepo, not two repos; portfolio buttons deep-link into subfolders.
- **Deployment skipped on purpose.** A backend-heavy AI app risks burning the Groq quota +
  cold starts on a public demo. Preferred showcase: a demo video/GIF. Free path if ever
  wanted: Vercel (frontend) + Supabase/Neon (Postgres+pgvector) + HF Spaces (backend).

## Conventions

- Match surrounding style; the codebase favors small, focused files and readable comments.
- Don't commit `.env`, `venv/`, or `node_modules/`.
- Commit/push only when asked.
