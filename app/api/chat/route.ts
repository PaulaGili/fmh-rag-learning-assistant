import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { getRelevantContext } from "@/lib/getRelevantContext";
import { getRelevantContextSemantic } from "@/lib/getRelevantContextSemantic";
import type { Language } from "@/lib/languages";

// In-memory rate limiter — resets per serverless instance, sufficient for single-tenant use.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const MessagePartSchema = z.object({ type: z.string() }).passthrough();
const MessageSchema = z
  .object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    parts: z.array(MessagePartSchema),
  })
  .passthrough();

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
  language: z.enum(["de", "en", "fr"]).default("de"),
});

const LANG_CONFIG: Record<Language, { intro: string; fallback: string; partialMarker: string }> = {
  de: {
    intro: "Du bist ein Lernassistent für die gynäkologische Facharztprüfung (FMH) in der Schweiz. Antworte auf Deutsch; lateinische Fachterminologie ist erlaubt.",
    fallback: "Dazu liegen mir keine gesicherten Informationen vor.",
    partialMarker: "⚠️ Unsicher: Zu THEMA liegen mir keine gesicherten Informationen vor.",
  },
  en: {
    intro: "You are a learning assistant for the gynecological specialist exam (FMH) in Switzerland. Respond in English using correct medical terminology.",
    fallback: "I don't have verified information on this topic.",
    partialMarker: "⚠️ Uncertain: I don't have verified information on TOPIC.",
  },
  fr: {
    intro: "Tu es un assistant d'apprentissage pour l'examen spécialisé en gynécologie (FMH) en Suisse. Réponds en français en utilisant la terminologie médicale correcte.",
    fallback: "Je ne dispose pas d'informations vérifiées à ce sujet.",
    partialMarker: "⚠️ Incertain: Je ne dispose pas d'informations vérifiées sur SUJET.",
  },
};

function buildSystemPrompt(language: Language, contextBlock: string): string {
  const { intro, fallback, partialMarker } = LANG_CONFIG[language];
  return `${intro}

Answer strictly from the retrieved context below. If the context covers the question only partially, address what is covered and flag the gap with the partial answer marker. If the context does not cover the question at all, respond only with the fallback phrase. Never invent facts, figures, studies, or guidelines. When relevant, cite the source field from the context entry.

Fallback phrase: "${fallback}"
Partial answer marker: ${partialMarker}

--- CONTEXT ---

${contextBlock}

--- END CONTEXT ---`;
}

function extractLastUserText(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return "";
  return last.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ");
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a minute." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request.", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages, language } = parsed.data;
  const query = extractLastUserText(messages as UIMessage[]);

  let context;
  try {
    context = await getRelevantContextSemantic(query);
  } catch {
    context = getRelevantContext(query);
  }

  const contextBlock =
    context.length > 0
      ? context.map((c) => `[${c.topic}] (source: ${c.source})\n${c.content}`).join("\n\n---\n\n")
      : "No relevant context found.";

  const modelMessages = await convertToModelMessages(messages as UIMessage[]);
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

  const result = streamText({
    model: anthropic(model),
    system: buildSystemPrompt(language, contextBlock),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
