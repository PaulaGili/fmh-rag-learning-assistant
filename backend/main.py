import asyncio
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import quote

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from rag import get_context, is_ready, load_resources

load_dotenv(Path(__file__).parent.parent / ".env.local")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("fmh")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")

RATE_LIMIT = 20
RATE_WINDOW = 60
_rate_map: dict[str, tuple[int, float]] = {}

LANG_CONFIG = {
    "de": {
        "intro": "Du bist ein Lernassistent für die gynäkologische Facharztprüfung (FMH) in der Schweiz. Antworte auf Deutsch; lateinische Fachterminologie ist erlaubt.",
        "fallback": "Dazu liegen mir keine gesicherten Informationen vor.",
        "partial": "⚠️ Unsicher: Zu THEMA liegen mir keine gesicherten Informationen vor.",
        "sources": "Quellen",
    },
    "en": {
        "intro": "You are a learning assistant for the FMH gynecology exam in Switzerland. Answer in English.",
        "fallback": "I don't have verified information on this topic.",
        "partial": "⚠️ Uncertain: I don't have verified information on TOPIC.",
        "sources": "Sources",
    },
    "fr": {
        "intro": "Tu es un assistant d'apprentissage pour l'examen FMH en gynécologie en Suisse. Réponds en français.",
        "fallback": "Je ne dispose pas d'informations vérifiées à ce sujet.",
        "partial": "⚠️ Incertain: Je ne dispose pas d'informations vérifiées sur SUJET.",
        "sources": "Sources",
    },
}


class MessagePart(BaseModel):
    type: str
    text: str = ""


class Message(BaseModel):
    role: str
    parts: list[MessagePart] = []


class ChatRequest(BaseModel):
    messages: list[Message]
    language: str = Field(default="de", pattern="^(de|en|fr)$")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise RuntimeError("ANTHROPIC_API_KEY is not set")
    log.info("loading RAG resources...")
    t0 = time.time()
    await asyncio.to_thread(load_resources)
    log.info("ready in %.1fs", time.time() - t0)
    yield


app = FastAPI(lifespan=lifespan)
client = anthropic.AsyncAnthropic()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
async def health():
    if not is_ready():
        return JSONResponse({"status": "loading"}, status_code=503)
    return JSONResponse({"status": "ok"})


def check_rate_limit(ip: str) -> bool:
    now = time.time()
    expired = [k for k, (_, reset_at) in _rate_map.items() if now > reset_at]
    for k in expired:
        del _rate_map[k]
    count, reset_at = _rate_map.get(ip, (0, now + RATE_WINDOW))
    if now > reset_at:
        _rate_map[ip] = (1, now + RATE_WINDOW)
        return True
    if count >= RATE_LIMIT:
        return False
    _rate_map[ip] = (count + 1, reset_at)
    return True


def _doc_label(entry: dict) -> str:
    return entry["source"].split("/")[-1].replace(".pdf", "").replace("_", " ")


def build_system_prompt(language: str, context_entries: list) -> str:
    cfg = LANG_CONFIG.get(language, LANG_CONFIG["de"])

    if context_entries:
        context_block = "\n\n---\n\n".join(
            f"[doc: {_doc_label(e)} | href: {quote(e['source'], safe='/')}]\n{e['content']}"
            for e in context_entries
        )
    else:
        context_block = "No relevant context found."

    return f"""{cfg['intro']}

Your answers must be grounded exclusively in the text passages provided below.
Only state what is explicitly written in those passages.
Do not add, complete, infer, or extrapolate — even if you know the answer from your training.
If a fact, classification, number, or detail is not present in the context, it does not exist for you.
Respond only in the language of this prompt — do not mix languages.

At the end of your answer, always add a sources section. Use angle brackets around the URL to handle special characters in file paths:

---
**{cfg['sources']}:**
- [Document name 1](</docs/path/to/file.pdf>)
- [Document name 2](</docs/path/to/file.pdf>)

Use the [doc: ...] field as the link text and the [href: ...] field as the URL (inside angle brackets). Deduplicate — list each document once.

Choose exactly one of the following:
1. If the context explicitly covers the question: answer using only what is written there.
2. If the context covers part of the question but is missing details: answer what is explicitly covered, then append the partial marker once for what is missing.
3. If the context does not cover the question: your entire response must be exactly the fallback phrase and nothing else. No explanation. No sources. No extra sentences. Example of a correct fallback response:
"{cfg['fallback']}"

Fallback phrase: "{cfg['fallback']}"
Partial answer marker: {cfg['partial']}

--- CONTEXT ---

{context_block}

--- END CONTEXT ---"""


