"use client";

import { useState } from "react";
import Image from "next/image";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const T = {
  title: { de: "Gynecology Learning Assistant", en: "Gynecology Learning Assistant", fr: "Gynecology Learning Assistant" },
  subtitle: {
    de: "FMH Facharztprüfung · Zugang mit Passwort",
    en: "FMH Specialist Exam · Password required",
    fr: "Examen spécialisé FMH · Accès par mot de passe",
  },
  placeholder: {
    de: "Passwort eingeben",
    en: "Enter password",
    fr: "Entrer le mot de passe",
  },
  button: { de: "Einloggen", en: "Log in", fr: "Se connecter" },
  error: {
    de: "Falsches Passwort. Bitte erneut versuchen.",
    en: "Incorrect password. Please try again.",
    fr: "Mot de passe incorrect. Veuillez réessayer.",
  },
} as const;

type Lang = "de" | "en" | "fr";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("de");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.href = "/";
    } else {
      setError(true);
      setShakeKey((k) => k + 1);
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "#EDF2F7" }}
    >
      <div className="absolute right-4 top-4 flex items-center gap-0.5">
        {(["de", "en", "fr"] as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`rounded-lg px-[10px] py-1 text-[13px] transition-all duration-200 ${
              lang === l
                ? "font-bold text-[#4338CA]"
                : "font-normal text-[#718096] hover:bg-[#E2E8F0]"
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-5">
            <Image
              src="/fmh-logo.jpg"
              alt="FMH"
              width={120}
              height={48}
              priority
              style={{ objectFit: "contain" }}
            />
          </div>
          <h1 className="text-xl font-bold text-[#1A1A2E]">
            {T.title[lang]}
          </h1>
          <p className="mt-1 text-sm text-[#718096]">
            {T.subtitle[lang]}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(false);
            }}
            placeholder={T.placeholder[lang]}
            autoFocus
            className="w-full rounded-xl border px-4 py-3 text-[15px] text-[#1A1A2E] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#A0AEC0] focus:border-[#4338CA] focus:shadow-[0_0_0_3px_rgba(67,56,202,0.10)]"
            style={{
              background: "#FFFFFF",
              borderColor: error ? "#E53E3E" : "#E2E8F0",
              boxShadow: error ? "0 0 0 3px rgba(229,62,62,0.1)" : "none",
            }}
          />
          {error && (
            <div
              key={shakeKey}
              className="flex items-center gap-2.5 rounded-xl p-2.5"
              style={{
                background: "#FFF5F5",
                border: "1px solid #FED7D7",
                animation: "shake 0.4s ease-out",
              }}
            >
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-[#E53E3E]" />
              <p className="text-sm text-[#E53E3E]">{T.error[lang]}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="btn-indigo flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold"
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : T.button[lang]}
          </button>
        </form>
      </div>
    </div>
  );
}
