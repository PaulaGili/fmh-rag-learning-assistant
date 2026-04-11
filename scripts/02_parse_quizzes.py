#!/usr/bin/env python3

import json
import os
import re
import sys

import pdfplumber

BASE = os.path.join(os.path.dirname(__file__), "..", "public", "docs")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "quizzes.json")


def clean_doubled(text: str) -> str:
    def dedup_word(match: re.Match) -> str:
        word = match.group(0)
        if len(word) < 6:
            return word
        result = []
        i = 0
        while i < len(word):
            if i + 1 < len(word) and word[i] == word[i + 1]:
                result.append(word[i])
                i += 2
            else:
                result.append(word[i])
                i += 1
        candidate = "".join(result)
        if len(candidate) * 1.8 < len(word):
            return candidate
        return word
    return re.sub(r"[A-Za-zÀ-ÿ]{6,}", dedup_word, text)


def extract_quiz(pdf_path: str, folder_name: str) -> dict | None:
    try:
        with pdfplumber.open(pdf_path) as pdf:
            pages_text = []
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)
            raw = "\n".join(pages_text)
    except Exception as e:
        print(f"  WARN: Could not parse {pdf_path}: {e}", file=sys.stderr)
        return None

    if not raw.strip():
        return None

    text = clean_doubled(raw)

    # Remove header/footer lines
    lines = []
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("PNN - EGONE") or stripped.startswith("https://egone"):
            continue
        if re.match(r"^\d+ de \d+ \d{2}/\d{2}/\d{4}", stripped):
            continue
        if stripped.startswith("EGONEplus") and "Quiz" in stripped:
            continue
        lines.append(stripped)

    joined = "\n".join(lines).strip()

    q_match = re.search(r"Question\s+(\d+)/(\d+)", joined)
    q_num = q_match.group(1) if q_match else "1"
    q_total = q_match.group(2) if q_match else "?"

    joined = re.sub(r"Question\s+\d+/\d+\s*", "", joined)
    joined = re.sub(r"Choose the correct (?:statement|answer) from below\s*", "", joined)
    joined = joined.strip()

    parts = [p.strip() for p in joined.split("\n") if p.strip()]

    if len(parts) < 2:
        print(f"  WARN: Not enough parts in {pdf_path}", file=sys.stderr)
        return None

    if len(parts) >= 6:
        question_text = " ".join(parts[:-5])
        options = parts[-5:]
    elif len(parts) >= 3:
        question_text = parts[0]
        options = parts[1:]
    else:
        question_text = parts[0]
        options = parts[1:] if len(parts) > 1 else []

    correct_answer: str | None = None
    explanation: str | None = None

    correct_patterns = [
        r"(?:correct answer|answer|richtige antwort|antwort|la bonne réponse|réponse)[:\s]+([A-Ea-e])\b",
        r"^([A-E])\s*[✓✔☑]\s",
        r"\b([A-E])\s+(?:is correct|is the correct answer|ist richtig|est correcte?)\b",
    ]
    for line in parts:
        for pat in correct_patterns:
            m = re.search(pat, line, re.IGNORECASE)
            if m:
                correct_answer = m.group(1).upper()
                break
        if correct_answer:
            break

    category_display = folder_name.replace("_", " ")
    category_display = re.sub(r"\s*\([Gg]\d+p?\)\s*", "", category_display).strip()

    return {
        "id": f"{folder_name}_q{q_num}",
        "category": folder_name,
        "categoryDisplay": category_display,
        "questionNumber": int(q_num),
        "totalQuestions": int(q_total) if q_total != "?" else None,
        "question": question_text,
        "options": [{"id": chr(65 + i), "text": opt} for i, opt in enumerate(options)],
        "correctAnswer": correct_answer,
        "explanation": explanation,
        "source": f"docs/{folder_name}/quiz/{os.path.basename(pdf_path)}",
    }


def main():
    all_quizzes = []
    count = 0

    folders = sorted(os.listdir(BASE))
    for folder in folders:
        quiz_dir = os.path.join(BASE, folder, "quiz")
        if not os.path.isdir(quiz_dir):
            quiz_dir = os.path.join(BASE, folder, "Quiz")
            if not os.path.isdir(quiz_dir):
                continue

        pdfs = sorted(
            f for f in os.listdir(quiz_dir) if f.lower().endswith(".pdf")
        )
        if not pdfs:
            continue

        print(f"Processing {folder}/quiz ({len(pdfs)} questions)...")

        for filename in pdfs:
            pdf_path = os.path.join(quiz_dir, filename)
            quiz = extract_quiz(pdf_path, folder)
            if quiz:
                all_quizzes.append(quiz)
                count += 1

    # Also process case_series (same format, top-level)
    case_dir = os.path.join(BASE, "case_series_gynaecology")
    if os.path.isdir(case_dir):
        pdfs = sorted(f for f in os.listdir(case_dir) if f.lower().endswith(".pdf"))
        print(f"Processing case_series_gynaecology ({len(pdfs)} questions)...")
        for filename in pdfs:
            pdf_path = os.path.join(case_dir, filename)
            quiz = extract_quiz(pdf_path, "case_series_gynaecology")
            if quiz:
                all_quizzes.append(quiz)
                count += 1

    print(f"\nDone: {count} quiz questions extracted")

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(all_quizzes, f, ensure_ascii=False, indent=2)
    print(f"Written to {OUT}")


if __name__ == "__main__":
    main()
