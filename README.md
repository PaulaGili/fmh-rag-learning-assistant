# FMH Gynecology Learning Assistant

Interactive learning platform for the Swiss FMH gynecology specialist examination (Facharztprufung Gynakologie und Geburtshilfe). Three study modes -- chat, quiz, flashcards -- grounded in verified training material from the EGONE platform.

## Overview

| Mode | Description | Data |
|------|-------------|------|
| Chat | Free-form Q&A with source-cited answers | 682 knowledge chunks |
| Quiz | Multiple-choice questions with scoring and explanations | 260 questions, 18 categories |
| Flashcards | Flip-card study interface with progress tracking | 450 cards, 18 categories |

All content available in German, English, and French.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS 4, Typography plugin |
| LLM Integration | Vercel AI SDK v6, Anthropic API |
| Embeddings | Transformers.js (paraphrase-multilingual-MiniLM-L12-v2, local) |
| Language | TypeScript 5 |
| Data Processing | Python 3, pdfplumber |

## Setup

```bash
npm install
```

Create `.env.local`:

```
ANTHROPIC_API_KEY=your_key_here
```

```bash
npm run dev
```

## Project Structure

```
app/
  api/chat/route.ts                 Streaming chat endpoint
  page.tsx                          Chat interface
  quiz/page.tsx                     Quiz mode
  flashcards/page.tsx               Flashcard study mode
components/
  Navigation.tsx                    Header, navigation tabs, language switcher
lib/
  getRelevantContext.ts             Keyword-based retriever (synonym expansion)
  getRelevantContextSemantic.ts     Hybrid retriever (semantic + keyword)
  i18n.ts                           Translation system (DE/EN/FR)
  LanguageContext.tsx                Language state provider
data/
  fmh_info.json                     Knowledge base (682 chunks from 48 PDFs)
  embeddings.json                   Pre-computed sentence embeddings (384 dims)
  quizzes.json                      260 trilingual MCQ with answers
  flashcards.json                   450 trilingual study cards
scripts/
  parse_pdfs.py                     PDF content extraction pipeline
  parse_quizzes.py                  Quiz PDF parser
  generate_embeddings.ts            Embedding generation (local model)
  generate_quizzes_llm.ts           Quiz question generation
  generate_flashcards_llm.ts        Flashcard generation
  translate_content.ts              Content translation (DE/FR)
```

## Retrieval Architecture

The system uses a hybrid retrieval pipeline that merges two complementary strategies:

**Semantic path (60% weight):** Queries are embedded with a multilingual sentence transformer and compared against pre-computed chunk embeddings via cosine similarity. Handles cross-language matching without explicit synonym mappings.

**Keyword path (40% weight):** Query tokens are expanded through a curated trilingual medical synonym dictionary (100+ terms). Chunks scored by keyword, topic, and content overlap. Catches exact terminology that embedding models may miss.

Top results are merged, deduplicated, and capped at 8 chunks / 12,000 characters before injection into the LLM system prompt.

## Data Pipeline

```
PDFs (48 documents, 18 categories)
  -> parse_pdfs.py -> fmh_info.json (682 chunks)
  -> generate_embeddings.ts -> embeddings.json (384-dim vectors)

Quiz PDFs (64 documents)
  -> parse_quizzes.py -> quizzes.json (82 extracted)
  -> generate_quizzes_llm.ts -> quizzes.json (260 total)
  -> translate_content.ts -> quizzes.json (trilingual)

Knowledge chunks
  -> generate_flashcards_llm.ts -> flashcards.json (450 cards)
  -> translate_content.ts -> flashcards.json (trilingual)
```

## Data Regeneration

```bash
npm run generate:embeddings     # Recompute embeddings after knowledge base changes
npm run generate:quizzes        # Regenerate quiz questions
npm run generate:flashcards     # Regenerate flashcards
```

## License

Developed for the HSLU Generative AI module, Spring 2026. Study material sourced from the EGONE e-learning platform (FMH Switzerland).
