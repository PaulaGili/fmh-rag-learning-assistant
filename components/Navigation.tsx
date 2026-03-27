"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { LANGUAGES, type Language } from "@/lib/languages";
import { t } from "@/lib/i18n";

export default function Navigation() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 4);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const tabs = [
    { href: "/", label: t("nav.chat", language), icon: ChatIcon },
    { href: "/quiz", label: t("nav.quiz", language), icon: QuizIcon },
    { href: "/flashcards", label: t("nav.flashcards", language), icon: CardIcon },
  ];

  return (
    <header
      className={`sticky top-0 z-30 border-b bg-white/80 backdrop-blur-lg transition-all dark:bg-zinc-950/80 ${
        isScrolled
          ? "border-zinc-200 shadow-sm dark:border-zinc-800"
          : "border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2.5">
        {/* Logo + Title */}
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/fmh-logo.jpg"
            alt="FMH"
            className="h-8 w-auto"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              (el.nextElementSibling as HTMLElement).style.display = "flex";
            }}
          />
          <div
            className="h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 text-[10px] font-bold text-white shadow-sm"
            style={{ display: "none" }}
          >
            FMH
          </div>
          <p className="hidden text-sm font-semibold leading-tight sm:block">
            {t("nav.title", language)}
          </p>
        </Link>

        {/* Tab navigation */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && (
                  <span className="absolute -bottom-[11px] left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-rose-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Language selector */}
        <div className="flex items-center rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
          {(Object.keys(LANGUAGES) as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
                language === lang
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              {LANGUAGES[lang].flag}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  );
}

function QuizIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  );
}

function CardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
    </svg>
  );
}
