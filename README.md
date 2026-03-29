# FMH Gynecology Learning Assistant

A study platform for the Swiss FMH gynecology specialist exam (Facharztprüfung Gynäkologie und Geburtshilfe), built around the official EGONE training material. Supports three study modes: chat, quiz, and flashcards in German, English, and French.

## Features

- **Chat:** Ask questions in any language and get answers grounded exclusively in the EGONE source PDFs, with source references.
- **Quiz:** Multiple-choice questions extracted from official exam PDFs, organized by category, with explanations.
- **Flashcards:** Flip-card study interface with progress tracking across all categories.
- **Trilingual:** Full DE/EN/FR support, interface, questions, answers, and explanations.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript 5
- Tailwind CSS 4
- Vercel AI SDK v6
- Transformers.js (local embeddings: `paraphrase-multilingual-MiniLM-L12-v2`)
- Python 3 + pdfplumber (data pipeline)

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in ANTHROPIC_API_KEY and AUTH_PASSWORD
npm run dev
```

## Authentication

All routes are protected by a shared password. Set `AUTH_PASSWORD` in `.env.local`.

## Project Structure

```
proxy.ts                        Route protection
app/
  login/page.tsx
  (main)/
    page.tsx                    Chat interface
    quiz/page.tsx               Quiz mode
    flashcards/page.tsx         Flashcard study
  api/
    auth/login/route.ts
    chat/route.ts               Streaming RAG endpoint
components/
  Navigation.tsx
lib/
  auth.ts
  getRelevantContext.ts         Keyword retriever
  getRelevantContextSemantic.ts Hybrid retriever (semantic + keyword)
  i18n.ts                       Translations (DE/EN/FR)
  LanguageContext.tsx
data/
  fmh_info.json                 Knowledge base
  embeddings.json               Pre-computed embeddings (384-dim)
  quizzes.json                  MCQ questions with answers and explanations
  flashcards.json               Study cards
scripts/
  parse_pdfs.py                 PDF extraction → fmh_info.json
  parse_quizzes.py              Quiz PDF parser
  generate_embeddings.ts        Embedding generation
  generate_quizzes.ts           Quiz question generation
  generate_flashcards.ts        Flashcard generation
  generate_explanations.ts      Explanation generation for existing questions
  translate_content.ts          DE/FR translation
```

## RAG Architecture

The chat endpoint uses hybrid retrieval:

- **Semantic (60%):** Query embedded locally with Transformers.js, compared against pre-computed chunk embeddings via cosine similarity.
- **Keyword (40%):** Query tokens expanded through a trilingual medical synonym dictionary, scored against chunk metadata.

Results are merged, deduplicated, and capped at 8 chunks / 12,000 characters before being injected into the system prompt. The model is instructed to answer only from retrieved context.

## Data Regeneration

```bash
npm run generate:embeddings     # After updating fmh_info.json
npm run generate:quizzes        # Generate additional quiz questions
npm run generate:flashcards     # Regenerate flashcards
```

## License

Study material sourced from the EGONE e-learning platform (FMH Switzerland).
