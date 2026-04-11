"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenIcon,
  CheckIcon,
  RectangleStackIcon,
  TrophyIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import flashcardData from "@/data/flashcards.json";
import { useLanguage } from "@/lib/LanguageContext";
import { t, tCat } from "@/lib/i18n";
import { CARD_ACCENTS, hexToRgba, sanitizeContent } from "@/lib/utils";

interface Flashcard {
  id: string;
  front: string;
  front_de?: string;
  front_fr?: string;
  back: string;
  back_de?: string;
  back_fr?: string;
  category: string;
  categoryDisplay: string;
}

interface CategoryProgress {
  known: number;
  total: number;
}

const STORAGE_KEY = "fmh_fc_best_progress";
const allCards = flashcardData as Flashcard[];

function loadBestProgress(): Record<string, CategoryProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveBestProgress(category: string, progress: CategoryProgress) {
  try {
    const all = loadBestProgress();
    const existing = all[category];
    const pct = progress.known / progress.total;
    const existingPct = existing ? existing.known / existing.total : -1;
    if (pct > existingPct) {
      all[category] = progress;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  } catch {
    /* ignore */
  }
}

function getCardText(card: Flashcard, field: "front" | "back", lang: string): string {
  if (lang === "en") return sanitizeContent(card[field]);
  const key = `${field}_${lang}` as keyof Flashcard;
  return sanitizeContent((card[key] as string) ?? card[field]);
}

export default function FlashcardsPage() {
  const { language } = useLanguage();
  const [bestProgress, setBestProgress] = useState<Record<string, CategoryProgress>>({});

  useEffect(() => {
    setBestProgress(loadBestProgress());
  }, []);

  const categories = useMemo(() => {
    const cats = new Map<string, { display: string; count: number }>();
    for (const c of allCards) {
      const existing = cats.get(c.category);
      if (existing) {
        existing.count++;
      } else {
        cats.set(c.category, { display: c.categoryDisplay, count: 1 });
      }
    }
    return Array.from(cats.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => a.display.localeCompare(b.display));
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);

  const [shuffleSeed, setShuffleSeed] = useState(0);
  const deck = useMemo(() => {
    if (!selectedCategory) return [];
    const filtered = allCards.filter((c) => c.category === selectedCategory);
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [selectedCategory, shuffleSeed]);

  const currentCard = deck[currentIndex] ?? null;

  function handleFlip() { setIsFlipped((f) => !f); }

  function handleKnow() {
    setKnown((k) => k + 1);
    advance();
  }

  function handleDontKnow() {
    setUnknown((u) => u + 1);
    advance();
  }

  function advance() {
    setIsFlipped(false);
    setCurrentIndex((i) => i + 1);
  }

  function handleReset() {
    setSelectedCategory(null);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnown(0);
    setUnknown(0);
  }

  const isDeckCompleted = selectedCategory !== null && deck.length > 0 && currentIndex >= deck.length;

  useEffect(() => {
    if (isDeckCompleted && selectedCategory && known + unknown > 0) {
      saveBestProgress(selectedCategory, { known, total: known + unknown });
      setBestProgress(loadBestProgress());
    }
  }, [isDeckCompleted, selectedCategory, known, unknown]);

  useEffect(() => {
    if (!selectedCategory || isDeckCompleted) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!isFlipped) setIsFlipped(true);
      } else if ((e.key === "ArrowRight" || e.key.toLowerCase() === "l") && isFlipped) {
        setKnown((k) => k + 1);
        setIsFlipped(false);
        setCurrentIndex((i) => i + 1);
      } else if ((e.key === "ArrowLeft" || e.key.toLowerCase() === "j") && isFlipped) {
        setUnknown((u) => u + 1);
        setIsFlipped(false);
        setCurrentIndex((i) => i + 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedCategory, isDeckCompleted, isFlipped]);

  if (!selectedCategory) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-8" style={{ animation: "fade-in 0.4s ease-out" }}>
          <div className="mb-8">
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
              STUDY CARDS
            </span>
            <h1
              className="font-serif block"
              style={{ fontSize: "44px", fontWeight: 400, letterSpacing: "-0.02em", color: "var(--c-navy)", lineHeight: "1.1" }}
            >
              {t("fc.title", language)}
            </h1>
            <p className="mt-1.5" style={{ fontSize: "14px", color: "var(--c-muted)" }}>
              {t("fc.chooseCategory", language)}{" "}
              {t("fc.totalCards", language, { count: allCards.length })}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {categories.map((cat, index) => {
              const bp = bestProgress[cat.key];
              const bestPct = bp ? Math.round((bp.known / bp.total) * 100) : null;
              const accentColor = CARD_ACCENTS[index % CARD_ACCENTS.length];
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    setCurrentIndex(0);
                    setIsFlipped(false);
                    setKnown(0);
                    setUnknown(0);
                    setShuffleSeed(Date.now());
                  }}
                  className="category-card flex flex-col rounded-[14px] text-left outline-none active:scale-[0.99]"
                  style={{ "--accent": accentColor } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between p-5 pb-3">
                    <div
                      className="flex h-[38px] w-[38px] items-center justify-center"
                      style={{ background: hexToRgba(accentColor, 0.1), borderRadius: "10px" }}
                    >
                      <RectangleStackIcon className="h-[18px] w-[18px]" style={{ color: accentColor }} />
                    </div>
                    {bestPct !== null && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
                        style={
                          bestPct >= 70
                            ? { background: "var(--c-green-soft)", color: "#1E8449" }
                            : { background: "var(--c-yellow-soft)", color: "#B7950B" }
                        }
                      >
                        {bestPct}%
                      </span>
                    )}
                  </div>

                  <div className="flex-1 px-5 pb-3">
                    <p style={{ fontSize: "17px", fontWeight: 600, color: "var(--c-navy)", lineHeight: "1.3" }}>
                      {tCat(cat.key, language, cat.display)}
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--c-subtle)", marginTop: "4px" }}>
                      {cat.count} {t("fc.cards", language)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 px-5 pb-4">
                    <div className="flex-1 overflow-hidden rounded-full" style={{ height: "3px", background: "#F3F4F6" }}>
                      <div style={{ width: "0%", height: "100%", background: accentColor, borderRadius: "999px" }} />
                    </div>
                    <span style={{ color: "var(--c-subtle)", fontSize: "14px" }}>→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (currentIndex >= deck.length) {
    const total = known + unknown;
    const pct = total > 0 ? Math.round((known / total) * 100) : 0;
    return (
      <div className="flex h-full items-center justify-center" style={{ animation: "scale-in 0.3s ease-out" }}>
        <div className="mx-auto max-w-sm px-4">
          <div
            className="rounded-[24px] p-8 text-center"
            style={{ background: "#FFFFFF", boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}
          >
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: pct >= 70 ? "var(--c-green-soft)" : "var(--c-yellow-soft)" }}
            >
              {pct >= 70
                ? <TrophyIcon className="h-8 w-8" style={{ color: "var(--c-green)" }} />
                : <BookOpenIcon className="h-8 w-8" style={{ color: "var(--c-yellow)" }} />
              }
            </div>
            <h2 className="mb-2 text-xl font-bold text-[#1A1A2E]">
              {t("fc.completed", language)}
            </h2>
            <div className="mb-4 flex justify-center gap-10">
              <div>
                <p className="text-[40px] font-extrabold text-[#38A169]">{known}</p>
                <p className="text-[13px] font-medium text-[#718096]">{t("fc.known", language)}</p>
              </div>
              <div>
                <p className="text-[40px] font-extrabold text-[#E53E3E]">{unknown}</p>
                <p className="text-[13px] font-medium text-[#718096]">{t("fc.unknown", language)}</p>
              </div>
            </div>
            <div className="my-4 h-2 w-full overflow-hidden rounded-full" style={{ background: "#E2E8F0" }}>
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: pct >= 70 ? "var(--c-green)" : "var(--c-yellow)" }}
              />
            </div>
            <p className="mb-6 text-[15px] text-[#718096]">{pct}% {t("fc.known", language)}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFlipped(false);
                  setKnown(0);
                  setUnknown(0);
                  setShuffleSeed(Date.now());
                }}
                className="btn-secondary rounded-xl px-5 py-2.5 text-sm font-semibold text-[#1A1A2E]"
              >
                {t("fc.again", language)}
              </button>
              <button
                onClick={handleReset}
                className="btn-dark rounded-xl px-5 py-2.5 text-sm font-semibold"
              >
                {t("fc.otherCategory", language)}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="mb-4 flex w-full max-w-lg items-center justify-between">
        <button
          onClick={handleReset}
          className="text-xs font-medium text-[#718096] transition-colors hover:text-[#1A1A2E]"
        >
          {t("fc.categories", language)}
        </button>
        <span className="text-xs font-medium text-[#718096]">
          {currentIndex + 1} / {deck.length}
        </span>
      </div>

      <div className="mb-4 h-2 w-full max-w-lg overflow-hidden rounded-full" style={{ background: "#E2E8F0" }}>
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{
            background: "var(--c-indigo)",
            width: `${((currentIndex + 1) / deck.length) * 100}%`,
          }}
        />
      </div>

      <div
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleFlip(); }}
        className="w-full max-w-lg cursor-pointer transition-transform duration-150 active:scale-[0.99]"
        style={{ perspective: "1000px" }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            minHeight: "280px",
            transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <div
            className="flex flex-col items-center justify-center rounded-[24px] px-12 py-12"
            style={{
              position: "absolute",
              inset: 0,
              background: "#FFFFFF",
              boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
            }}
          >
            <p className="mb-3 text-[13px] font-semibold" style={{ color: "var(--c-indigo)" }}>
              {currentCard ? tCat(currentCard.category, language, currentCard.categoryDisplay) : ""}
            </p>
            <p className="text-center text-[20px] font-semibold leading-relaxed text-[#1A1A2E]">
              {currentCard ? getCardText(currentCard, "front", language) : ""}
            </p>
            <p className="mt-6 text-[13px] text-[#A0AEC0]">
              {t("fc.clickToFlip", language)}
            </p>
          </div>

          <div
            className="flex flex-col items-center justify-center rounded-[24px] px-12 py-12"
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--c-indigo-soft)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="whitespace-pre-line text-center text-[20px] font-semibold leading-relaxed text-[#1A1A2E]">
              {currentCard ? getCardText(currentCard, "back", language) : ""}
            </p>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="mt-8 flex gap-4" style={{ animation: "slide-up 0.2s ease-out" }}>
          <button
            onClick={handleDontKnow}
            className="btn-unknown flex items-center gap-2.5 rounded-[12px] px-7 py-3 text-[15px] font-bold active:scale-[0.98]"
          >
            <XMarkIcon className="h-4 w-4" />
            {t("fc.unknown", language)}
          </button>
          <button
            onClick={handleKnow}
            className="btn-know flex items-center gap-2.5 rounded-[12px] px-7 py-3 text-[15px] font-bold active:scale-[0.98]"
          >
            <CheckIcon className="h-4 w-4" />
            {t("fc.known", language)}
          </button>
        </div>
      )}

      <p className="mt-4 text-[11px] text-[#A0AEC0]">
        Space to flip · ← / → to mark
      </p>
    </div>
  );
}
