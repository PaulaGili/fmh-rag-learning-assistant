#!/usr/bin/env python3
"""
Parse all PDFs in data/learning-material/ and produce a structured
fmh_info.json for the RAG retriever.

Each PDF becomes one entry with:
  - topic:    human-readable topic derived from folder + filename
  - keywords: auto-generated from topic + content headings
  - content:  full extracted text (cleaned)
  - source:   relative file path for citation
  - category: parent folder name (G01–G17 code or case_series)

Long PDFs are split into chunks of ~2000 chars at paragraph boundaries
so the retriever can return focused context.
"""

import json
import os
import re
import sys

import pdfplumber

BASE = os.path.join(os.path.dirname(__file__), "..", "data", "learning-material")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "fmh_info.json")

CHUNK_TARGET = 2000  # chars per chunk (soft limit, split at paragraph)


def clean_text(raw: str) -> str:
    """Remove PDF artefacts: deduplicate doubled header chars, strip nav cruft."""
    # Remove the PNN/EGONE header lines and page footers
    lines = raw.split("\n")
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("PNN - EGONE") or stripped.startswith("https://egone"):
            continue
        if re.match(r"^\d+ de \d+ \d{2}/\d{2}/\d{4}", stripped):
            continue
        cleaned.append(line)
    text = "\n".join(cleaned)

    # Fix doubled characters in headings (e.g. "DDeefffiiinniittiioonn" → "Definition")
    def dedup_word(match: re.Match) -> str:
        word = match.group(0)
        if len(word) < 4:
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
        # Only accept if de-duplication removed roughly half
        if len(candidate) * 1.8 < len(word):
            return candidate
        return word

    text = re.sub(r"[A-Za-zÀ-ÿ]{6,}", dedup_word, text)

    # Collapse excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()
    return text


def extract_keywords(topic: str, text: str, category: str) -> list[str]:
    """Generate search keywords from topic, category, and content headings."""
    kws = set()

    # From topic (split on underscores, remove codes)
    for part in re.split(r"[_\-/()&,]", topic):
        w = part.strip().lower()
        if w and len(w) > 2 and not re.match(r"^g\d+p?$", w):
            kws.add(w)

    # From category
    for part in re.split(r"[_()\-]", category):
        w = part.strip().lower()
        if w and len(w) > 2 and not re.match(r"^g\d+p?$", w):
            kws.add(w)

    # Extract likely headings from text (lines that are short, capitalized)
    for line in text.split("\n"):
        stripped = line.strip()
        if 3 < len(stripped) < 80 and stripped[0].isupper() and not stripped.endswith("."):
            for word in re.split(r"\s+", stripped.lower()):
                clean = re.sub(r"[^a-zäöüàéèêïôùûç]", "", word)
                if len(clean) > 3:
                    kws.add(clean)

    # Keep a reasonable set
    return sorted(kws)[:30]


def humanize_topic(folder: str, filename: str) -> str:
    """Create a readable topic from folder and file names."""
    name = os.path.splitext(filename)[0]
    name = name.replace("_", " ").replace("-", " ")
    # Remove trailing codes like (G04p)
    name = re.sub(r"\s*\([Gg]\d+p?\)\s*", "", name)
    return name.strip()


def chunk_text(text: str) -> list[str]:
    """Split text into ~CHUNK_TARGET-sized pieces at paragraph boundaries."""
    paragraphs = re.split(r"\n\n+", text)
    chunks = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 2 > CHUNK_TARGET and current:
            chunks.append(current.strip())
            current = para
        else:
            current = current + "\n\n" + para if current else para

    if current.strip():
        chunks.append(current.strip())

    return chunks if chunks else [text]


def process_pdf(pdf_path: str, folder_name: str, filename: str) -> list[dict]:
    """Extract and chunk one PDF into fmh_info entries."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            pages_text = []
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)
            full_text = "\n\n".join(pages_text)
    except Exception as e:
        print(f"  WARN: Could not parse {pdf_path}: {e}", file=sys.stderr)
        return []

    if not full_text.strip():
        print(f"  WARN: Empty text from {pdf_path}", file=sys.stderr)
        return []

    cleaned = clean_text(full_text)
    topic = humanize_topic(folder_name, filename)
    rel_path = f"learning-material/{folder_name}/{filename}"

    chunks = chunk_text(cleaned)
    entries = []

    for i, chunk in enumerate(chunks):
        chunk_topic = topic if len(chunks) == 1 else f"{topic} (Teil {i + 1}/{len(chunks)})"
        keywords = extract_keywords(topic, chunk, folder_name)
        entries.append({
            "topic": chunk_topic,
            "keywords": keywords,
            "content": chunk,
            "source": rel_path,
            "category": folder_name,
        })

    return entries


def main():
    all_entries = []
    pdf_count = 0
    error_count = 0

    folders = sorted(os.listdir(BASE))
    for folder in folders:
        folder_path = os.path.join(BASE, folder)
        if not os.path.isdir(folder_path):
            continue

        pdfs = sorted(f for f in os.listdir(folder_path) if f.lower().endswith(".pdf"))
        if not pdfs:
            continue

        print(f"Processing {folder} ({len(pdfs)} PDFs)...")

        for filename in pdfs:
            pdf_path = os.path.join(folder_path, filename)
            entries = process_pdf(pdf_path, folder, filename)
            if entries:
                all_entries.extend(entries)
                pdf_count += 1
                print(f"  ✓ {filename} → {len(entries)} chunks")
            else:
                error_count += 1

    print(f"\nDone: {pdf_count} PDFs → {len(all_entries)} entries")
    if error_count:
        print(f"Warnings: {error_count} PDFs had issues")

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)
    print(f"Written to {OUT}")


if __name__ == "__main__":
    main()
