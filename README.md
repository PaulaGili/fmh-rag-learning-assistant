# FMH Gynecology Learning Assistant

Study platform for the Swiss FMH gynecology specialist exam (Facharztprüfung Gynäkologie und Geburtshilfe), built on top of the official EGONE training material. Three study modes, chat, quiz, and flashcards, in German, English, and French.

The chat answers questions grounded exclusively in the EGONE PDFs with clickable source references. The quiz parses multiple-choice questions directly from the official exam PDFs, organized by topic. Flashcards give a flip-card review interface with per-category progress tracking. Everything runs in DE/EN/FR including questions, answers, and explanations.

## Tech stack

Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Vercel AI SDK

Backend: Python 3.11+, FastAPI, sentence-transformers (paraphrase-multilingual-MiniLM-L12-v2), rank-bm25, Anthropic SDK

## Setup

### Frontend

```bash
npm install
cp .env.example .env.local
# fill in ANTHROPIC_API_KEY, AUTH_PASSWORD, AUTH_SALT, and BACKEND_URL
npm run dev
```

### Backend

```bash
pip install -r backend/requirements.txt
cd backend && uvicorn main:app --reload
```

Runs on `http://localhost:8000`.

### Data pipeline

Run once after cloning (requires the source PDFs in `public/docs/`):

```bash
pip install -r scripts/requirements.txt
make pipeline
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `AUTH_PASSWORD` | Yes | Shared access password |
| `AUTH_SALT` | Yes | Salt for session token. Generate with: `openssl rand -hex 32` |
| `BACKEND_URL` | No | Defaults to `http://localhost:8000` |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-haiku-4-5-20251001` |
| `FRONTEND_URL` | Backend only | Allowed CORS origin |

## Authentication

Single shared password for all routes. Set `AUTH_PASSWORD` and `AUTH_SALT` in `.env.local`. Sessions last 7 days (PBKDF2/SHA-256 via Web Crypto API, compatible with Next.js Edge Runtime).

## Project structure

```
middleware.ts               Route protection
Makefile                    Dev and pipeline shortcuts
app/
  login/page.tsx
  (main)/
    page.tsx                Chat
    quiz/page.tsx
    flashcards/page.tsx
  api/
    auth/login/route.ts
    chat/route.ts           Proxy to backend
backend/
  main.py                   FastAPI — streaming chat, rate limiting
  rag.py                    Hybrid retrieval (semantic + BM25)
  test_main.py
  test_rag.py
  requirements.txt
  requirements-dev.txt
  Dockerfile
components/
  Navigation.tsx
lib/
  auth.ts
  i18n.ts
  LanguageContext.tsx
  utils.ts
tests/
  auth.test.ts
data/                       Generated — run `make pipeline` to build
scripts/
  01_parse_pdfs.py
  02_parse_quizzes.py
  03_generate_embeddings.py
  04_generate_quizzes.py
  05_generate_flashcards.py
  06_generate_explanations.py
  07_translate_content.py
  eval_rag.py
  requirements.txt
```

## How the RAG works

Each chat request goes through hybrid retrieval before calling the model.

Non-English queries are first translated to English keyword phrases. The corpus is in English, so this helps BM25 match exact medical terms like FIGO staging or TNM that would otherwise miss cross-lingually.

Retrieval combines two signals with an 85/15 weighting. Semantic search embeds the query with MiniLM-L12-v2 and scores it against pre-computed chunk embeddings via cosine similarity — a top-5 floor guarantees results even for low-similarity queries. BM25 adds a tokenized keyword match over the corpus, normalized and down-weighted so it doesn't override semantic ranking for non-English input.

The top-ranked chunks are taken up to 20 results / 32k characters and injected into the system prompt. The model is instructed to answer only from the retrieved context with no inference beyond what's written. If the context doesn't cover the question, it returns a fixed fallback phrase in the user's language.

`eval_rag.py` runs 20 queries across DE/EN/FR and reports precision@5. Current score: 80% (16/20). The main gaps are a few German/French queries for breast cancer classification and endometrial risk factors.

## Data pipeline

```bash
python scripts/01_parse_pdfs.py           # PDF text → fmh_info.json
python scripts/02_parse_quizzes.py        # quiz PDFs → quizzes.json
python scripts/03_generate_embeddings.py  # chunk embeddings → embeddings.npy
python scripts/04_generate_quizzes.py     # generate additional quiz questions
python scripts/05_generate_flashcards.py  # flashcard generation
python scripts/06_generate_explanations.py  # quiz explanations
python scripts/07_translate_content.py    # DE/FR translations

python scripts/eval_rag.py                # check retrieval quality
```

Or just `make pipeline`.

## Tests

```bash
make test-backend   # pytest (23 tests)
make test-frontend  # vitest (7 tests)
make test           # both
```

## Deployment

### Backend → Hugging Face Spaces

1. Go to huggingface.co/new-space, choose **Docker** as the SDK, and create the Space.

2. In the Space settings, add two secrets:
   - `ANTHROPIC_API_KEY` — your Anthropic key
   - `FRONTEND_URL` — your Vercel app URL (e.g. `https://yourapp.vercel.app`)

3. Add HF as a git remote and push:

```bash
git remote add hf https://huggingface.co/spaces/<your-username>/<your-space-name>
git push hf main
```

HF picks up the `backend/Dockerfile` automatically and starts the build. The first build takes around 5 minutes because it downloads the sentence-transformers model. Once it's done, your backend URL will be `https://<your-username>-<your-space-name>.hf.space` — that's the value you'll put in `BACKEND_URL` on Vercel.

You can check if the backend is ready by hitting `/health`:

```bash
curl https://<your-username>-<your-space-name>.hf.space/health
# {"status": "ok"}
```

To redeploy after code changes, just push again: `git push hf main`.

### Frontend → Vercel

1. Import the GitHub repo at vercel.com/new.

2. In the project settings, add four environment variables:
   - `ANTHROPIC_API_KEY`
   - `AUTH_PASSWORD`
   - `AUTH_SALT`
   - `BACKEND_URL` — the HF Space URL from above

Vercel redeploys automatically on every push to `main`.

## License

Study material sourced from the EGONE e-learning platform (FMH Switzerland).
