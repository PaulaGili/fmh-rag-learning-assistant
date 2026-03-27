"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const markdownComponents: Components = {
  p({ children }) {
    const text = typeof children === "string" ? children : "";
    if (text.startsWith("\u26a0\ufe0f")) {
      return <span className="warning-paragraph">{children}</span>;
    }
    return <p>{children}</p>;
  },
};

function getTextFromParts(parts: Array<{ type: string; text?: string }>) {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

export default function ChatPage() {
  const { language } = useLanguage();
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage({ text: trimmed }, { body: { language } });
    setInput("");
  }

  const suggestions = [
    t("chat.suggestion1", language),
    t("chat.suggestion2", language),
    t("chat.suggestion3", language),
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center" style={{ animation: "fade-in 0.5s ease-out" }}>
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-600/20">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-2xl font-bold">
                {t("chat.welcome", language)}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t("chat.description", language)}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                </svg>
                AI-powered
              </span>

              <div className="mt-8 grid w-full max-w-lg gap-3 sm:grid-cols-3">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setInput(q)}
                    className="card-hover group flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-white p-3 text-left dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 transition-colors group-hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:group-hover:bg-rose-900/40">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                    </span>
                    <span className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{q}</span>
                  </button>
                ))}
              </div>

              <p className="mt-10 text-[10px] text-zinc-400 dark:text-zinc-600">
                FMH Gynäkologie Lernassistent
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((m) => {
              const text = getTextFromParts(
                m.parts as Array<{ type: string; text?: string }>
              );
              if (!text && m.role === "assistant" && isLoading) return null;
              return (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  style={{ animation: "slide-up 0.3s ease-out" }}
                >
                  {m.role === "assistant" && (
                    <div className="mr-2.5 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/40 dark:to-rose-800/30">
                      <svg className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-sm"
                        : "bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                    }`}
                  >
                    {m.role === "user" ? (
                      <div className="whitespace-pre-wrap">{text}</div>
                    ) : (
                      <div className="message-content prose prose-sm prose-zinc dark:prose-invert prose-a:text-rose-600 max-w-none">
                        <ReactMarkdown components={markdownComponents}>
                          {text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading &&
              (messages.length === 0 ||
                messages[messages.length - 1].role === "user") && (
                <div className="flex justify-start" style={{ animation: "fade-in 0.3s ease-out" }}>
                  <div className="mr-2.5 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/40 dark:to-rose-800/30">
                    <svg className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                    </svg>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                    <div className="space-y-2">
                      <div className="h-2 w-36 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                      <div className="h-2 w-48 animate-pulse rounded-full bg-zinc-200 [animation-delay:0.15s] dark:bg-zinc-700" />
                      <div className="h-2 w-28 animate-pulse rounded-full bg-zinc-200 [animation-delay:0.3s] dark:bg-zinc-700" />
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
            <p className="font-medium">{t("chat.error", language)}</p>
            <p className="mt-1 text-xs opacity-80">
              {error.message.includes("credit")
                ? t("chat.errorCredits", language)
                : error.message.includes("401") || error.message.includes("key")
                  ? t("chat.errorKey", language)
                  : t("chat.errorGeneric", language)}
            </p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-200 bg-white/80 shadow-[0_-1px_3px_rgba(0,0,0,0.04)] backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/80">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-end gap-2 px-4 py-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={t("chat.placeholder", language)}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-500 dark:focus:border-rose-600 dark:focus:ring-rose-900/40"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-sm transition-all hover:shadow-md disabled:opacity-40 disabled:hover:shadow-sm"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
