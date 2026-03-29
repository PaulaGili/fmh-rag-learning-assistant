// Generate and translate explanations for quiz questions missing them.
// Usage: npx tsx scripts/generate_explanations.ts

import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { loadEnv } from "./env";

const DATA_DIR = path.join(__dirname, "..", "data");
const QUIZ_PATH = path.join(DATA_DIR, "quizzes.json");
const QUIZ_BACKUP_PATH = path.join(DATA_DIR, "quizzes.backup.json");
const FMH_PATH = path.join(DATA_DIR, "fmh_info.json");
const MODEL = "claude-haiku-4-5-20251001";
const MAX_CONTEXT_CHARS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface FmhChunk { topic: string; content: string; category: string }
interface QuizEntry {
  question: string; options: { id: string; text: string }[];
  correctAnswer: string; explanation?: string; category: string;
  explanation_de?: string; explanation_fr?: string;
}

function getContext(fmhChunks: FmhChunk[], category: string): string {
  const chunks = fmhChunks.filter((c) => c.category === category);
  let text = "";
  for (const c of chunks) {
    const block = `${c.topic}:\n${c.content}\n\n`;
    if (text.length + block.length > MAX_CONTEXT_CHARS) break;
    text += block;
  }
  return text.trim();
}

async function generateExplanation(
  client: Anthropic,
  question: string,
  options: { id: string; text: string }[],
  correctAnswer: string,
  context: string
): Promise<string> {
  const optList = options.map((o) => `${o.id}. ${o.text}`).join("\n");
  const correctText = options.find((o) => o.id === correctAnswer)?.text ?? correctAnswer;

  const prompt = `You are a medical education expert for the Swiss FMH gynecology specialist exam.

Given the following study material context, write a concise 1-2 sentence explanation of why the correct answer is correct for this exam question. Reference the material directly. Do not repeat the question or list options. Write only the explanation.

STUDY MATERIAL:
${context}

QUESTION:
${question}

OPTIONS:
${optList}

CORRECT ANSWER: ${correctAnswer} — ${correctText}

Explanation:`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  return text;
}

async function translateText(
  client: Anthropic,
  text: string,
  targetLang: string
): Promise<string> {
  const langName = targetLang === "de" ? "German" : "French";
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Translate the following medical explanation to ${langName}. Keep medical terminology accurate. Return only the translated text, no other output.\n\n${text}`,
      },
    ],
  });
  const result = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  return result || text;
}

async function main() {
  loadEnv();
  const client = new Anthropic();

  const quizzes: QuizEntry[] = JSON.parse(fs.readFileSync(QUIZ_PATH, "utf-8"));
  fs.writeFileSync(QUIZ_BACKUP_PATH, JSON.stringify(quizzes, null, 2), "utf-8");
  console.log(`Backed up ${quizzes.length} quizzes to ${QUIZ_BACKUP_PATH}`);

  const fmhChunks: FmhChunk[] = JSON.parse(fs.readFileSync(FMH_PATH, "utf-8"));

  const missing = quizzes.filter((q) => !q.explanation);
  console.log(`Generating explanations for ${missing.length} quizzes...\n`);

  let done = 0;
  for (const q of missing) {
    const context = getContext(fmhChunks, q.category);

    if (!context) {
      console.warn(`  No context for category: ${q.category} — skipping`);
      continue;
    }

    try {
      // Generate English explanation
      const explanation = await generateExplanation(
        client,
        q.question,
        q.options,
        q.correctAnswer,
        context
      );
      q.explanation = explanation;
      await delay(200);

      // Translate to DE and FR
      const [de, fr] = await Promise.all([
        translateText(client, explanation, "de"),
        translateText(client, explanation, "fr"),
      ]);
      q.explanation_de = de;
      q.explanation_fr = fr;

      done++;
      console.log(`  [${done}/${missing.length}] ${q.category} — done`);
    } catch (err) {
      console.warn(`  WARN:`, err);
    }

    await delay(400);
  }

  fs.writeFileSync(QUIZ_PATH, JSON.stringify(quizzes, null, 2), "utf-8");
  console.log(`\nDone. Generated ${done} explanations (EN + DE + FR). Saved to quizzes.json`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
