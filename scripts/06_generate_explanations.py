import json
import time
from pathlib import Path

import anthropic
from dotenv import load_dotenv

DATA_DIR = Path(__file__).parent.parent / "data"
MODEL = "claude-haiku-4-5-20251001"
MAX_CONTEXT_CHARS = 3000


def get_context(fmh_chunks, category):
    text = ""
    for c in (c for c in fmh_chunks if c["category"] == category):
        block = f"{c['topic']}:\n{c['content']}\n\n"
        if len(text) + len(block) > MAX_CONTEXT_CHARS:
            break
        text += block
    return text.strip()


def generate_explanation(client, question, options, correct_answer, context):
    opt_list = "\n".join(f"{o['id']}. {o['text']}" for o in options)
    correct_text = next((o["text"] for o in options if o["id"] == correct_answer), correct_answer)

    prompt = f"""You are a medical education expert for the Swiss FMH gynecology specialist exam.

Given the following study material context, write a concise 1-2 sentence explanation of why the correct answer is correct for this exam question. Reference the material directly. Do not repeat the question or list options. Write only the explanation.

STUDY MATERIAL:
{context}

QUESTION:
{question}

OPTIONS:
{opt_list}

CORRECT ANSWER: {correct_answer} — {correct_text}

Explanation:"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


def translate_text(client, text, lang):
    lang_name = "German" if lang == "de" else "French"
    response = client.messages.create(
        model=MODEL,
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": f"Translate the following medical explanation to {lang_name}. Keep medical terminology accurate. Return only the translated text, no other output.\n\n{text}",
        }],
    )
    return response.content[0].text.strip() or text


def main():
    load_dotenv(Path(__file__).parent.parent / ".env.local")
    client = anthropic.Anthropic()

    quiz_path = DATA_DIR / "quizzes.json"
    quizzes = json.loads(quiz_path.read_text())

    (DATA_DIR / "quizzes.backup.json").write_text(json.dumps(quizzes, indent=2))
    print(f"Backed up {len(quizzes)} quizzes")

    fmh_chunks = json.loads((DATA_DIR / "fmh_info.json").read_text())

    missing = [q for q in quizzes if not q.get("explanation")]
    print(f"Generating explanations for {len(missing)} quizzes...\n")

    done = 0
    for q in missing:
        context = get_context(fmh_chunks, q["category"])
        if not context:
            print(f"  No context for category: {q['category']} — skipping")
            continue

        try:
            explanation = generate_explanation(
                client, q["question"], q["options"], q["correctAnswer"], context
            )
            q["explanation"] = explanation
            time.sleep(0.2)

            q["explanation_de"] = translate_text(client, explanation, "de")
            q["explanation_fr"] = translate_text(client, explanation, "fr")

            done += 1
            print(f"  [{done}/{len(missing)}] {q['category']} — done")
        except Exception as e:
            print(f"  WARN: {e}")

        time.sleep(0.4)

    quiz_path.write_text(json.dumps(quizzes, indent=2))
    print(f"\nDone. Generated {done} explanations (EN + DE + FR).")


if __name__ == "__main__":
    main()
