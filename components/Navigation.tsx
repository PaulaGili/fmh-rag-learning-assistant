"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "@/lib/LanguageContext";
import { LANGUAGES, type Language } from "@/lib/languages";
import { t } from "@/lib/i18n";

export default function Navigation() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();

  const tabs = [
    { href: "/", label: t("nav.chat", language), icon: ChatBubbleLeftRightIcon },
    { href: "/quiz", label: t("nav.quiz", language), icon: QuestionMarkCircleIcon },
    { href: "/flashcards", label: t("nav.flashcards", language), icon: RectangleStackIcon },
  ];

  return (
    <header
      className="sticky top-0 z-30"
      style={{
        background: "#FFFFFF",
        borderBottom: "0.5px solid var(--c-border)",
        height: "56px",
      }}
    >
      <div className="mx-auto grid h-full max-w-[1100px] grid-cols-[1fr_auto_1fr] items-center px-6">

        {/* Logo */}
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
            className="h-8 w-8 items-center justify-center rounded-xl text-[10px] font-bold tracking-tight text-white"
            style={{ display: "none", background: "var(--c-indigo)" }}
          >
            FMH
          </div>
          <span className="hidden text-[13px] font-semibold text-[#1A1A2E] sm:block">
            {t("nav.title", language)}
          </span>
        </Link>

        {/* Tabs */}
        <nav className="flex items-center gap-0.5 rounded-[10px] p-1">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#1A1A2E] text-white"
                    : "text-[#6B7280] hover:bg-[#F3F4F6]"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Language */}
        <div className="flex items-center justify-end gap-0.5">
          {(Object.keys(LANGUAGES) as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`rounded-[6px] px-[10px] py-1 text-[13px] transition-all duration-150 ${
                language === lang
                  ? "bg-[#EEF2FF] font-bold text-[#4338CA]"
                  : "font-normal text-[#6B7280] hover:bg-[#F3F4F6]"
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
