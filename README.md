# FMH Gynecology Learning Assistant

A study platform for the Swiss FMH gynecology specialist exam (Facharztprüfung Gynäkologie und Geburtshilfe). The application supports three study modes — conversational Q&A, multiple-choice quiz, and spaced-repetition flashcards — all trilingual (DE/EN/FR). Answers are grounded exclusively in the official EGONE curriculum through a hybrid retrieval pipeline.

## Architecture

The core of the system is a RAG pipeline that retrieves relevant knowledge chunks before each model call, preventing the model from fabricating information outside the curriculum.

```
Query
  → Transformers.js (paraphrase-multilingual-MiniLM-L12-v2, WASM)
  → cosine similarity over 384-dim chunk embeddings        [60% weight]
  → trilingual synonym expansion + keyword match           [40% weight]
  → top-8 chunks, 12k char context window
  → system prompt injection → streaming response
```

Embedding inference runs entirely in-process via WASM — no external calls, no API cost for retrieval. The multilingual model handles queries in German, English, and French against English-language knowledge chunks without any additional translation step.

The model is instructed to respond exclusively from retrieved context. If context is absent or partial, it uses a language-appropriate fallback phrase rather than hallucinating.

## Data pipeline

```
Source PDFs
  → parse_pdfs.py (pdfplumber)      → fmh_info.json        knowledge chunks
  → generate_embeddings.ts          → embeddings.json       384-dim vectors

Exam PDFs
  → parse_quizzes.py                → quizzes.json          extracted MCQs
  → generate_quizzes.ts             → quizzes.json          expanded question set
  → generate_explanations.ts        → quizzes.json          per-question explanations
  → translate_content.ts            → quizzes.json          DE/FR translations

Knowledge chunks
  → generate_flashcards.ts          → flashcards.json       study cards
  → translate_content.ts            → flashcards.json       DE/FR translations
```

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, @tailwindcss/typography |
| AI / Streaming | Vercel AI SDK v6, @ai-sdk/anthropic |
| Embeddings | Transformers.js — local WASM, no external calls |
| Auth | SHA-256 signed HttpOnly cookie, proxy-level session gate |
| Data scripts | Node.js (tsx), Python 3 (pdfplumber) |

## Setup

```bash
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY and AUTH_PASSWORD
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The embedding model is downloaded on first request and cached locally.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `AUTH_PASSWORD` | Yes | Password for the login gate |
| `AUTH_SALT` | No | Salt for session token hashing (random string recommended) |
| `ANTHROPIC_MODEL` | No | Override the default chat model |

## Project structure

```
proxy.ts                              Session validation on all routes
app/
  login/page.tsx
  (main)/
    page.tsx                          Chat (RAG Q&A)
    quiz/page.tsx                     MCQ quiz with scoring
    flashcards/page.tsx               Flip-card study
  api/
    auth/login/route.ts
    chat/route.ts                     Hybrid retrieval + streaming endpoint
components/
  Navigation.tsx                      Header, tab nav, language switcher
lib/
  auth.ts                             Session token generation and validation
  getRelevantContext.ts               Keyword retriever with synonym expansion
  getRelevantContextSemantic.ts       Hybrid retriever (semantic + keyword)
  i18n.ts                             Translation keys (DE/EN/FR)
  LanguageContext.tsx                 Language state with localStorage persistence
data/
  fmh_info.json                       ~680 knowledge chunks from source PDFs
  embeddings.json                     Pre-computed chunk embeddings (384-dim)
  quizzes.json                        215 trilingual MCQs with answers and explanations
  flashcards.json                     Trilingual study cards
scripts/
  generate_embeddings.ts              Batch embedding generation
  generate_quizzes.ts                 MCQ generation from knowledge chunks
  generate_explanations.ts            Per-question explanation generation
  generate_flashcards.ts              Flashcard generation from knowledge chunks
  translate_content.ts                DE/FR batch translation
```

## Data regeneration

Run after modifying `fmh_info.json`:

```bash
npm run generate:embeddings
npm run generate:quizzes
npm run generate:flashcards
```

## Testing

```bash
npm test
```

Unit tests cover both retrieval strategies (keyword and hybrid semantic/keyword) with mocked data.

## License

Source material: EGONE e-learning platform (FMH Switzerland).
