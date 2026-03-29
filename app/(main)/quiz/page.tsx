"use client";

import { useEffect, useMemo, useState } from "react";
import quizData from "@/data/quizzes.json";
import { useLanguage } from "@/lib/LanguageContext";
import { t, tCat } from "@/lib/i18n";

interface QuizOption {
  id: string;
  text: string;
}

interface Quiz {
  id: string;
  category: string;
  categoryDisplay: string;
  question: string;
  question_de?: string;
  question_fr?: string;
  options: QuizOption[];
  options_de?: QuizOption[];
  options_fr?: QuizOption[];
  correctAnswer: string | null;
  explanation: string | null;
  explanation_de?: string;
  explanation_fr?: string;
  source: string;
}

interface BestScore {
  correct: number;
  total: number;
}

const STORAGE_KEY = "fmh_quiz_best_scores";
const allQuizzes = quizData as Quiz[];

function loadBestScores(): Record<string, BestScore> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveBestScore(category: string, score: BestScore) {
  try {
    const all = loadBestScores();
    const existing = all[category];
    const pct = score.correct / score.total;
    const existingPct = existing ? existing.correct / existing.total : -1;
    if (pct > existingPct) {
      all[category] = score;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  } catch {
    // localStorage unavailable — silently skip
  }
}

function getQuizText(quiz: Quiz, field: "question" | "explanation", lang: string): string {
  if (lang === "en") return quiz[field] ?? "";
  const key = `${field}_${lang}` as keyof Quiz;
  return (quiz[key] as string) ?? quiz[field] ?? "";
}

function getQuizOptions(quiz: Quiz, lang: string): QuizOption[] {
  if (lang === "en") return quiz.options;
  const key = `options_${lang}` as keyof Quiz;
  return (quiz[key] as QuizOption[]) ?? quiz.options;
}

export default function QuizPage() {
  const { language } = useLanguage();
  const [bestScores, setBestScores] = useState<Record<string, BestScore>>({});

  useEffect(() => {
    setBestScores(loadBestScores());
  }, []);

  const categories = useMemo(() => {
    const cats = new Map<string, string>();
    for (const q of allQuizzes) {
      cats.set(q.category, q.categoryDisplay);
    }
    return Array.from(cats.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const filteredQuizzes = useMemo(() => {
    if (!selectedCategory) return [];
    return allQuizzes.filter((q) => q.category === selectedCategory);
  }, [selectedCategory]);

  const currentQuiz = filteredQuizzes[currentIndex] ?? null;

  function handleSelectCategory(cat: string) {
    setSelectedCategory(cat);
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowResult(false);
    setScore({ correct: 0, total: 0 });
  }

  function handleSubmitAnswer() {
    if (!selectedOption) return;
    setShowResult(true);
    const correctAnswer = currentQuiz?.correctAnswer;
    if (correctAnswer) {
      setScore((s) => ({
        correct: s.correct + (selectedOption === correctAnswer ? 1 : 0),
        total: s.total + 1,
      }));
    }
  }

  function handleNext() {
    setSelectedOption(null);
    setShowResult(false);
    setCurrentIndex((i) => i + 1);
  }

  function handleReset() {
    setSelectedCategory(null);
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowResult(false);
    setScore({ correct: 0, total: 0 });
  }

  const isCompleted = selectedCategory !== null && filteredQuizzes.length > 0 && currentIndex >= filteredQuizzes.length;
  useEffect(() => {
    if (isCompleted && score.total > 0 && selectedCategory) {
      saveBestScore(selectedCategory, score);
      setBestScores(loadBestScores());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted]);

  // Category selection screen
  if (!selectedCategory) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8" style={{ animation: "fade-in 0.4s ease-out" }}>
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">{t("quiz.title", language)}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t("quiz.chooseCategory", language)}{" "}
                {t("quiz.totalQuestions", language, { count: allQuizzes.length })}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map(([key, display]) => {
              const count = allQuizzes.filter(
                (q) => q.category === key
              ).length;
              const best = bestScores[key];
              return (
                <button
                  key={key}
                  onClick={() => handleSelectCategory(key)}
                  className="card-hover rounded-xl border border-zinc-200 bg-white p-5 text-left dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/30">
                    <svg className="h-4 w-4 text-rose-500 dark:text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium">{tCat(key, language, display)}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-zinc-400">
                      {count}{" "}
                      {count === 1
                        ? t("quiz.questionSingular", language)
                        : t("quiz.questionPlural", language)}
                    </p>
                    {best && (
                      <p className="text-xs font-medium text-rose-500">
                        {t("quiz.best", language)}: {Math.round((best.correct / best.total) * 100)}%
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-12 text-center text-[10px] text-zinc-400 dark:text-zinc-600">
            FMH Gynäkologie Lernassistent
          </p>
        </div>
      </div>
    );
  }

  // Quiz completed
  if (currentIndex >= filteredQuizzes.length) {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
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
              {t("quiz.completed", language)}
            </h2>
            <p className="text-4xl font-bold text-rose-600">
              {score.correct} / {score.total}
            </p>
            <div className="my-4 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mb-6 text-sm text-zinc-500">
              {pct}% {t("quiz.correct", language)}
            </p>
            <button
              onClick={handleReset}
              className="rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md"
            >
              {t("quiz.newCategory", language)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active question
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Progress bar */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            {t("quiz.categories", language)}
          </button>
          <span className="text-xs text-zinc-500">
            {t("quiz.questionOf", language, {
              current: currentIndex + 1,
              total: filteredQuizzes.length,
            })}
          </span>
        </div>

        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all"
            style={{
              width: `${((currentIndex + 1) / filteredQuizzes.length) * 100}%`,
            }}
          />
        </div>

        {/* Question */}
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900" style={{ animation: "slide-up 0.3s ease-out" }}>
          <p className="mb-1 text-xs font-medium text-rose-600">
            {currentQuiz ? tCat(currentQuiz.category, language, currentQuiz.categoryDisplay) : ""}
          </p>
          <p className="text-base font-medium leading-relaxed">
            {currentQuiz ? getQuizText(currentQuiz, "question", language) : ""}
          </p>
        </div>

        {/* Options */}
        <div className="mt-4 space-y-2">
          {(currentQuiz ? getQuizOptions(currentQuiz, language) : []).map((opt) => {
            const correctAnswer = currentQuiz?.correctAnswer;
            let optionStyle =
              "border-zinc-200 bg-white hover:border-rose-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-rose-700";
            let icon = null;

            if (showResult && correctAnswer) {
              if (opt.id === correctAnswer) {
                optionStyle =
                  "border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-950/30";
                icon = (
                  <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                );
              } else if (opt.id === selectedOption) {
                optionStyle =
                  "border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-950/30";
                icon = (
                  <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                );
              } else {
                optionStyle =
                  "border-zinc-100 bg-zinc-50 opacity-50 dark:border-zinc-800 dark:bg-zinc-950";
              }
            } else if (showResult && !correctAnswer && opt.id === selectedOption) {
              optionStyle =
                "border-zinc-400 bg-zinc-50 ring-1 ring-zinc-200 dark:border-zinc-600 dark:bg-zinc-900";
            } else if (selectedOption === opt.id) {
              optionStyle =
                "border-rose-400 bg-rose-50/50 ring-1 ring-rose-200 dark:border-rose-600 dark:bg-rose-950/20 dark:ring-rose-900/30";
            }

            return (
              <button
                key={opt.id}
                onClick={() => !showResult && setSelectedOption(opt.id)}
                disabled={showResult}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm transition-all ${optionStyle}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold dark:bg-zinc-800">
                  {opt.id}
                </span>
                <span className="flex-1 pt-0.5">{opt.text}</span>
                {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showResult && currentQuiz?.explanation && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300" style={{ animation: "slide-up 0.2s ease-out" }}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide">
              {t("quiz.explanation", language)}
            </p>
            <p>{getQuizText(currentQuiz, "explanation", language)}</p>
          </div>
        )}

        {/* Action button */}
        <div className="mt-6 flex justify-end">
          {!showResult ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedOption}
              className="rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-40"
            >
              {t("quiz.checkAnswer", language)}
            </button>
          ) : currentIndex < filteredQuizzes.length - 1 ? (
            <button
              onClick={handleNext}
              className="rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md"
            >
              {t("quiz.nextQuestion", language)}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md"
            >
              {t("quiz.showResult", language)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
