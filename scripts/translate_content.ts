// Translate quiz questions and flashcards to German and French.
// Usage: npx tsx scripts/translate_content.ts

import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { loadEnv } from "./env";

const DATA_DIR = path.join(__dirname, "..", "data");
const MODEL = "claude-haiku-4-5-20251001";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateBatch(
  client: Anthropic,
  items: string[],
  targetLang: string
): Promise<string[]> {
  const langName = targetLang === "de" ? "German" : "French";
  const prompt = `Translate each of the following medical texts to ${langName}. Keep medical terminology accurate. Return ONLY a JSON array of strings in the same order, no other text.

${JSON.stringify(items)}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return items; // fallback to original
  try {
    const result = JSON.parse(match[0]) as string[];
    return result.length === items.length ? result : items;
  } catch {
    return items;
  }
}

async function translateQuizzes(client: Anthropic) {
  const quizPath = path.join(DATA_DIR, "quizzes.json");
  const backupPath = path.join(DATA_DIR, "quizzes.backup.json");
  const quizzes = JSON.parse(fs.readFileSync(quizPath, "utf-8"));
  fs.writeFileSync(backupPath, JSON.stringify(quizzes, null, 2), "utf-8");
  console.log(`  Backed up ${quizzes.length} quizzes to ${backupPath}`);

  console.log(`Translating ${quizzes.length} quizzes...`);

  // Translate questions in batches of 15, but options per-quiz to avoid token overflow
  const BATCH = 15;
  for (let i = 0; i < quizzes.length; i += BATCH) {
    const batch = quizzes.slice(i, i + BATCH);
    const questions = batch.map((q: any) => q.question);
    const explanations = batch.map((q: any) => q.explanation || "").filter(Boolean);

    for (const lang of ["de", "fr"] as const) {
      // Translate questions in batch
      const trQ = await translateBatch(client, questions, lang);
      // Translate options per-quiz (5 items each) to avoid token limit
      const trOPerQuiz: string[][] = [];
      for (const q of batch) {
        const opts = q.options.map((o: any) => o.text);
        const tr = await translateBatch(client, opts, lang);
        trOPerQuiz.push(tr);
        await delay(200);
      }
      // Translate explanations in batch
      const trE = explanations.length > 0
        ? await translateBatch(client, explanations, lang)
        : [];

      let expIdx = 0;
      for (let j = 0; j < batch.length; j++) {
        const q = quizzes[i + j];
        q[`question_${lang}`] = trQ[j] || q.question;
        q[`options_${lang}`] = q.options.map((o: any, k: number) => ({
          id: o.id,
          text: trOPerQuiz[j][k] || o.text,
        }));
        if (q.explanation) {
          q[`explanation_${lang}`] = trE[expIdx] || q.explanation;
          expIdx++;
        }
      }
      await delay(500);
    }

    const done = Math.min(i + BATCH, quizzes.length);
    console.log(`  Quizzes ${done}/${quizzes.length}`);
  }

  fs.writeFileSync(quizPath, JSON.stringify(quizzes, null, 2), "utf-8");
  console.log("  Quizzes saved.\n");
}

async function translateFlashcards(client: Anthropic) {
  const fcPath = path.join(DATA_DIR, "flashcards.json");
  const fcBackupPath = path.join(DATA_DIR, "flashcards.backup.json");
  const cards = JSON.parse(fs.readFileSync(fcPath, "utf-8"));
  fs.writeFileSync(fcBackupPath, JSON.stringify(cards, null, 2), "utf-8");
  console.log(`  Backed up ${cards.length} flashcards to ${fcBackupPath}`);

  console.log(`Translating ${cards.length} flashcards...`);

  const BATCH = 25;
  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH);
    const fronts = batch.map((c: any) => c.front);
    const backs = batch.map((c: any) => c.back);

    for (const lang of ["de", "fr"] as const) {
      const trF = await translateBatch(client, fronts, lang);
      const trB = await translateBatch(client, backs, lang);

      for (let j = 0; j < batch.length; j++) {
        cards[i + j][`front_${lang}`] = trF[j] || cards[i + j].front;
        cards[i + j][`back_${lang}`] = trB[j] || cards[i + j].back;
      }
      await delay(500);
    }

    const done = Math.min(i + BATCH, cards.length);
    console.log(`  Flashcards ${done}/${cards.length}`);
  }

  fs.writeFileSync(fcPath, JSON.stringify(cards, null, 2), "utf-8");
  console.log("  Flashcards saved.\n");
}

async function main() {
  loadEnv();
  const client = new Anthropic();

  await translateQuizzes(client);
  await translateFlashcards(client);

  console.log("Done! All content translated to DE and FR.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
