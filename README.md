# FMH Gynecology Learning Assistant

RAG-based learning platform for the Swiss FMH gynecology specialist examination (Facharztprufung Gynakologie und Geburtshilfe). Three study modes -- chat, quiz, flashcards -- with all answers grounded in verified EGONE training material via retrieval-augmented generation.

## What Was Built

Full-stack RAG application that transforms static EGONE PDF content into three interactive learning modes.

- **Data pipeline:** Python extraction and chunking of source PDFs into a structured knowledge base. Separate pipeline for parsing exam PDFs into multiple-choice questions.
- **RAG chat:** Hybrid retrieval (semantic embeddings + keyword expansion with trilingual medical synonym dictionary) feeds relevant chunks into the LLM system prompt. The model is constrained to answer only from retrieved context.
- **Content generation:** LLM-generated quiz questions and flashcards from the knowledge chunks, automatically translated into DE/EN/FR.
- **Trilingual UI:** All interface strings, quiz content, and flashcards available in German, English, and French with runtime switching.
- **Auth:** Middleware-based password gate with signed session cookies (HttpOnly, Secure, SameSite) protecting all routes and API endpoints.

## Overview

| Mode | Description | Data |
|------|-------------|------|
| Chat | Free-form Q&A with source-cited answers | Knowledge chunks from source PDFs |
| Quiz | Multiple-choice questions with scoring and explanations | Multiple categories |
| Flashcards | Flip-card study interface with progress tracking | Multiple categories |

All content available in German, English, and French.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS 4, Typography plugin |
| RAG (Retrieval-Augmented Generation) | Vercel AI SDK v6, hybrid retrieval (semantic + keyword) |
| Embeddings | Transformers.js (paraphrase-multilingual-MiniLM-L12-v2, local) |
| Language | TypeScript 5 |
| Data Processing | Python 3, pdfplumber |

## Setup

```bash
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

## Authentication

The app is protected by a shared password gate. Set `AUTH_PASSWORD` in `.env.local`. All routes and API endpoints require a valid session.

## Project Structure

```
middleware.ts                         Route protection
app/
  login/page.tsx                      Login page
  (main)/
    page.tsx                          Chat interface
    quiz/page.tsx                     Quiz mode
    flashcards/page.tsx               Flashcard study mode
  api/
    auth/login/route.ts               Authentication endpoint
    chat/route.ts                     Streaming chat endpoint
components/
  Navigation.tsx                      Header, navigation tabs, language switcher
lib/
  auth.ts                             Session token utilities
  getRelevantContext.ts               Keyword-based retriever (synonym expansion)
  getRelevantContextSemantic.ts       Hybrid retriever (semantic + keyword)
  i18n.ts                             Translation system (DE/EN/FR)
  LanguageContext.tsx                  Language state provider
data/
  fmh_info.json                       Knowledge base (chunks from source PDFs)
  embeddings.json                     Pre-computed sentence embeddings (384 dims)
  quizzes.json                        Trilingual MCQ with answers
  flashcards.json                     Trilingual study cards
scripts/
  parse_pdfs.py                       PDF content extraction pipeline
  parse_quizzes.py                    Quiz PDF parser
  generate_embeddings.ts              Embedding generation (local model)
  generate_quizzes_llm.ts             Quiz question generation
  generate_flashcards_llm.ts          Flashcard generation
  translate_content.ts                Content translation (DE/FR)
```

## RAG Architecture

The chat mode implements a Retrieval-Augmented Generation (RAG) pipeline. Answers are grounded exclusively in the EGONE source material — the LLM receives only retrieved context and a strict system prompt that prevents fabrication.

### Hybrid Retrieval

Two retrieval strategies run in parallel and their scores are merged:

**Semantic path (60% weight):** Query embedded with `paraphrase-multilingual-MiniLM-L12-v2` (local, via Transformers.js), compared against pre-computed chunk embeddings via cosine similarity. Handles cross-language matching and paraphrases.

**Keyword path (40% weight):** Query tokens expanded through a trilingual medical synonym dictionary (100+ DE/FR/EN term mappings). Chunks scored by keyword, topic, and content overlap.

Results are deduplicated and capped at 8 chunks / 12,000 characters before injection into the system prompt.

## Data Pipeline

```
Source PDFs
  -> parse_pdfs.py -> fmh_info.json (knowledge chunks)
  -> generate_embeddings.ts -> embeddings.json (384-dim vectors)

Exam PDFs
  -> parse_quizzes.py -> quizzes.json (extracted questions)
  -> generate_quizzes_llm.ts -> quizzes.json (expanded with LLM)
  -> translate_content.ts -> quizzes.json (trilingual)

Knowledge chunks
  -> generate_flashcards_llm.ts -> flashcards.json (generated cards)
  -> translate_content.ts -> flashcards.json (trilingual)
```

## Data Regeneration

```bash
npm run generate:embeddings     # Recompute embeddings after knowledge base changes
npm run generate:quizzes        # Regenerate quiz questions
npm run generate:flashcards     # Regenerate flashcards
```

## License

Study material sourced from the EGONE e-learning platform (FMH Switzerland).
