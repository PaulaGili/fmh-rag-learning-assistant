"use client";

import { useMemo, useState, useCallback } from "react";
import flashcardData from "@/data/flashcards.json";
import { useLanguage } from "@/lib/LanguageContext";
import { t, tCat } from "@/lib/i18n";

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

const allCards = flashcardData as Flashcard[];

function getCardText(card: Flashcard, field: "front" | "back", lang: string): string {
  if (lang === "en") return card[field];
  const key = `${field}_${lang}` as keyof Flashcard;
  return (card[key] as string) ?? card[field];
}

export default function FlashcardsPage() {
  const { language } = useLanguage();

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

  const [shuffleSeed, setShuffleSeed] = useState(1);
  const deck = useMemo(() => {
    if (!selectedCategory) return [];
    const filtered = allCards.filter((c) => c.category === selectedCategory);
    let seed = shuffleSeed;
    return [...filtered].sort(() => {
      seed = (seed * 16807) % 2147483647;
      return (seed / 2147483647) - 0.5;
    });
  }, [selectedCategory, shuffleSeed]);

  const currentCard = deck[currentIndex] ?? null;

  const handleFlip = useCallback(() => setIsFlipped((f) => !f), []);

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

  // Category selection
  if (!selectedCategory) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h2 className="mb-2 text-xl font-semibold">
            {t("fc.title", language)}
          </h2>
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            {t("fc.chooseCategory", language)}{" "}
            {t("fc.totalCards", language, { count: allCards.length })}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((cat) => (
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
                className="rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-rose-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-rose-700"
              >
                <p className="text-sm font-medium">{tCat(cat.key, language, cat.display)}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {cat.count} {t("fc.cards", language)}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Deck completed
  if (currentIndex >= deck.length) {
    const total = known + unknown;
    return (
      <div className="flex h-full items-center justify-center">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mb-4 text-4xl">
            {known / total >= 0.7 ? "🎉" : "💪"}
          </div>
          <h2 className="mb-2 text-xl font-semibold">
            {t("fc.completed", language)}
          </h2>
          <div className="mb-6 flex justify-center gap-6">
            <div>
              <p className="text-2xl font-bold text-green-600">{known}</p>
              <p className="text-xs text-zinc-500">{t("fc.known", language)}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{unknown}</p>
              <p className="text-xs text-zinc-500">
                {t("fc.unknown", language)}
              </p>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsFlipped(false);
                setKnown(0);
                setUnknown(0);
              }}
              className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {t("fc.again", language)}
            </button>
            <button
              onClick={handleReset}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              {t("fc.otherCategory", language)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active flashcard
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      {/* Progress */}
      <div className="mb-4 flex w-full max-w-lg items-center justify-between">
        <button
          onClick={handleReset}
          className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          {t("fc.categories", language)}
        </button>
        <span className="text-xs text-zinc-500">
          {currentIndex + 1} / {deck.length}
        </span>
      </div>

      <div className="mb-2 h-1 w-full max-w-lg rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-1 rounded-full bg-rose-500 transition-all"
          style={{
            width: `${((currentIndex + 1) / deck.length) * 100}%`,
          }}
        />
      </div>

      {/* Card */}
      <div
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleFlip(); }}
        className="mt-4 w-full max-w-lg cursor-pointer"
        style={{ perspective: "1000px" }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "16rem",
            transition: "transform 0.6s ease",
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
            }}
          >
            <p className="mb-2 text-xs font-medium text-rose-600">
              {currentCard ? tCat(currentCard.category, language, currentCard.categoryDisplay) : ""}
            </p>
            <p className="text-center text-base font-medium leading-relaxed">
              {currentCard ? getCardText(currentCard, "front", language) : ""}
            </p>
            <p className="mt-4 text-xs text-zinc-400">
              {t("fc.clickToFlip", language)}
            </p>
          </div>

          {/* Back */}
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-lg dark:border-rose-900 dark:bg-rose-950/30"
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="text-center text-sm leading-relaxed whitespace-pre-line">
              {currentCard ? getCardText(currentCard, "back", language) : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {isFlipped && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleDontKnow}
            className="flex items-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            {t("fc.unknown", language)}
          </button>
          <button
            onClick={handleKnow}
            className="flex items-center gap-2 rounded-xl border border-green-200 px-5 py-2.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 dark:border-green-900 dark:text-green-400 dark:hover:bg-green-950/30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            {t("fc.known", language)}
          </button>
        </div>
      )}
    </div>
  );
}
