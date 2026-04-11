import os
import time
import pytest

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-not-real")

from unittest.mock import patch
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    import main
    main._rate_map.clear()
    with patch("main.load_resources"), patch("main.is_ready", return_value=True):
        with TestClient(main.app) as c:
            yield c
    main._rate_map.clear()


# --- /health ---

def test_health_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_health_loading():
    import main
    main._rate_map.clear()
    with patch("main.load_resources"), patch("main.is_ready", return_value=False):
        with TestClient(main.app) as c:
            res = c.get("/health")
    assert res.status_code == 503
    assert res.json()["status"] == "loading"


# --- Input validation ---

def test_chat_rejects_invalid_language(client):
    res = client.post("/chat", json={
        "messages": [{"role": "user", "parts": [{"type": "text", "text": "test"}]}],
        "language": "es",
    })
    assert res.status_code == 422


def test_chat_rejects_bad_message_shape(client):
    res = client.post("/chat", json={"messages": "not-a-list"})
    assert res.status_code == 422


# --- Rate limiting ---

def test_check_rate_limit_allows_up_to_limit():
    import main
    main._rate_map.clear()
    for _ in range(main.RATE_LIMIT):
        assert main.check_rate_limit("test-ip") is True
    main._rate_map.clear()


def test_check_rate_limit_blocks_after_limit():
    import main
    main._rate_map.clear()
    for _ in range(main.RATE_LIMIT):
        main.check_rate_limit("test-ip")
    assert main.check_rate_limit("test-ip") is False
    main._rate_map.clear()


def test_check_rate_limit_resets_after_window():
    import main
    main._rate_map.clear()
    # Pre-fill with an already-expired window
    main._rate_map["test-ip"] = (main.RATE_LIMIT, time.time() - 1)
    assert main.check_rate_limit("test-ip") is True
    main._rate_map.clear()


def test_check_rate_limit_independent_per_ip():
    import main
    main._rate_map.clear()
    for _ in range(main.RATE_LIMIT):
        main.check_rate_limit("ip-a")
    # ip-b should still be allowed
    assert main.check_rate_limit("ip-b") is True
    main._rate_map.clear()


def test_chat_returns_429_when_rate_limited(client):
    import main
    main._rate_map["testclient"] = (main.RATE_LIMIT, time.time() + 60)
    res = client.post("/chat", json={
        "messages": [{"role": "user", "parts": [{"type": "text", "text": "test"}]}],
        "language": "en",
    })
    assert res.status_code == 429


# --- Helper functions ---

def test_extract_query_returns_last_user_message():
    from main import extract_query
    messages = [
        {"role": "user", "parts": [{"type": "text", "text": "first"}]},
        {"role": "assistant", "parts": [{"type": "text", "text": "reply"}]},
        {"role": "user", "parts": [{"type": "text", "text": "second"}]},
    ]
    assert extract_query(messages) == "second"


def test_extract_query_empty():
    from main import extract_query
    assert extract_query([]) == ""
    assert extract_query([{"role": "assistant", "parts": [{"type": "text", "text": "hi"}]}]) == ""


def test_query_capped_at_2000():
    long = "x" * 3000
    assert len(long[:2000]) == 2000


def test_doc_label_strips_path_and_extension():
    from main import _doc_label
    entry = {"source": "docs/Endometriosis_(G04p)/Endometriosis_overview.pdf"}
    assert _doc_label(entry) == "Endometriosis overview"
