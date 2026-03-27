import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { getRelevantContext } from "@/lib/getRelevantContext";
import { getRelevantContextSemantic } from "@/lib/getRelevantContextSemantic";
import type { Language } from "@/lib/languages";

const LANGUAGE_INSTRUCTIONS: Record<Language, string> = {
  de: `SPRACHE: Antworte auf Deutsch. Verwende korrekte medizinische Fachbegriffe auf Deutsch (lateinische Fachterminologie ist erlaubt).
UNSICHERHEITS-FALLBACK: "Dazu liegen mir keine gesicherten Informationen vor."
TEILANTWORT-MARKIERUNG: "⚠️ Unsicher: Zu [Thema] liegen mir keine gesicherten Informationen vor."`,

  en: `LANGUAGE: Respond in English. Use correct medical terminology.
UNCERTAINTY FALLBACK: "I don't have verified information on this topic."
PARTIAL ANSWER MARKER: "⚠️ Uncertain: I don't have verified information on [topic]."`,

  fr: `LANGUE: Réponds en français. Utilise la terminologie médicale correcte.
RÉPONSE PAR DÉFAUT EN CAS D'INCERTITUDE: "Je ne dispose pas d'informations vérifiées à ce sujet."
MARQUEUR DE RÉPONSE PARTIELLE: "⚠️ Incertain: Je ne dispose pas d'informations vérifiées sur [sujet]."`,
};

const INTRO: Record<Language, string> = {
  de: "Du bist ein Lernassistent für die gynäkologische Facharztprüfung (FMH) in der Schweiz.",
  en: "You are a learning assistant for the gynecological specialist exam (FMH) in Switzerland.",
  fr: "Tu es un assistant d'apprentissage pour l'examen spécialisé en gynécologie (FMH) en Suisse.",
};

function buildSystemPrompt(language: Language, contextBlock: string): string {
  return `${INTRO[language]}

STRIKTE REGELN – befolge sie IMMER:

1. KONTEXTBINDUNG: Deine Antworten basieren AUSSCHLIESSLICH auf dem unten bereitgestellten Kontext.
2. TEILANTWORTEN: Wenn der Kontext eine Frage nur teilweise abdeckt, beantworte den gesicherten Teil und markiere fehlende Informationen mit dem untenstehenden Marker.
3. KEIN KONTEXT: Wenn der Kontext die Frage überhaupt nicht abdeckt, verwende den untenstehenden Fallback-Satz.
4. KEINE ERFINDUNGEN: Erfinde niemals Fakten, Zahlen, Studien oder Richtlinien.
5. LERNPLAN: Wenn nach einem Lernplan oder Weiterbildungsstruktur gefragt wird, nutze ausschliesslich die im Kontext vorhandenen Strukturbausteine.
6. QUELLENHINWEIS: Wenn möglich, verweise auf die Quelle (source) im Kontext.

${LANGUAGE_INSTRUCTIONS[language]}

--- BEREITGESTELLTER KONTEXT ---

${contextBlock}

--- ENDE KONTEXT ---`;
}

function extractTextFromMessages(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return "";
  return last.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ");
}

export async function POST(req: Request) {
  const body = await req.json();
  const messages = body.messages as UIMessage[];
  const language = (body.language as Language) || "de";

  const query = extractTextFromMessages(messages);
  const context = await getRelevantContextSemantic(query).catch(() =>
    getRelevantContext(query)
  );

  const contextBlock =
    context.length > 0
      ? context
          .map((c) => `[${c.topic}] (Quelle: ${c.source})\n${c.content}`)
          .join("\n\n---\n\n")
      : "Kein relevanter Kontext gefunden.";

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: buildSystemPrompt(language, contextBlock),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
