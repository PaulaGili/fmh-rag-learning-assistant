// Generate exam-style MCQ questions from FMH knowledge chunks.
// Usage: npm run generate:quizzes

import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { loadEnv } from "./env";

interface FmhEntry {
  topic: string;
  keywords: string[];
  content: string;
  source: string;
  category: string;
}

interface QuizOption {
  id: string;
  text: string;
}

interface Quiz {
  id: string;
  category: string;
  categoryDisplay: string;
  questionNumber: number;
  totalQuestions: number | null;
  question: string;
  options: QuizOption[];
  correctAnswer: string | null;
  explanation: string | null;
  source: string;
}

interface GeneratedQuestion {
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

// Config

const DATA_DIR = path.join(__dirname, "..", "data");
const FMH_PATH = path.join(DATA_DIR, "fmh_info.json");
const QUIZ_PATH = path.join(DATA_DIR, "quizzes.json");
const BACKUP_PATH = path.join(DATA_DIR, "quizzes.backup.json");

const MODEL = "claude-sonnet-4-20250514";
const MAX_CONTENT_PER_CATEGORY = 80_000; // chars to send per category

// Helpers

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

function buildPrompt(catDisplay: string, chunks: FmhEntry[], count: number): string {
  let material = "";
  let totalChars = 0;

  for (const chunk of chunks) {
    const block = `### ${chunk.topic}\n${chunk.content}\n\n`;
    if (totalChars + block.length > MAX_CONTENT_PER_CATEGORY) break;
    material += block;
    totalChars += block.length;
  }

  return `Generate exactly ${count} multiple-choice questions for the Swiss FMH gynecology specialist exam, category: ${catDisplay}.

Each question needs 5 options (A–E), one correct answer, and a 1–2 sentence explanation grounded in the material. Questions should test clinical reasoning, not just recall — mix formats: best next step, which is NOT correct, clinical scenario. Use specialist-level medical terminology in English. Distractors should be plausible but clearly distinguishable from the correct answer.

Return a JSON array only, no other text:
[
  {
    "question": "...",
    "options": [
      {"id": "A", "text": "..."},
      {"id": "B", "text": "..."},
      {"id": "C", "text": "..."},
      {"id": "D", "text": "..."},
      {"id": "E", "text": "..."}
    ],
    "correctAnswer": "B",
    "explanation": "..."
  }
]

${material}`;
}

// Main

async function main() {
  loadEnv();

  const client = new Anthropic();

  const chunks: FmhEntry[] = JSON.parse(fs.readFileSync(FMH_PATH, "utf-8"));
  const existing: Quiz[] = fs.existsSync(QUIZ_PATH)
    ? JSON.parse(fs.readFileSync(QUIZ_PATH, "utf-8"))
    : [];

  // Backup existing
  if (existing.length > 0) {
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(existing, null, 2), "utf-8");
    console.log(`Backed up ${existing.length} existing quizzes to ${BACKUP_PATH}`);
  }

  // Existing question texts for dedup
  const existingKeys = new Set(existing.map((q) => normalize(q.question)));

  // Group by category
  const byCategory = new Map<string, FmhEntry[]>();
  for (const chunk of chunks) {
    const list = byCategory.get(chunk.category) || [];
    list.push(chunk);
    byCategory.set(chunk.category, list);
  }

  const newQuizzes: Quiz[] = [];
  const categories = Array.from(byCategory.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  console.log(`Processing ${categories.length} categories...\n`);

  for (const [category, catChunks] of categories) {
    const catDisplay = categoryDisplay(category);
    const questionsToGenerate = Math.max(
      3,
      Math.min(15, Math.floor(catChunks.length / 3))
    );

    console.log(
      `  ${catDisplay} (${catChunks.length} chunks) → ${questionsToGenerate} questions`
    );

    const prompt = buildPrompt(catDisplay, catChunks, questionsToGenerate);

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn(`    ⚠ No JSON found in response, skipping`);
        continue;
      }

      const generated: GeneratedQuestion[] = JSON.parse(jsonMatch[0]);

      let added = 0;
      for (let i = 0; i < generated.length; i++) {
        const q = generated[i];
        const key = normalize(q.question);

        if (existingKeys.has(key)) continue;
        existingKeys.add(key);

        // Validate structure
        if (
          !q.question ||
          !Array.isArray(q.options) ||
          q.options.length !== 5 ||
          !q.correctAnswer
        ) {
          continue;
        }

        newQuizzes.push({
          id: `${category}_gen_q${i + 1}`,
          category,
          categoryDisplay: catDisplay,
          questionNumber: i + 1,
          totalQuestions: null,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || null,
          source: "generated",
        });
        added++;
      }

      console.log(`    ✓ Added ${added} questions`);
    } catch (err) {
      console.error(`    ✗ Error:`, err);
    }

    await delay(1000);
  }

  // Merge: existing + new
  const allQuizzes = [...existing, ...newQuizzes];

  fs.writeFileSync(QUIZ_PATH, JSON.stringify(allQuizzes, null, 2), "utf-8");
  console.log(
    `\nDone! Total: ${allQuizzes.length} quizzes (${existing.length} existing + ${newQuizzes.length} new)`
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
