"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenIcon,
  CheckIcon,
  DocumentTextIcon,
  TrophyIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import quizData from "@/data/quizzes.json";
import { useLanguage } from "@/lib/LanguageContext";
import { t, tCat } from "@/lib/i18n";
import { CARD_ACCENTS, hexToRgba, sanitizeContent } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
}

interface BestScore {
  correct: number;
  total: number;
}

const STORAGE_KEY = "fmh_quiz_best_scores";
const allQuizzes = quizData as Quiz[];

function cleanAnswerText(text: string): string {
  return text.replace(/^[\u2014\u2013\s]+|[\u2014\u2013\s]+$/g, "").trim();
}

function getEndLetter(count: number): string {
  return String.fromCharCode(64 + count);
}

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
    /* ignore */
  }
}

function getQuizText(quiz: Quiz, field: "question" | "explanation", lang: string): string {
  const raw = lang === "en"
    ? (quiz[field] ?? "")
    : ((quiz[`${field}_${lang}` as keyof Quiz] as string) ?? quiz[field] ?? "");
  const clean = sanitizeContent(raw);
  if (field !== "explanation") return clean;
  return clean
    .replace(/\u2014/g, ", ")
    .replace(/\s*\u2013\s*/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/\s*\d+\s*[/\\]\s*\d+\s+(?:Points?|Punkte?|points?)\s*\.?\s*$/i, "")
    .replace(/\s+(?:Points?|Punkte?)\s*\.?\s*$/i, "")
    .replace(/\s+\.\s*$/g, "")
    .trimEnd();
}

