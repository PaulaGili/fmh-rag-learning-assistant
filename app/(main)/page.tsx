"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import {
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  p({ children }) {
    const text = typeof children === "string" ? children : "";
    if (text.startsWith("⚠️") || text.startsWith("[⚠️")) {
      return <span className="warning-paragraph">{children}</span>;
    }
    return <p>{children}</p>;
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  const suggestions = [
    t("chat.suggestion1", language),
    t("chat.suggestion2", language),
    t("chat.suggestion3", language),
    t("chat.suggestion4", language),
  ];

  return (
    <div className="flex h-full flex-col">

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">

          {messages.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              style={{ animation: "fade-in 0.5s ease-out" }}
            >
              <span
                className="mb-3 inline-block"
                style={{
                  background: "var(--c-indigo-soft)",
                  color: "var(--c-indigo)",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "20px",
                  padding: "3px 10px",
                  letterSpacing: "0.06em",
                }}
              >
                CHAT
              </span>

              <h1
                className="font-serif"
                style={{ fontSize: "44px", fontWeight: 400, letterSpacing: "-0.02em", color: "var(--c-navy)", lineHeight: "1.1" }}
              >
                {t("chat.welcome", language)}
              </h1>
              <p className="mt-2 max-w-sm" style={{ fontSize: "14px", color: "var(--c-muted)" }}>
                {t("chat.description", language)}
              </p>

              <div className="mt-8 grid w-full max-w-[560px] gap-3 sm:grid-cols-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => { if (!isLoading) sendMessage({ text: q }, { body: { language } }); }}
                    className="card-hover flex min-w-0 flex-col items-center justify-center rounded-[14px] p-4 text-center outline-none active:scale-[0.98]"
                    style={{ background: "#FFFFFF", border: "0.5px solid var(--c-border)" }}
                  >
                    <span
                      className="mb-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ background: "var(--c-indigo-soft)", color: "var(--c-indigo)" }}
                    >
                      <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[14px] leading-snug text-[#2D3748]">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-5">
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
                    <div
                      className="mr-2.5 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "var(--c-indigo-soft)" }}
                    >
                      <AcademicCapIcon className="h-3.5 w-3.5" style={{ color: "var(--c-indigo)" }} />
                    </div>
                  )}

                  <div
                    className="max-w-[78%] rounded-2xl px-4 py-3 text-[15px] leading-[1.7]"
                    style={
                      m.role === "user"
                        ? { background: "var(--c-navy)", color: "#FFFFFF", borderRadius: "16px" }
                        : { background: "#FFFFFF", color: "#2D3748", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }
                    }
                  >
                    {m.role === "user" ? (
                      <div className="whitespace-pre-wrap">{text}</div>
                    ) : (
                      <div className="message-content prose prose-sm max-w-none" style={{ "--tw-prose-body": "#2D3748", "--tw-prose-links": "var(--c-indigo)" } as React.CSSProperties}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
                  <div
                    className="mr-2.5 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--c-indigo-soft)" }}
                  >
                    <AcademicCapIcon className="h-3.5 w-3.5" style={{ color: "var(--c-indigo)" }} />
                  </div>
                  <div className="rounded-2xl px-4 py-3.5" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full" style={{ background: "#818CF8" }} />
                      <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full [animation-delay:0.15s]" style={{ background: "#818CF8" }} />
                      <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full [animation-delay:0.3s]" style={{ background: "#818CF8" }} />
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-auto w-full max-w-3xl px-4">
          <div
            className="mb-2 flex items-start gap-3 rounded-xl px-4 py-3"
            style={{ background: "#FFF5F5", border: "1px solid #FED7D7" }}
          >
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#E53E3E]" />
            <div>
              <p className="text-sm font-medium text-[#E53E3E]">
                {t("chat.error", language)}
              </p>
              <p className="mt-0.5 text-xs text-[#718096]">
                {error.message.includes("credit")
                  ? t("chat.errorCredits", language)
                  : error.message.includes("401") || error.message.includes("key")
                    ? t("chat.errorKey", language)
                    : t("chat.errorGeneric", language)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className="border-t"
        style={{ background: "#FFFFFF", borderColor: "var(--c-border)" }}
      >
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-end gap-3 px-4 py-3"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={t("chat.placeholder", language)}
            rows={1}
            className="flex-1 resize-none rounded-[14px] border px-4 py-2.5 text-[15px] text-[#1A1A2E] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#A0AEC0] focus:border-[#4338CA] focus:shadow-[0_0_0_3px_rgba(67,56,202,0.10)]"
            style={{ background: "#FFFFFF", borderColor: "var(--c-border)" }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          >
            {isLoading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <PaperAirplaneIcon className="h-4 w-4" />
            )}
          </button>
        </form>
        <p className="pb-2.5 text-center text-[11px] text-[#A0AEC0]">
          Enter ↵ to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
