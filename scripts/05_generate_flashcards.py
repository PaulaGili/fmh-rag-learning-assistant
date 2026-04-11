import hashlib
import json
import re
import time
from pathlib import Path

import anthropic
from dotenv import load_dotenv

DATA_DIR = Path(__file__).parent.parent / "data"
MODEL = "claude-sonnet-4-6"
MAX_CONTENT_PER_CATEGORY = 80_000


def make_id(text):
    return hashlib.md5(text.encode()).hexdigest()[:10]


def category_display(category):
    name = category.replace("_", " ")
    return re.sub(r"\s*\([Gg]\d+p?\)\s*", "", name).strip()


def normalize(text):
    return re.sub(r"[^\w\s]", "", text.lower()).strip()


def build_prompt(cat_display, chunks):
    material = ""
    for chunk in chunks:
        block = f"### {chunk['topic']}\n{chunk['content']}\n\n"
        if len(material) + len(block) > MAX_CONTENT_PER_CATEGORY:
            break
        material += block

    return f"""You are creating study flashcards for the Swiss FMH gynecology specialist exam.

Given the following study material for "{cat_display}", extract the most important concepts as flashcards.

RULES:
- Each flashcard has a "front" (question/prompt) and "back" (answer)
- Create these types of flashcards:
  1. Definitions: "What is X?" → concise definition
  2. Classifications: "What are the types of X?" → bullet list
  3. Key numbers: "What is the 5-year survival rate for X?" → specific statistic with context
  4. Clinical pearls: "What is the gold standard / first-line treatment for X?" → answer
  5. Differential diagnosis: "How do you differentiate X from Y?" → key distinguishing features
  6. Staging/Grading: "What is Stage III of X?" → criteria
- Keep fronts concise (under 100 characters)
- Backs should be complete but concise (under 300 characters)
- Focus on exam-relevant, high-yield facts
- Aim for 20-40 flashcards for large topics, 10-20 for smaller ones

Return ONLY a JSON array, no other text:
[
  {{
    "front": "What is endometriosis?",
    "back": "Presence of endometrial tissue outside the uterus, most commonly in the pelvis.",
    "term": "Endometriosis"
  }}
]

--- STUDY MATERIAL ---

{material}"""


def main():
    load_dotenv(Path(__file__).parent.parent / ".env.local")
    client = anthropic.Anthropic()

    chunks = json.loads((DATA_DIR / "fmh_info.json").read_text())

    out_path = DATA_DIR / "flashcards.json"
    existing = json.loads(out_path.read_text()) if out_path.exists() else []

    if existing:
        (DATA_DIR / "flashcards.backup.json").write_text(json.dumps(existing, indent=2))
        print(f"Backed up {len(existing)} existing flashcards")

    by_category = {}
    for chunk in chunks:
        by_category.setdefault(chunk["category"], []).append(chunk)

    categories = sorted(by_category.items(), key=lambda x: -len(x[1]))
    all_cards = []
    seen_fronts = set()
    print(f"Processing {len(categories)} categories...\n")

    for category, cat_chunks in categories:
        cat_display = category_display(category)
        print(f"  {cat_display} ({len(cat_chunks)} chunks)")

        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=4096,
                messages=[{"role": "user", "content": build_prompt(cat_display, cat_chunks)}],
            )

            text = response.content[0].text
            match = re.search(r"\[[\s\S]*\]", text)
            if not match:
                print("    No JSON found, skipping")
                continue

            added = 0
            for card in json.loads(match.group()):
                if not card.get("front") or not card.get("back"):
                    continue
                if len(card["front"]) > 150 or len(card["back"]) > 500:
                    continue
                key = normalize(card["front"])
                if key in seen_fronts:
                    continue
                seen_fronts.add(key)
                all_cards.append({
                    "id": make_id(card["front"]),
                    "front": card["front"],
                    "back": card["back"],
                    "category": category,
                    "categoryDisplay": cat_display,
                })
                added += 1

            print(f"    {added} flashcards generated")

        except Exception as e:
            print(f"    Error: {e}")

        time.sleep(1)

    out_path.write_text(json.dumps(all_cards, indent=2))
    print(f"\nDone! {len(all_cards)} flashcards total (replaced {len(existing)} previous)")


if __name__ == "__main__":
    main()
