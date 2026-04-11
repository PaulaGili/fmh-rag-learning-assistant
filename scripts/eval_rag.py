import os
import sys
from pathlib import Path

import anthropic
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.local")

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from rag import get_context, load_resources

# (query, language, required_keywords) — all keywords must appear in top-k chunks
GOLDEN_SET = [
    # --- German ---
    ("Was ist Endometriose?",                               "de", ["endometriosis", "dysmenorrhea"]),
    ("Welche Stadien hat das Ovarialkarzinom?",             "de", ["figo", "peritoneal"]),
    ("Wie wird Brustkrebs klassifiziert?",                  "de", ["her2", "triple negative"]),
    ("Eileiterschwangerschaft Behandlung",                  "de", ["methotrexate", "salpingectomy"]),
    ("Uterusmyome Therapie",                                "de", ["leiomyoma", "myomectomy"]),
    ("Zervixkarzinom Staging",                              "de", ["figo", "cervical"]),
    ("Endometriumkarzinom Risikofaktoren",                  "de", ["tamoxifen", "endometrioid"]),
    ("Harninkontinenz Typen",                               "de", ["stress incontinence", "urge incontinence"]),
    ("Vulvakarzinom Behandlung",                            "de", ["vulvar", "inguinal"]),

    # --- English (no translation needed) ---
    ("What are the stages of ovarian cancer?",             "en", ["figo", "peritoneal"]),
    ("How is breast cancer classified?",                   "en", ["her2", "triple negative"]),
    ("Treatment of ectopic pregnancy",                     "en", ["methotrexate", "salpingectomy"]),
    ("What are risk factors for endometrial cancer?",      "en", ["tamoxifen", "endometrioid"]),
    ("Vulvar cancer staging FIGO",                         "en", ["vulvar", "figo", "inguinal"]),
    ("Uterine fibroids treatment",                         "en", ["leiomyoma", "myomectomy"]),
    ("Cervical dysplasia management",                      "en", ["colposcopy", "leep"]),

    # --- French ---
    ("Quels sont les stades du cancer ovarien?",           "fr", ["figo", "peritoneal"]),
    ("Comment traiter une grossesse ectopique?",           "fr", ["methotrexate", "salpingectomy"]),
    ("Classification du cancer du sein",                   "fr", ["her2", "triple negative"]),
    ("Facteurs de risque du cancer de l'endomètre",        "fr", ["tamoxifen", "endometrioid"]),
]

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
_client = None


def _translate(query: str, language: str) -> str:
    """Mirror of main.py/_translate_for_retrieval (synchronous version)."""
    if language == "en" or not query.strip():
        return query
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    msg = _client.messages.create(
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


def evaluate(k: int = 5) -> None:
    load_resources()
    print(f"Evaluating {len(GOLDEN_SET)} queries  (precision@{k}, all keywords required)\n")

    hits = 0
    for query, lang, keywords in GOLDEN_SET:
        retrieval_query = _translate(query, lang)
        results = get_context(retrieval_query)[:k]
        combined = " ".join(f"{r['topic']} {r['content']}" for r in results).lower()
        matched = [kw for kw in keywords if kw in combined]
        passed = len(matched) == len(keywords)
        if passed:
            hits += 1
        mark = "OK  " if passed else "FAIL"
        translated = f" -> \"{retrieval_query}\"" if lang != "en" else ""
        print(f"  [{mark}]  {query[:50]}{translated}")
        if not passed:
            missing = [kw for kw in keywords if kw not in matched]
            print(f"           missing:  {missing}")
            print(f"           top3:     {[r['topic'][:45] for r in results[:3]]}")

    precision = hits / len(GOLDEN_SET)
    print(f"\nPrecision@{k}: {precision:.0%}  ({hits}/{len(GOLDEN_SET)})")


if __name__ == "__main__":
    evaluate()
