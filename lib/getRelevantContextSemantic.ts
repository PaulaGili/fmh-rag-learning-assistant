import fmhData from "@/data/fmh_info.json";
import { getRelevantContext, type FmhEntry } from "./getRelevantContext";

const MAX_RESULTS = 8;
const MAX_CONTEXT_CHARS = 12_000;
const MIN_SIMILARITY = 0.18;

const entries = fmhData as FmhEntry[];

let embeddingsCache: number[][] | null = null;

async function getStoredEmbeddings(): Promise<number[][]> {
  if (embeddingsCache) return embeddingsCache;
  const mod = await import("@/data/embeddings.json");
  embeddingsCache = (mod.default as { embeddings: number[][] }).embeddings;
  return embeddingsCache;
}

type FeatureExtractionPipeline = (
  text: string,
  options: { pooling: string; normalize: boolean }
) => Promise<{ tolist: () => number[][] }>;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = import("@xenova/transformers").then((mod) =>
      mod.pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2", {
        quantized: true,
      })
    ) as Promise<FeatureExtractionPipeline>;
  }
  return extractorPromise;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// Hybrid retriever: semantic similarity (60%) + keyword match (40%).
export async function getRelevantContextSemantic(
  query: string
): Promise<FmhEntry[]> {
  const storedEmbeddings = await getStoredEmbeddings();

  // 1. Semantic scores
  const extractor = await getExtractor();
  const result = await extractor(query, {
    pooling: "mean",
    normalize: true,
  });
  const queryEmbedding: number[] = result.tolist()[0];

  const semanticScores = new Map<number, number>();
  for (let i = 0; i < entries.length; i++) {
    const sim = cosineSimilarity(queryEmbedding, storedEmbeddings[i]);
    if (sim >= MIN_SIMILARITY) {
      semanticScores.set(i, sim);
    }
  }

  // 2. Keyword results (existing retriever returns sorted by relevance)
  const keywordResults = getRelevantContext(query);
  const keywordIndices = new Map<number, number>();
  for (const kwEntry of keywordResults) {
    const idx = entries.findIndex(
      (e) => e.topic === kwEntry.topic && e.source === kwEntry.source
    );
    if (idx !== -1) {
      const rank = keywordIndices.size;
      keywordIndices.set(idx, 1.0 - rank * 0.1);
    }
  }

  // 3. Merge: combined score = semantic * 0.6 + keyword * 0.4
  const combined = new Map<number, number>();

  for (const [idx, sim] of semanticScores) {
    const kwScore = keywordIndices.get(idx) ?? 0;
    combined.set(idx, sim * 0.6 + kwScore * 0.4);
  }
  for (const [idx, kwScore] of keywordIndices) {
    if (!combined.has(idx)) {
      combined.set(idx, kwScore * 0.4);
    }
  }

  // 4. Sort by combined score, apply limits
  const sorted = Array.from(combined.entries())
    .map(([idx, score]) => ({ entry: entries[idx], score }))
    .sort((a, b) => b.score - a.score);

  const results: FmhEntry[] = [];
  let totalChars = 0;

  for (const { entry } of sorted) {
    if (results.length >= MAX_RESULTS) break;
    if (totalChars + entry.content.length > MAX_CONTEXT_CHARS) break;
    results.push(entry);
    totalChars += entry.content.length;
  }

  return results;
}