def extract_query(messages: list) -> str:
    for msg in reversed(messages):
        if msg.get("role") == "user":
            return " ".join(
                p.get("text", "") for p in msg.get("parts", []) if p.get("type") == "text"
            )
    return ""


def to_anthropic_messages(messages: list) -> list:
    result = []
    for msg in messages:
        role = msg.get("role")
        if role not in ("user", "assistant"):
            continue
        text = " ".join(
            p.get("text", "") for p in msg.get("parts", []) if p.get("type") == "text"
        )
        if text:
            result.append({"role": role, "content": text})
    return result


async def _translate_for_retrieval(query: str, language: str) -> str:
    # corpus is English, so we translate non-English queries before retrieval
    if language == "en" or not query.strip():
        return query
    msg = await client.messages.create(
        model=MODEL,
        max_tokens=60,
        messages=[
            {
                "role": "user",
                "content": (
                    "Convert the following gynecology question into a short English "
                    "keyword search phrase (5–12 words) using precise medical terms "
                    "as they appear in English textbooks (e.g. FIGO, TNM, staging). "
                    "Return ONLY the keywords, no explanation:\n\n" + query
                ),
            }
        ],
    )
    return msg.content[0].text.strip()


@app.post("/chat")
async def chat(request: Request):
    ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.client.host
    )

    if not check_rate_limit(ip):
        log.warning("rate limit hit for %s", ip)
        text_id = f"text_{uuid.uuid4().hex[:12]}"

        async def _blocked():
            yield f'data: {json.dumps({"type": "start"})}\n\n'
            yield f'data: {json.dumps({"type": "text-start", "id": text_id})}\n\n'
            yield f'data: {json.dumps({"type": "text-delta", "id": text_id, "delta": "Too many requests. Please wait a minute."})}\n\n'
            yield f'data: {json.dumps({"type": "text-end", "id": text_id})}\n\n'
            yield f'data: {json.dumps({"type": "finish", "finishReason": "stop"})}\n\n'
            yield 'data: [DONE]\n\n'

        return StreamingResponse(
            _blocked(),
            media_type="text/event-stream",
            status_code=429,
            headers={"x-vercel-ai-ui-message-stream": "v1", "x-accel-buffering": "no"},
        )

    try:
        body = ChatRequest.model_validate(await request.json())
    except Exception:
        return JSONResponse({"detail": "Invalid request body"}, status_code=422)
    messages = body.messages
    language = body.language

    query = extract_query([m.model_dump() for m in messages])
    query = query[:2000]
    log.info("chat request: lang=%s query_len=%d", language, len(query))

    t0 = time.time()
    retrieval_query = await _translate_for_retrieval(query, language)
    context = await asyncio.to_thread(get_context, retrieval_query)
    log.info("retrieved %d chunks in %.2fs", len(context), time.time() - t0)

    system_prompt = build_system_prompt(language, context)
    text_id = f"text_{uuid.uuid4().hex[:12]}"

    async def stream():
        try:
            yield f'data: {json.dumps({"type": "start"})}\n\n'
            yield f'data: {json.dumps({"type": "text-start", "id": text_id})}\n\n'
            anthropic_msgs = to_anthropic_messages([m.model_dump() for m in messages])
            async with client.messages.stream(
                model=MODEL,
                max_tokens=2048,
                system=system_prompt,
                messages=anthropic_msgs,
            ) as s:
                async for text in s.text_stream:
                    yield f'data: {json.dumps({"type": "text-delta", "id": text_id, "delta": text})}\n\n'
            yield f'data: {json.dumps({"type": "text-end", "id": text_id})}\n\n'
            yield f'data: {json.dumps({"type": "finish", "finishReason": "stop"})}\n\n'
            yield 'data: [DONE]\n\n'
            log.info("stream done in %.2fs", time.time() - t0)
        except Exception as exc:
            log.error("stream error: %s", exc)
            error_msg = "\n\n[Error: response interrupted]"
            yield f'data: {json.dumps({"type": "text-delta", "id": text_id, "delta": error_msg})}\n\n'
            yield f'data: {json.dumps({"type": "text-end", "id": text_id})}\n\n'
            yield f'data: {json.dumps({"type": "finish", "finishReason": "error"})}\n\n'
            yield 'data: [DONE]\n\n'

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "cache-control": "no-cache",
            "x-vercel-ai-ui-message-stream": "v1",
            "x-accel-buffering": "no",
        },
    )
