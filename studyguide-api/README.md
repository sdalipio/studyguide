# StudyGuide Backend (`studyguide-api`)

The FastAPI + RAG backend for StudyGuide. This README doubles as a **study guide** —
read it top to bottom to understand how the code works.

---

## 1. What the backend does

It's an API the React frontend talks to. It:

1. Accepts an uploaded **PDF or Word** file.
2. Reads the text, splits it into **topics**, and breaks each topic into small **chunks**.
3. Turns every chunk into an **embedding** (a list of numbers capturing meaning) and
   stores it in **PostgreSQL + pgvector**.
4. Answers questions about a topic by finding the most relevant chunks
   (**similarity search**) and asking an LLM (**Groq**) to answer using only those chunks.
   This pattern is **RAG** (Retrieval-Augmented Generation).
5. Generates **summaries, flashcards, and quizzes** per topic.

---

## 2. Tech stack

| Tool | Role |
|---|---|
| **FastAPI** | Web framework — defines the API endpoints |
| **SQLAlchemy** | Talks to the database using Python objects instead of raw SQL |
| **PostgreSQL + pgvector** | Stores data *and* embedding vectors; runs the similarity search |
| **sentence-transformers** (MiniLM) | Turns text into 384-number embeddings, locally & free |
| **Groq** (via LangChain) | The LLM that writes answers, summaries, flashcards, quizzes |
| **PyMuPDF / python-docx** | Extract text from PDF / Word files |

---

## 3. Folder structure

```
studyguide-api/
└── app/
    ├── main.py          # creates the FastAPI app, wires everything together
    ├── config.py        # settings (API keys, DB URL, chunk sizes) from .env
    ├── db.py            # database connection + table creation
    ├── models.py        # the 5 database tables, as Python classes
    ├── schemas.py       # shapes of request/response JSON (validation)
    ├── routers/         # the API endpoints, grouped by feature
    │   ├── documents.py     # upload, list, delete, list-topics
    │   ├── topics.py        # get one topic's info
    │   ├── chat.py          # streaming Q&A
    │   ├── summary.py       # topic summary
    │   ├── flashcards.py    # flashcards (+ generate more)
    │   └── quiz.py          # quiz (+ generate more, + scoring)
    └── services/        # the actual logic (the "brains")
        ├── parsers.py       # PDF/Word -> unified text
        ├── ingest.py        # upload pipeline: parse -> chunk -> embed -> store
        ├── topics.py        # split a document into topics
        ├── embeddings.py    # text -> vectors (MiniLM)
        ├── llm.py           # talk to Groq
        ├── rag.py           # similarity search + chat answer
        └── generate.py      # summaries, flashcards, quizzes
```

**Mental model:** `routers/` = the doors (which URLs exist). `services/` = the workers
(what actually happens). Routers stay thin and call services.

---

## 4. How a request flows

```
Browser ──HTTP──> router (e.g. chat.py) ──> service (e.g. rag.py) ──> DB / LLM
                       ▲                                                 │
                       └──────────────── response ◀──────────────────────┘
```

Each router function receives an open database session via `Depends(get_db)` (FastAPI's
dependency injection — it hands you the session and closes it afterward).

---

## 5. The database (`models.py`)

Five tables. Each class is a table; each attribute is a column.

- **Document** — one uploaded file. `title`, `source_type` (`pdf`/`docx`),
  `status` (`processing`/`ready`/`error`), `topic_method` (`outline`/`ai`), and
  `progress` (0–100) + `stage` (a short label) that the ingest pipeline updates so the UI
  can show a live progress bar.
- **Topic** — a studyable section of a document.
- **Chunk** — a small passage. Holds `content`, `location` (`"p. 33"` / `"§ Heading"`,
  used for citations), and `embedding` — a **`Vector(384)`** used for similarity search.
- **Flashcard** — a question/answer pair for a topic.
- **QuizQuestion** — `question`, `options`, `correct_indices` (0-based; one index for a
  normal question, two+ for a "select all that apply" question), `explanation`.

