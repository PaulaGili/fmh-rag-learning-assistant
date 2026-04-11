import json
import re
import time
from pathlib import Path

import anthropic
from dotenv import load_dotenv

DATA_DIR = Path(__file__).parent.parent / "data"
MODEL = "claude-haiku-4-5-20251001"


def translate_batch(client, items, lang):
    lang_name = "German" if lang == "de" else "French"
    prompt = (
        f"Translate each of the following medical texts to {lang_name}. "
        f"Keep medical terminology accurate. Return ONLY a JSON array of strings "
        f"in the same order, no other text.\n\n{json.dumps(items)}"
    )
    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text
    match = re.search(r"\[[\s\S]*\]", text)
    if not match:
        return items
    try:
        result = json.loads(match.group())
        return result if len(result) == len(items) else items
    except Exception:
        return items


def translate_quizzes(client):
    path = DATA_DIR / "quizzes.json"
    quizzes = json.loads(path.read_text())

    (DATA_DIR / "quizzes.backup.json").write_text(json.dumps(quizzes, indent=2))
    print(f"Backed up {len(quizzes)} quizzes")
    print(f"Translating {len(quizzes)} quizzes...")

    batch_size = 15
    for i in range(0, len(quizzes), batch_size):
        batch = quizzes[i : i + batch_size]
        questions = [q["question"] for q in batch]
        explanations = [q["explanation"] for q in batch if q.get("explanation")]

        for lang in ("de", "fr"):
            tr_q = translate_batch(client, questions, lang)

            tr_opts = []
            for q in batch:
                tr_opts.append(translate_batch(client, [o["text"] for o in q["options"]], lang))
                time.sleep(0.2)

            tr_exp = translate_batch(client, explanations, lang) if explanations else []

            exp_idx = 0
            for j, q in enumerate(batch):
                q[f"question_{lang}"] = tr_q[j] if j < len(tr_q) else q["question"]
                q[f"options_{lang}"] = [
                    {"id": o["id"], "text": tr_opts[j][k] if k < len(tr_opts[j]) else o["text"]}
                    for k, o in enumerate(q["options"])
                ]
                if q.get("explanation"):
                    q[f"explanation_{lang}"] = tr_exp[exp_idx] if exp_idx < len(tr_exp) else q["explanation"]
                    exp_idx += 1

            time.sleep(0.5)

        print(f"  {min(i + batch_size, len(quizzes))}/{len(quizzes)}")

    path.write_text(json.dumps(quizzes, indent=2))
    print("  Quizzes saved.\n")


def translate_flashcards(client):
    path = DATA_DIR / "flashcards.json"
    cards = json.loads(path.read_text())

    (DATA_DIR / "flashcards.backup.json").write_text(json.dumps(cards, indent=2))
    print(f"Backed up {len(cards)} flashcards")
    print(f"Translating {len(cards)} flashcards...")

    batch_size = 25
    for i in range(0, len(cards), batch_size):
        batch = cards[i : i + batch_size]
        fronts = [c["front"] for c in batch]
        backs = [c["back"] for c in batch]

        for lang in ("de", "fr"):
            tr_fronts = translate_batch(client, fronts, lang)
            tr_backs = translate_batch(client, backs, lang)
            for j in range(len(batch)):
                batch[j][f"front_{lang}"] = tr_fronts[j] if j < len(tr_fronts) else batch[j]["front"]
                batch[j][f"back_{lang}"] = tr_backs[j] if j < len(tr_backs) else batch[j]["back"]
            time.sleep(0.5)

        print(f"  {min(i + batch_size, len(cards))}/{len(cards)}")

    path.write_text(json.dumps(cards, indent=2))
    print("  Flashcards saved.\n")


def main():
    load_dotenv(Path(__file__).parent.parent / ".env.local")
    client = anthropic.Anthropic()

    translate_quizzes(client)
    translate_flashcards(client)

    print("Done! All content translated to DE and FR.")


if __name__ == "__main__":
    main()
