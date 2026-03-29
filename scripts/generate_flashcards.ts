// Generate study flashcards from FMH knowledge chunks.
// Usage: npm run generate:flashcards

import fs from "fs";
import path from "path";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { loadEnv } from "./env";

interface FmhEntry {
  topic: string;
  keywords: string[];
  content: string;
  source: string;
  category: string;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  categoryDisplay: string;
  source: string;
}

interface GeneratedCard {
  front: string;
  back: string;
  term: string;
}

// Config

const DATA_DIR = path.join(__dirname, "..", "data");
const FMH_PATH = path.join(DATA_DIR, "fmh_info.json");
const OUT_PATH = path.join(DATA_DIR, "flashcards.json");
const BACKUP_PATH = path.join(DATA_DIR, "flashcards.backup.json");

const MODEL = "claude-sonnet-4-20250514";
const MAX_CONTENT_PER_CATEGORY = 80_000;

// Helpers

function makeId(text: string): string {
  return crypto.createHash("md5").update(text).digest("hex").slice(0, 10);
}

function categoryDisplay(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\s*\([Gg]\d+p?\)\s*/g, "")
    .trim();
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Prompt

function buildPrompt(catDisplay: string, chunks: FmhEntry[]): string {
  let material = "";
  let totalChars = 0;

  for (const chunk of chunks) {
    const block = `### ${chunk.topic}\n${chunk.content}\n\n`;
    if (totalChars + block.length > MAX_CONTENT_PER_CATEGORY) break;
    material += block;
    totalChars += block.length;
  }

  return `Extract the most important concepts from the following FMH gynecology study material (${catDisplay}) as flashcards.

Each card has a front (question or prompt, max 100 chars) and a back (answer, max 300 chars). Focus on exam-relevant facts: definitions, classifications, key statistics, first-line treatments, staging criteria, and differential diagnosis pointers. Skip anything trivial. Aim for 20–40 cards for large topics, 10–20 for smaller ones.

Return a JSON array only, no other text:
[
  {
    "front": "What is endometriosis?",
    "back": "Presence of endometrial tissue outside the uterus, most commonly in the pelvis.",
    "term": "Endometriosis"
  }
]

--- STUDY MATERIAL ---

${material}`;
}

// Main

async function main() {
  loadEnv();

  const client = new Anthropic();

  const chunks: FmhEntry[] = JSON.parse(fs.readFileSync(FMH_PATH, "utf-8"));
  const existing: Flashcard[] = fs.existsSync(OUT_PATH)
    ? JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"))
    : [];

  // Backup existing
  if (existing.length > 0) {
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(existing, null, 2), "utf-8");
    console.log(`Backed up ${existing.length} existing flashcards to ${BACKUP_PATH}`);
  }

  // Group by category
  const byCategory = new Map<string, FmhEntry[]>();
  for (const chunk of chunks) {
    const list = byCategory.get(chunk.category) || [];
    list.push(chunk);
    byCategory.set(chunk.category, list);
  }

  const allCards: Flashcard[] = [];
  const seenFronts = new Set<string>();
  const categories = Array.from(byCategory.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  console.log(`Processing ${categories.length} categories...\n`);

  for (const [category, catChunks] of categories) {
    const catDisplay = categoryDisplay(category);

    console.log(`  ${catDisplay} (${catChunks.length} chunks)`);

    const prompt = buildPrompt(catDisplay, catChunks);

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn(`    ⚠ No JSON found in response, skipping`);
        continue;
      }

      const generated: GeneratedCard[] = JSON.parse(jsonMatch[0]);

      let added = 0;
      for (const card of generated) {
        if (!card.front || !card.back) continue;
        if (card.front.length > 150 || card.back.length > 500) continue;

        const key = normalize(card.front);
        if (seenFronts.has(key)) continue;
        seenFronts.add(key);

        allCards.push({
          id: makeId(card.front),
          front: card.front,
          back: card.back,
          category,
          categoryDisplay: catDisplay,
          source: "llm-generated",
        });
        added++;
      }

      console.log(`    ✓ Generated ${added} flashcards`);
    } catch (err) {
      console.error(`    ✗ Error:`, err);
    }

    await delay(1000);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(allCards, null, 2), "utf-8");
  console.log(
    `\nDone! Total: ${allCards.length} flashcards (replaced ${existing.length} regex-generated)`
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
