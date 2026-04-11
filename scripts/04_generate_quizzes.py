import json
import re
import time
from pathlib import Path

import anthropic
from dotenv import load_dotenv

DATA_DIR = Path(__file__).parent.parent / "data"
MODEL = "claude-sonnet-4-6"
MAX_CONTENT_PER_CATEGORY = 80_000


def category_display(category):
    name = category.replace("_", " ")
    return re.sub(r"\s*\([Gg]\d+p?\)\s*", "", name).strip()


def normalize(text):
    return re.sub(r"[^\w\s]", "", text.lower()).strip()


def build_prompt(cat_display, chunks, count):
    material = ""
    for chunk in chunks:
        block = f"### {chunk['topic']}\n{chunk['content']}\n\n"
        if len(material) + len(block) > MAX_CONTENT_PER_CATEGORY:
            break
        material += block

    return f"""You are a medical exam question writer for the Swiss FMH gynecology specialist exam.

Given the following study material for the category "{cat_display}", generate exactly {count} high-quality multiple-choice questions.

RULES:
- Each question must have exactly 5 options labeled A through E
- Exactly one option must be correct
- Include a 1-2 sentence explanation referencing the source material
- Questions should test understanding, not just recall
- Mix question types: "Which is correct?", "Which is NOT correct?", clinical scenarios, best-next-step
- Use medical terminology appropriate for specialist-level exams
- Write questions in English
- Make distractors plausible but clearly wrong based on the material

Return ONLY a JSON array, no other text:
[
  {{
    "question": "Question text here?",
    "options": [
      {{"id": "A", "text": "Option A text"}},
      {{"id": "B", "text": "Option B text"}},
      {{"id": "C", "text": "Option C text"}},
      {{"id": "D", "text": "Option D text"}},
      {{"id": "E", "text": "Option E text"}}
    ],
    "correctAnswer": "B",
    "explanation": "Explanation referencing the study material."
  }}
]

--- STUDY MATERIAL ---

{material}"""


def main():
    load_dotenv(Path(__file__).parent.parent / ".env.local")
    client = anthropic.Anthropic()

    chunks = json.loads((DATA_DIR / "fmh_info.json").read_text())

    quiz_path = DATA_DIR / "quizzes.json"
    existing = json.loads(quiz_path.read_text()) if quiz_path.exists() else []

    if existing:
        (DATA_DIR / "quizzes.backup.json").write_text(json.dumps(existing, indent=2))
        print(f"Backed up {len(existing)} quizzes")

    existing_keys = {normalize(q["question"]) for q in existing}

    by_category = {}
    for chunk in chunks:
        by_category.setdefault(chunk["category"], []).append(chunk)

    categories = sorted(by_category.items(), key=lambda x: -len(x[1]))
    new_quizzes = []
    print(f"Processing {len(categories)} categories...\n")

    for category, cat_chunks in categories:
        cat_display = category_display(category)
        n = max(3, min(15, len(cat_chunks) // 3))
        print(f"  {cat_display} ({len(cat_chunks)} chunks) → {n} questions")

        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=4096,
                messages=[{"role": "user", "content": build_prompt(cat_display, cat_chunks, n)}],
            )

            text = response.content[0].text
            match = re.search(r"\[[\s\S]*\]", text)
            if not match:
                print("    No JSON found, skipping")
                continue

            added = 0
            for i, q in enumerate(json.loads(match.group())):
                key = normalize(q.get("question", ""))
                if key in existing_keys:
                    continue
                if not q.get("question") or not isinstance(q.get("options"), list) or len(q["options"]) != 5 or not q.get("correctAnswer"):
                    continue
                existing_keys.add(key)
                new_quizzes.append({
                    "id": f"{category}_llm_q{i + 1}",
                    "category": category,
                    "categoryDisplay": cat_display,
                    "question": q["question"],
                    "options": q["options"],
                    "correctAnswer": q["correctAnswer"],
                    "explanation": q.get("explanation") or None,
                })
                added += 1

            print(f"    {added} questions added")

        except Exception as e:
            print(f"    Error: {e}")

        time.sleep(1)

    all_quizzes = existing + new_quizzes
    quiz_path.write_text(json.dumps(all_quizzes, indent=2))
    print(f"\nDone! {len(all_quizzes)} total ({len(existing)} existing + {len(new_quizzes)} new)")


if __name__ == "__main__":
    main()
