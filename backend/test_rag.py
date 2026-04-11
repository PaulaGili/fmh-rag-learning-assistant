import numpy as np
import pytest
from pathlib import Path
from rank_bm25 import BM25Okapi
from unittest.mock import MagicMock, patch

import rag
from rag import _tokenize, get_context, load_resources

CHUNKS = [
    {
        "topic": "Endometriosis",
        "content": "Endometriosis is characterized by dysmenorrhea and pelvic pain. Endometrial tissue grows outside the uterus.",
        "source": "docs/Endometriosis_(G04p)/Endometriosis.pdf",
        "category": "Endometriosis_(G04p)",
    },
    {
        "topic": "Ovarian Cancer Staging",
        "content": "FIGO staging for ovarian cancer: Stage I confined to ovaries. Peritoneal spread defines Stage III.",
        "source": "docs/Ovarian_tumors_(G13p)/Epithelial_ovarian_cancer.pdf",
        "category": "Ovarian_tumors_(G13p)",
    },
    {
        "topic": "Breast Cancer Classification",
        "content": "Breast cancer subtypes include HER2-positive, triple negative, and luminal subtypes.",
        "source": "docs/Senology_(G10p)/Breast_cancer.pdf",
        "category": "Senology_(G10p)",
    },
    {
        "topic": "Ectopic Pregnancy Treatment",
        "content": "Methotrexate is used for medical management. Salpingectomy is indicated for ruptured ectopic pregnancy.",
        "source": "docs/Ectopic_pregnancy_(G05p)/Ectopic_pregnancy.pdf",
        "category": "Ectopic_pregnancy_(G05p)",
    },
    {
        "topic": "Cervical Cancer",
        "content": "Cervical cancer staging follows FIGO criteria. Colposcopy and LEEP are used for diagnosis.",
        "source": "docs/Cervical_(G11p)/Cervical_cancer.pdf",
        "category": "Cervical_(G11p)",
    },
]

DIM = 384


def make_embeddings(n: int) -> np.ndarray:
    rng = np.random.default_rng(42)
    mat = rng.standard_normal((n, DIM)).astype(np.float32)
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    return mat / norms


@pytest.fixture(autouse=True)
def reset_rag():
    rag._fmh_data = None
    rag._embeddings_matrix = None
    rag._embed_model = None
    rag._bm25 = None
    yield
    rag._fmh_data = None
    rag._embeddings_matrix = None
    rag._embed_model = None
    rag._bm25 = None


@pytest.fixture
def loaded_rag():
    embeddings = make_embeddings(len(CHUNKS))
    corpus = [_tokenize(f"{c['topic']} {c['content']}") for c in CHUNKS]

    mock_model = MagicMock()
    rag._fmh_data = CHUNKS
    rag._embeddings_matrix = embeddings
    rag._embed_model = mock_model
    rag._bm25 = BM25Okapi(corpus)

    return embeddings, mock_model


# --- _tokenize ---

def test_tokenize_basic():
    tokens = _tokenize("Ovarian Cancer FIGO Staging")
    assert "ovarian" in tokens
    assert "cancer" in tokens
    assert "figo" in tokens
    assert "staging" in tokens


def test_tokenize_strips_punctuation():
    tokens = _tokenize("Stage IV: peritoneal spread.")
    assert "stage" in tokens
    assert "peritoneal" in tokens
    assert "spread" in tokens
    assert ":" not in "".join(tokens)
    assert "." not in "".join(tokens)


def test_tokenize_lowercases():
    assert _tokenize("FIGO") == _tokenize("figo")


def test_tokenize_empty():
    assert _tokenize("") == []


# --- get_context ---

def test_get_context_returns_most_similar(loaded_rag):
    embeddings, mock_model = loaded_rag
    # query vector identical to first chunk vector → top result
    mock_model.encode.return_value = embeddings[0].copy()

    results = get_context("endometriosis dysmenorrhea pelvic pain")

    assert len(results) > 0
    assert results[0]["topic"] == "Endometriosis"


def test_get_context_top5_floor(loaded_rag):
    """Returns results even when all similarities are below MIN_SIMILARITY."""
    _, mock_model = loaded_rag
    # query far from all corpus vectors → near-zero cosine similarity
    far_vec = np.zeros(DIM, dtype=np.float32)
    far_vec[-1] = 1.0
    # make corpus orthogonal to this vector
    rag._embeddings_matrix[:, -1] = 0.0
    norms = np.linalg.norm(rag._embeddings_matrix, axis=1, keepdims=True)
    rag._embeddings_matrix /= np.maximum(norms, 1e-8)
    mock_model.encode.return_value = far_vec

    results = get_context("xyz123 completely unrelated query")

    assert len(results) > 0


def test_get_context_char_budget(loaded_rag):
    embeddings, mock_model = loaded_rag
    mock_model.encode.return_value = embeddings[1].copy()

    results = get_context("figo ovarian peritoneal staging")

    total = sum(len(r["content"]) for r in results)
    assert total <= rag.MAX_CONTEXT_CHARS


def test_get_context_max_results(loaded_rag):
    embeddings, mock_model = loaded_rag
    mock_model.encode.return_value = embeddings[0].copy()

    results = get_context("cancer staging")

    assert len(results) <= rag.MAX_RESULTS


# --- load_resources ---

def test_load_resources_raises_when_json_missing(tmp_path):
    with patch("rag.DATA_DIR", tmp_path):
        with pytest.raises(Exception):
            load_resources()


def test_load_resources_raises_when_embeddings_missing(tmp_path):
    import json
    (tmp_path / "fmh_info.json").write_text(json.dumps(CHUNKS))
    # no embeddings.npy or embeddings.json
    with patch("rag.DATA_DIR", tmp_path):
        with pytest.raises(Exception):
            load_resources()
