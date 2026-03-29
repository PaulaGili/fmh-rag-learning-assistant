"use client";

import { useEffect, useMemo, useState } from "react";
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
    // localStorage unavailable — silently skip
  }
}

function getCardText(card: Flashcard, field: "front" | "back", lang: string): string {
  if (lang === "en") return card[field];
  const key = `${field}_${lang}` as keyof Flashcard;
  return (card[key] as string) ?? card[field];
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeckCompleted]);

  // Category selection
  if (!selectedCategory) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8" style={{ animation: "fade-in 0.4s ease-out" }}>
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">{t("fc.title", language)}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t("fc.chooseCategory", language)}{" "}
                {t("fc.totalCards", language, { count: allCards.length })}
              </p>
            </div>
          </div>
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
                className="card-hover rounded-xl border border-zinc-200 bg-white p-5 text-left dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/30">
                  <svg className="h-4 w-4 text-rose-500 dark:text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                  </svg>
                </div>
                <p className="text-sm font-medium">{tCat(cat.key, language, cat.display)}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-zinc-400">
                    {cat.count} {t("fc.cards", language)}
                  </p>
                  {bestProgress[cat.key] && (
                    <p className="text-xs font-medium text-rose-500">
                      {t("quiz.best", language)}: {Math.round((bestProgress[cat.key].known / bestProgress[cat.key].total) * 100)}%
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-12 text-center text-[10px] text-zinc-400 dark:text-zinc-600">
            FMH Gynäkologie Lernassistent
          </p>
        </div>
      </div>
    );
  }

  // Deck completed
  if (currentIndex >= deck.length) {
    const total = known + unknown;
    const pct = total > 0 ? Math.round((known / total) * 100) : 0;
    return (
      <div className="flex h-full items-center justify-center" style={{ animation: "scale-in 0.3s ease-out" }}>
        <div className="mx-auto max-w-sm px-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${pct >= 70 ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
              <svg className={`h-8 w-8 ${pct >= 70 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                {pct >= 70 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.996.178-1.768.706-2.123 1.422a.75.75 0 0 0 .199.881l.72.623a4.99 4.99 0 0 0-.163 1.088 4.99 4.99 0 0 0 .163 1.088l-.72.622a.75.75 0 0 0-.2.882c.356.716 1.128 1.244 2.124 1.422M18.75 4.236c.996.178 1.768.706 2.123 1.422a.75.75 0 0 1-.199.881l-.72.623a4.99 4.99 0 0 1 .163 1.088 4.99 4.99 0 0 1-.163 1.088l.72.622a.75.75 0 0 1 .2.882c-.356.716-1.128 1.244-2.124 1.422" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                )}
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold">
              {t("fc.completed", language)}
            </h2>
            <div className="mb-4 flex justify-center gap-8">
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
            <div className="my-4 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mb-6 text-sm text-zinc-500">{pct}% {t("fc.known", language)}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFlipped(false);
                  setKnown(0);
                  setUnknown(0);
                }}
                className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {t("fc.again", language)}
              </button>
              <button
                onClick={handleReset}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md"
              >
                {t("fc.otherCategory", language)}
              </button>
            </div>
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
          className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          {t("fc.categories", language)}
        </button>
        <span className="text-xs text-zinc-500">
          {currentIndex + 1} / {deck.length}
        </span>
      </div>

      <div className="mb-2 h-2 w-full max-w-lg overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all"
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
            height: "18rem",
            transition: "transform 0.6s ease",
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
            }}
          >
            <p className="mb-3 text-xs font-medium text-rose-600">
              {currentCard ? tCat(currentCard.category, language, currentCard.categoryDisplay) : ""}
            </p>
            <p className="text-center text-base font-medium leading-relaxed">
              {currentCard ? getCardText(currentCard, "front", language) : ""}
            </p>
            <p className="mt-5 animate-pulse text-xs text-zinc-400 opacity-60">
              {t("fc.clickToFlip", language)}
            </p>
          </div>

          {/* Back */}
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100 p-8 shadow-xl dark:border-rose-900 dark:from-rose-950/40 dark:to-rose-900/20"
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
        <div className="mt-6 flex gap-3" style={{ animation: "slide-up 0.2s ease-out" }}>
          <button
            onClick={handleDontKnow}
            className="flex items-center gap-2.5 rounded-xl border-2 border-red-200 px-6 py-3 text-sm font-medium text-red-600 transition-all hover:border-red-300 hover:bg-red-50 active:scale-[0.98] dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            {t("fc.unknown", language)}
          </button>
          <button
            onClick={handleKnow}
            className="flex items-center gap-2.5 rounded-xl border-2 border-green-200 px-6 py-3 text-sm font-medium text-green-600 transition-all hover:border-green-300 hover:bg-green-50 active:scale-[0.98] dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
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