Relationships use **cascade delete**: delete a Document and its Topics/Chunks/Flashcards/
QuizQuestions go with it. Tables are created on startup by `init_db()` in `db.py`, which
also runs `CREATE EXTENSION IF NOT EXISTS vector`.

---

## 6. The upload pipeline (`ingest.py`)

On upload, `documents.py` saves a `Document` (status `processing`) and returns
immediately, then runs `process_document` in the **background**:

```
parse the file (parsers.py)            -> progress 5%  "Reading document"
  -> detect topics (topics.py)          -> progress 15% "Organizing topics"
     -> for each topic:
          split text into ~800-token chunks (with overlap)
          embed in batches (embeddings.py), advancing 15% -> 95%  "Embedding passages"
          save chunks + vectors to the DB
  -> mark the document "ready"           -> progress 100%
```

**Chunking** cuts text into bite-sized pieces (~800 tokens, ~120 overlap so sentences
split across a boundary aren't lost). As it runs, `process_document` updates the
document's `progress`/`stage` (committing each step) so the UI shows a live bar. The
frontend polls `GET /api/documents/{id}` until `status` is `ready`.

---

## 7. Topic detection (`topics.py`) — hybrid

```
Has a real table of contents / headings?
 ├── YES -> use them              (topic_method = "outline")  — free, instant
 └── NO  -> semantic segmentation (topic_method = "ai")
```

- **Outline:** PDFs expose a TOC (PyMuPDF); Word docs have Heading styles.
- **AI:** with no structure, we embed each segment and compare consecutive segments.
  Where similarity **drops**, the subject changed — a topic boundary. The LLM then names
  each section. Topics stay in reading order (contiguous), which is easy to navigate.

---

## 8. Embeddings (`embeddings.py`)

```python
def embed_query(text):
    return embed_texts([text])[0]   # -> [0.013, -0.21, ...] 384 numbers
```

`all-MiniLM-L6-v2` is trained so **similar meaning → similar numbers**. Picture each
passage as a dot on a "meaning map"; the 384 numbers are its coordinates. We normalize
vectors to length 1 for clean, fast comparison. Runs locally on CPU (free); loaded once
and cached.

> Note: we set `HF_HUB_DISABLE_IMPLICIT_TOKEN` + `token=False` so the public model
> downloads anonymously even if an (expired) HuggingFace token is cached on the machine.

---

## 9. Similarity search + chat (`rag.py`) — the heart of RAG

```python
def retrieve(db, topic_id, question, k=5):
    qvec = embeddings.embed_query(question)               # 1. question -> vector
    stmt = (
        select(Chunk)
        .where(Chunk.topic_id == topic_id)                # 2. only this topic
        .order_by(Chunk.embedding.cosine_distance(qvec))  # 3. nearest meaning first
        .limit(k)                                         # 4. keep the 5 closest
    )
    return list(db.scalars(stmt).all())
```

**Cosine distance** compares the *angle* between two vectors (arrows). Same direction =
same meaning = small distance. pgvector runs this in SQL via the `<=>` operator:

```sql
SELECT * FROM chunks
WHERE topic_id = 2
ORDER BY embedding <=> '[0.013, -0.21, ...]'   -- the question's vector
LIMIT 5;
```

That single query *is* the similarity search (and the reason we need pgvector — plain
Postgres can't do `<=>`). Then `answer_sse` builds a context block from the 5 chunks and
tells the LLM (via `SYSTEM_PROMPT`) to answer **only** from that context and to **cite**
each chunk's `location`. The answer is **streamed** back (see §11).

One line:
```
question -> embed -> 5 nearest chunks (this topic) -> LLM -> streamed, cited answer
```

---

## 10. Summaries, flashcards, quizzes (`generate.py`)

Same recipe for all three:
```
gather the topic's chunk text -> ask the LLM (structured JSON) -> save to DB (cache)
```

- **Caching:** `get_or_create_*` returns saved rows if they exist — revisiting a topic
  is instant and free.
- **Sets / "Generate new set":** each generation is a numbered **set** (`set_index`,
  1-based). `generate_more_*` makes a *new* set of all-new items — it passes every existing
  question to the LLM with "don't repeat these" at a higher temperature for variety, and
  stamps the new rows with the next set number. The frontend shows one set at a time with a
  switcher to revisit earlier sets for review.
- **Quiz scoring** (`POST /quiz/score`): the frontend sends `{question_id: [chosen_index, ...]}`;
  the server marks a question correct only if the chosen set exactly matches the stored
  `correct_indices` (all-or-nothing, so "select all that apply" works), and returns the
  score for that round.

---

## 11. Streaming (`chat.py` + `rag.py`)

Chat uses `StreamingResponse` with **Server-Sent Events** — the server yields pieces as
the LLM produces them:

```
data: {"type": "sources", "sources": [...]}   <- citations, sent first
data: {"type": "token", "text": "The"}        <- one piece of the answer
data: {"type": "token", "text": " Calvin"}
...
data: {"type": "done"}
```

The frontend reads these as they arrive, so text appears word-by-word like ChatGPT.

---

## 12. Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/documents` | Upload a PDF/DOCX (starts background processing) |
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/{id}` | One document (poll for `status`) |
| GET | `/api/documents/{id}/topics` | The topic outline |
| DELETE | `/api/documents/{id}` | Delete a document and everything under it |
| GET | `/api/topics/{id}` | One topic's info |
| POST | `/api/topics/{id}/chat` | **Streaming** Q&A |
| GET | `/api/topics/{id}/summary` | Summary (cached) |
| GET | `/api/topics/{id}/flashcards` | Flashcards (cached) |
| POST | `/api/topics/{id}/flashcards/more` | Add new flashcards |
| GET | `/api/topics/{id}/quiz` | Quiz questions (cached) |
| POST | `/api/topics/{id}/quiz/more` | Add new quiz questions |
| POST | `/api/topics/{id}/quiz/score` | Score submitted answers |
| GET | `/api/health` | Is the API up? Is Groq configured? |

Interactive docs auto-generate at **http://localhost:8000/docs**.

---

## 13. Setup & running

**Prerequisites:** Python 3.12+, Docker Desktop, a free Groq key
(https://console.groq.com/keys).

```bash
# 1. Database (PostgreSQL + pgvector via Docker, port 5433)
docker run -d --name studyguide-pg \
  -e POSTGRES_PASSWORD=systemadmin -e POSTGRES_DB=studyguide \
  -p 5433:5432 -v studyguide_pgdata:/var/lib/postgresql/data \
  pgvector/pgvector:pg17
# (already created? just: docker start studyguide-pg)

# 2. Backend
cd studyguide-api
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env         # then set GROQ_API_KEY in .env
uvicorn app.main:app --reload --port 8000
```

**Environment variables** (`.env`):
```
GROQ_API_KEY=<your free Groq key>
GROQ_MODEL=llama-3.3-70b-versatile
DATABASE_URL=postgresql+psycopg://postgres:systemadmin@localhost:5433/studyguide
FRONTEND_ORIGIN=http://localhost:5173
```

The first run downloads the MiniLM model (~90 MB) once.

**Inspect the data:**
```bash
docker exec -it studyguide-pg psql -U postgres -d studyguide
#   \dt                          list tables
#   SELECT id, title FROM topics;
```

---

## 14. Glossary

- **Embedding / vector** — numbers representing the *meaning* of text.
- **Cosine similarity/distance** — how closely two vectors point; basis of search.
- **Chunk** — a small passage we embed and store.
- **RAG** — retrieve relevant chunks, then let the LLM generate from them.
- **pgvector** — the PostgreSQL add-on that stores vectors and runs `<=>` searches.
- **Token** — a small piece of text the LLM streams one at a time.
- **SSE (Server-Sent Events)** — a way for the server to push a stream of updates.
- **Dependency injection** — FastAPI handing your function ready-made things (like a DB session) via `Depends(...)`.
