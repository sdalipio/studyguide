# StudyGuide Frontend (`studyguide-frontend`)

The React + Vite single-page app for StudyGuide. It talks to the
[`studyguide-api`](../studyguide-api) backend over HTTP.

---

## 1. Tech stack

| Tool | Role |
|---|---|
| **React 19 + Vite** | UI library + fast dev server / build |
| **React Router** | Client-side routing between pages |
| **Framer Motion** | Animations (page transitions, 3D flip, staggers) |
| **Axios** | HTTP client for the API |
| **lucide-react** | Icons |

State is plain React (`useState` + one Context); no Redux.

---

## 2. Design system — "Reading Room"

An editorial, school/medical-friendly look in **light mode** (deliberately distinct from
the BudgetTracker portfolio app):

- Warm off-white "paper" background, calming **teal** accents (`#0D9488`)
- **Serif** display font (Fraunces) for headings + **Inter** for body/UI
- Thin rules, chapter-style topic lists, refined motion

All colors/fonts are **CSS custom properties** defined in `src/index.css` and used via
`var(--token)` in inline styles (e.g. `var(--primary)`, `var(--bg-app)`, `var(--serif)`).
Reusable keyframes (`fadeUp`, `shimmer`, `spin`, `blink`) live there too.

---

## 3. Folder structure

```
src/
├── api/axiosInstance.js       # Axios configured with VITE_API_URL
├── services/apiService.js     # ALL API calls live here (single source of truth)
├── context/DocumentContext.jsx# document list + refresh, shared app-wide
├── components/
│   ├── layout/AppLayout.jsx   # sidebar shell (brand, Library, recent docs)
│   ├── PageTransition.jsx     # the per-route fade/slide
│   └── ui.jsx                 # Button, Card, PageTitle, BackLink, SkeletonLines
├── utils/shuffle.js           # Fisher–Yates shuffle (flashcards/quiz)
├── pages/                     # one file per route
│   ├── LibraryPage.jsx        # upload dropzone + document grid
│   ├── OutlinePage.jsx        # the document's topic outline
│   ├── TopicHubPage.jsx       # pick a study tool for a topic
│   ├── ChatPage.jsx           # streaming RAG chat with citations
│   ├── SummaryPage.jsx        # AI summary
│   ├── FlashcardsPage.jsx     # 3D flip cards + shuffle / generate more
│   └── QuizPage.jsx           # scored MCQ + shuffle / generate more
├── App.jsx                    # routes
└── main.jsx                   # entry; wraps Router + DocumentProvider
```

**Convention:** every network call goes through `services/apiService.js` — components
never call Axios directly. This keeps the API surface in one place.

---

## 4. User flow

```
Library (upload PDF/Word)
   -> Outline (pick a topic)
      -> Topic Hub (pick a tool)
         -> Chat | Summary | Flashcards | Quiz   (all scoped to that topic)
```

Routes: `/` · `/doc/:docId` · `/topic/:topicId` · `/topic/:topicId/{chat,summary,flashcards,quiz}`.

---

## 5. Notable features

- **Streaming chat** (`ChatPage`): reads the backend's Server-Sent Events with
  `fetch` + a `ReadableStream`, appending tokens as they arrive, with citation chips.
  State updates are pure (copy, don't mutate) so React StrictMode can't double-append.
- **3D flashcards** (`FlashcardsPage`): a Framer Motion `rotateY` spring flip;
  **Shuffle** reorders instantly (free), **Generate more** asks the backend for new cards.
- **Quiz** (`QuizPage`): draws a shuffled round of 5 from a growing question bank, with
  each question's options shuffled (and remapped so server scoring stays correct);
  animated, count-up score; **New mix** (free) and **Generate more** (LLM).

---

## 6. Setup & running

**Prerequisite:** the backend running at `http://localhost:8000` (see
[`../studyguide-api`](../studyguide-api)).

```bash
cd studyguide-frontend
npm install
copy .env.example .env      # optional; defaults to http://localhost:8000
npm run dev                 # http://localhost:5173
```

**Environment variable** (`.env`):
```
VITE_API_URL=http://localhost:8000
```

**Scripts:**
```bash
npm run dev       # dev server with hot reload
npm run build     # production build -> dist/
npm run preview   # preview the production build
npm run lint      # ESLint
```
