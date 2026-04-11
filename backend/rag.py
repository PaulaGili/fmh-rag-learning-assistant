import json
import logging
import os
import re
from pathlib import Path

import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

log = logging.getLogger("fmh.rag")

DATA_DIR = Path(os.getenv("DATA_DIR", str(Path(__file__).parent.parent / "data")))

MAX_RESULTS = 20
MAX_CONTEXT_CHARS = 32_000
MIN_SIMILARITY = 0.35
SEMANTIC_WEIGHT = 0.85
BM25_WEIGHT = 0.15

_fmh_data: list | None = None
_embeddings_matrix: np.ndarray | None = None
_embed_model = None
_bm25: BM25Okapi | None = None


def is_ready() -> bool:
    return _fmh_data is not None and _embed_model is not None


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9äöüàéèêïôùûç]+", text.lower())


def load_resources():
    global _fmh_data, _embeddings_matrix, _embed_model, _bm25

    _fmh_data = json.loads((DATA_DIR / "fmh_info.json").read_text(encoding="utf-8"))
    log.info("loaded %d chunks", len(_fmh_data))

    npy_path = DATA_DIR / "embeddings.npy"
    if npy_path.exists():
        _embeddings_matrix = np.load(npy_path)
    else:
        raw = json.loads((DATA_DIR / "embeddings.json").read_text(encoding="utf-8"))
        _embeddings_matrix = np.array(raw["embeddings"], dtype=np.float32)
    log.info("embeddings shape=%s", _embeddings_matrix.shape)

    _embed_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    log.info("model loaded")

    corpus = [_tokenize(f"{e['topic']} {e['content']}") for e in _fmh_data]
    _bm25 = BM25Okapi(corpus)


def get_context(query: str) -> list[dict]:
    query_vec = _embed_model.encode(query, normalize_embeddings=True)
    sims = _embeddings_matrix @ query_vec

    semantic_scores = {i: float(s) for i, s in enumerate(sims) if s >= MIN_SIMILARITY}

    # always keep at least 5 candidates so cross-lingual queries don't return empty
    top5 = sorted(range(len(sims)), key=lambda x: -float(sims[x]))[:5]
    for i in top5:
        semantic_scores.setdefault(i, float(sims[i]))

    bm25_raw = _bm25.get_scores(_tokenize(query))
    bm25_max = float(bm25_raw.max()) or 1.0
    bm25_scores = {i: float(s) / bm25_max for i, s in enumerate(bm25_raw) if s > 0}

    combined = {}
    for i, sim in semantic_scores.items():
        combined[i] = sim * SEMANTIC_WEIGHT + bm25_scores.get(i, 0) * BM25_WEIGHT
    for i, bm25 in bm25_scores.items():
        if i not in combined:
            combined[i] = bm25 * BM25_WEIGHT

    ranked = sorted(combined, key=lambda x: -combined[x])

    results, total = [], 0
    for i in ranked:
        entry = _fmh_data[i]
        if len(results) >= MAX_RESULTS or total + len(entry["content"]) > MAX_CONTEXT_CHARS:
            break
        results.append(entry)
        total += len(entry["content"])

    if not results:
        for i in top5:
            entry = _fmh_data[i]
            if total + len(entry["content"]) <= MAX_CONTEXT_CHARS:
                results.append(entry)
                total += len(entry["content"])

    return results