function getQuizOptions(quiz: Quiz, lang: string): QuizOption[] {
  const opts = lang === "en"
    ? quiz.options
    : ((quiz[`options_${lang}` as keyof Quiz] as QuizOption[]) ?? quiz.options);
  return opts.map((o) => ({ ...o, text: sanitizeContent(cleanAnswerText(o.text)) }));
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
    return Array.from(cats.entries()).sort((a, b) => a[1].localeCompare(b[1]));
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
  }, [isCompleted, selectedCategory, score]);

  useEffect(() => {
    if (!selectedCategory || isCompleted) return;
    function onKeyDown(e: KeyboardEvent) {
      if (!showResult) {
        const options = currentQuiz ? getQuizOptions(currentQuiz, language) : [];
        const keyMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
        const idx = keyMap[e.key.toLowerCase()];
        if (idx !== undefined && options[idx]) {
          setSelectedOption(options[idx].id);
          return;
        }
        if ((e.key === "Enter" || e.key === " ") && selectedOption) {
          e.preventDefault();
          setShowResult(true);
          const correct = currentQuiz?.correctAnswer;
          if (correct) {
            setScore((s) => ({
              correct: s.correct + (selectedOption === correct ? 1 : 0),
              total: s.total + 1,
            }));
          }
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedOption(null);
        setShowResult(false);
        setCurrentIndex((i) => i + 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedCategory, isCompleted, showResult, selectedOption, currentQuiz, language]);

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
              MCQ PRACTICE
            </span>
            <h1
              className="font-serif block"
              style={{ fontSize: "44px", fontWeight: 400, letterSpacing: "-0.02em", color: "var(--c-navy)", lineHeight: "1.1" }}
            >
              {t("quiz.title", language)}
            </h1>
            <p className="mt-1.5" style={{ fontSize: "14px", color: "var(--c-muted)" }}>
              {t("quiz.chooseCategory", language)}{" "}
              {t("quiz.totalQuestions", language, { count: allQuizzes.length })}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {categories.map(([key, display], index) => {
              const count = allQuizzes.filter((q) => q.category === key).length;
              const best = bestScores[key];
              const bestPct = best ? Math.round((best.correct / best.total) * 100) : null;
              const accentColor = CARD_ACCENTS[index % CARD_ACCENTS.length];
              return (
                <button
                  key={key}
                  onClick={() => handleSelectCategory(key)}
                  className="category-card flex flex-col rounded-[14px] text-left outline-none active:scale-[0.99]"
                  style={{ "--accent": accentColor } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between p-5 pb-3">
                    <div
                      className="flex h-[38px] w-[38px] items-center justify-center"
                      style={{ background: hexToRgba(accentColor, 0.1), borderRadius: "10px" }}
                    >
                      <DocumentTextIcon className="h-[18px] w-[18px]" style={{ color: accentColor }} />
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
                      {tCat(key, language, display)}
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--c-subtle)", marginTop: "4px" }}>
                      {count}{" "}
                      {count === 1 ? t("quiz.questionSingular", language) : t("quiz.questionPlural", language)}
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

  if (currentIndex >= filteredQuizzes.length) {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
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
            <h2 className="mb-1 text-xl font-bold text-[#1A1A2E]">
              {t("quiz.completed", language)}
            </h2>
            <p className="text-[40px] font-extrabold text-[#1A1A2E]">
              {score.correct} / {score.total}
            </p>
            <div className="my-4 h-2 w-full overflow-hidden rounded-full" style={{ background: "#E2E8F0" }}>
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: pct >= 70 ? "var(--c-green)" : "var(--c-yellow)" }}
              />
            </div>
            <p className="mb-6 text-[15px] text-[#718096]">
              {pct}% {t("quiz.correct", language)}
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => handleSelectCategory(selectedCategory!)}
                className="btn-dark rounded-xl px-6 py-2.5 text-sm font-semibold"
              >
                {t("fc.again", language)}
              </button>
              <button
                onClick={handleReset}
                className="text-sm font-medium text-[#718096] transition-colors hover:text-[#1A1A2E]"
              >
                {t("quiz.newCategory", language)}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-xs font-medium text-[#718096] transition-colors hover:text-[#1A1A2E]"
          >
            {t("quiz.categories", language)}
          </button>
          <span className="text-xs font-medium text-[#718096]">
            {t("quiz.questionOf", language, {
              current: currentIndex + 1,
              total: filteredQuizzes.length,
            })}
          </span>
        </div>

        <div className="mb-6 h-2 w-full overflow-hidden rounded-full" style={{ background: "#E2E8F0" }}>
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              background: "var(--c-indigo)",
              width: `${((currentIndex + 1) / filteredQuizzes.length) * 100}%`,
            }}
          />
        </div>

        <div
          key={currentIndex}
          className="rounded-[20px] p-8"
          style={{ background: "#FFFFFF", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", animation: "slide-up 0.3s ease-out" }}
        >
          <p className="mb-2 text-[13px] font-semibold" style={{ color: "var(--c-indigo)" }}>
            {currentQuiz ? tCat(currentQuiz.category, language, currentQuiz.categoryDisplay) : ""}
          </p>
          <p className="text-[18px] font-bold leading-relaxed text-[#1A1A2E]" style={{ textAlign: "justify" }}>
            {currentQuiz ? getQuizText(currentQuiz, "question", language) : ""}
          </p>
        </div>

        <div className="mt-4 space-y-2.5">
          {(currentQuiz ? getQuizOptions(currentQuiz, language) : []).map((opt) => {
            const correctAnswer = currentQuiz?.correctAnswer;
            let optionBg = "#F7FAFC";
            let optionBorder = "#E2E8F0";
            let optionOpacity = "1";
            let icon = null;

            if (showResult && correctAnswer) {
              if (opt.id === correctAnswer) {
                optionBg = "var(--c-green-soft)";
                optionBorder = "var(--c-green)";
                icon = <CheckIcon className="h-4 w-4" style={{ color: "var(--c-green)" }} />;
              } else if (opt.id === selectedOption) {
                optionBg = "var(--c-red-soft)";
                optionBorder = "var(--c-red)";
                icon = <XMarkIcon className="h-4 w-4" style={{ color: "var(--c-red)" }} />;
              } else {
                optionOpacity = "0.45";
              }
            } else if (selectedOption === opt.id) {
              optionBg = "var(--c-indigo-soft)";
              optionBorder = "var(--c-indigo)";
            }

            const badgeStyle =
              showResult && correctAnswer && opt.id === correctAnswer
                ? { background: "var(--c-green-soft)", color: "#276749" }
                : showResult && opt.id === selectedOption && opt.id !== correctAnswer
                ? { background: "var(--c-red-soft)", color: "#9B2335" }
                : selectedOption === opt.id
                ? { background: "var(--c-indigo)", color: "#FFFFFF" }
                : { background: "#E2E8F0", color: "#718096" };

            return (
              <button
                key={opt.id}
                onClick={() => !showResult && setSelectedOption(opt.id)}
                disabled={showResult}
                className="flex w-full items-start gap-3 rounded-[14px] border p-4 text-left transition-all duration-200 active:scale-[0.99]"
                style={{ background: optionBg, borderColor: optionBorder, opacity: optionOpacity }}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-150"
                  style={badgeStyle}
                >
                  {opt.id}
                </span>
                <span className="flex-1 pt-0.5 text-[15px] text-[#2D3748]">{opt.text}</span>
                {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
              </button>
            );
          })}
        </div>

        {!showResult && currentQuiz && (
          <p className="mt-2 text-center text-[11px] text-[#A0AEC0]">
            A–{getEndLetter(getQuizOptions(currentQuiz, language).length)} to select · Enter to confirm
          </p>
        )}

        {showResult && currentQuiz?.explanation && (
          <div
            className="mt-4 rounded-[14px] p-4 text-[15px]"
            style={{ background: "var(--c-indigo-soft)", border: "1px solid var(--c-indigo-border)", animation: "slide-up 0.2s ease-out" }}
          >
            <p className="mb-1.5 text-[13px] font-semibold" style={{ color: "var(--c-indigo)" }}>
              {t("quiz.explanation", language)}
            </p>
            <div className="prose prose-sm max-w-none leading-[1.7] text-[#2D3748]" style={{ textAlign: "justify" }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {getQuizText(currentQuiz, "explanation", language)}
              </ReactMarkdown>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {!showResult ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedOption}
              className="btn-dark rounded-xl px-6 py-2.5 text-sm font-semibold"
            >
              {t("quiz.checkAnswer", language)}
            </button>
          ) : currentIndex < filteredQuizzes.length - 1 ? (
            <button
              onClick={handleNext}
              className="btn-dark rounded-xl px-6 py-2.5 text-sm font-semibold"
            >
              {t("quiz.nextQuestion", language)}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="btn-dark rounded-xl px-6 py-2.5 text-sm font-semibold"
            >
              {t("quiz.showResult", language)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
