"use client";

import { useMemo, useState } from "react";
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

const allQuizzes = quizData as Quiz[];

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
    const correctAnswer = currentQuiz?.correctAnswer ?? "A";
    setScore((s) => ({
      correct: s.correct + (selectedOption === correctAnswer ? 1 : 0),
      total: s.total + 1,
    }));
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

  // Category selection screen
  if (!selectedCategory) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h2 className="mb-2 text-xl font-semibold">
            {t("quiz.title", language)}
          </h2>
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            {t("quiz.chooseCategory", language)}{" "}
            {t("quiz.totalQuestions", language, { count: allQuizzes.length })}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map(([key, display]) => {
              const count = allQuizzes.filter(
                (q) => q.category === key
              ).length;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectCategory(key)}
                  className="rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-rose-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-rose-700"
                >
                  <p className="text-sm font-medium">{tCat(key, language, display)}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {count}{" "}
                    {count === 1
                      ? t("quiz.questionSingular", language)
                      : t("quiz.questionPlural", language)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Quiz completed
  if (currentIndex >= filteredQuizzes.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mb-4 text-4xl">
            {score.correct / score.total >= 0.7 ? "🎉" : "📚"}
          </div>
          <h2 className="mb-2 text-xl font-semibold">
            {t("quiz.completed", language)}
          </h2>
          <p className="mb-1 text-3xl font-bold text-rose-600">
            {score.correct} / {score.total}
          </p>
          <p className="mb-6 text-sm text-zinc-500">
            {Math.round((score.correct / score.total) * 100)}%{" "}
            {t("quiz.correct", language)}
          </p>
          <button
            onClick={handleReset}
            className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700"
          >
            {t("quiz.newCategory", language)}
          </button>
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
            className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
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

        <div className="mb-2 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-1.5 rounded-full bg-rose-500 transition-all"
            style={{
              width: `${((currentIndex + 1) / filteredQuizzes.length) * 100}%`,
            }}
          />
        </div>

        {/* Question */}
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
            let optionStyle =
              "border-zinc-200 bg-white hover:border-rose-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-rose-700";

            if (showResult) {
              const correctAnswer = currentQuiz?.correctAnswer ?? "A";
              if (opt.id === correctAnswer) {
                optionStyle =
                  "border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-950/30";
              } else if (opt.id === selectedOption) {
                optionStyle =
                  "border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-950/30";
              } else {
                optionStyle =
                  "border-zinc-100 bg-zinc-50 opacity-50 dark:border-zinc-800 dark:bg-zinc-950";
              }
            } else if (selectedOption === opt.id) {
              optionStyle =
                "border-rose-400 bg-rose-50 ring-2 ring-rose-100 dark:border-rose-600 dark:bg-rose-950/20 dark:ring-rose-900/30";
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
                <span className="pt-0.5">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showResult && currentQuiz?.explanation && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
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
              className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-40"
            >
              {t("quiz.checkAnswer", language)}
            </button>
          ) : currentIndex < filteredQuizzes.length - 1 ? (
            <button
              onClick={handleNext}
              className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              {t("quiz.nextQuestion", language)}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              {t("quiz.showResult", language)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
