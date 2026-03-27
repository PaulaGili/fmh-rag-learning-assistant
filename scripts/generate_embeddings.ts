/**
 * Generate embeddings for all FMH knowledge chunks using a local model.
 *
 * Uses @xenova/transformers with a multilingual sentence embedding model.
 * First run downloads the model; subsequent runs use the cache.
 *
 * Usage: npx tsx scripts/generate_embeddings.ts
 */

import fs from "fs";
import path from "path";

interface FmhEntry {
  topic: string;
  keywords: string[];
  content: string;
  source: string;
  category: string;
}

const DATA_DIR = path.join(__dirname, "..", "data");
const FMH_PATH = path.join(DATA_DIR, "fmh_info.json");
const OUT_PATH = path.join(DATA_DIR, "embeddings.json");

const MODEL_NAME = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const MAX_INPUT_CHARS = 2000; // ~512 tokens for this model

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

function buildEmbeddingInput(entry: FmhEntry): string {
  const keywords = entry.keywords.join(", ");
  const raw = `${entry.topic}\n${keywords}\n${entry.content}`;
  return truncate(raw, MAX_INPUT_CHARS);
}

async function main() {
  // Dynamic import because @xenova/transformers is ESM
  const { pipeline } = await import("@xenova/transformers");

  console.log(`Loading model: ${MODEL_NAME} ...`);
  const extractor = await pipeline("feature-extraction", MODEL_NAME, {
    quantized: true,
  });

  console.log("Reading FMH data...");
  const chunks: FmhEntry[] = JSON.parse(
    fs.readFileSync(FMH_PATH, "utf-8")
  );
  console.log(`Found ${chunks.length} chunks`);

  const embeddings: number[][] = [];
  const batchSize = 32;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map(buildEmbeddingInput);

    const results = await extractor(texts, {
      pooling: "mean",
      normalize: true,
    });

    // results.tolist() returns number[][] for batch input
    const batchEmbeddings: number[][] = results.tolist();
    embeddings.push(...batchEmbeddings);

    const done = Math.min(i + batchSize, chunks.length);
    console.log(`  Embedded ${done}/${chunks.length} chunks`);
  }

  const output = {
    model: MODEL_NAME,
    dimensions: embeddings[0].length,
    count: embeddings.length,
    generatedAt: new Date().toISOString(),
    embeddings,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output), "utf-8");
  const sizeMB = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(1);
  console.log(
    `\nDone! Wrote ${embeddings.length} embeddings (${output.dimensions} dims) to ${OUT_PATH} (${sizeMB} MB)`
  );
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
