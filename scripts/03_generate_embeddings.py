import json
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

DATA_DIR = Path(__file__).parent.parent / "data"
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
MAX_INPUT_CHARS = 2000


def build_input(entry):
    keywords = ", ".join(entry["keywords"])
    raw = f"{entry['topic']}\n{keywords}\n{entry['content']}"
    if len(raw) <= MAX_INPUT_CHARS:
        return raw
    truncated = raw[:MAX_INPUT_CHARS]
    boundary = truncated.rfind("\n\n")
    return truncated[:boundary] if boundary > 500 else truncated


def main():
    load_dotenv(Path(__file__).parent.parent / ".env.local")

    print(f"Loading model: {MODEL_NAME} ...")
    model = SentenceTransformer(MODEL_NAME)

    chunks = json.loads((DATA_DIR / "fmh_info.json").read_text(encoding="utf-8"))
    print(f"Found {len(chunks)} chunks")

    texts = [build_input(c) for c in chunks]
    embeddings = []
    batch_size = 32

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        vecs = model.encode(batch, normalize_embeddings=True)
        embeddings.extend(vecs.tolist())
        print(f"  Embedded {min(i + batch_size, len(texts))}/{len(texts)} chunks")

    arr = np.array(embeddings, dtype=np.float32)
    out_path = DATA_DIR / "embeddings.npy"
    np.save(out_path, arr)
    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"\nDone! {len(embeddings)} embeddings ({arr.shape[1]} dims) saved to {out_path} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
