"use client";

import { useState } from "react";

const T = {
  title: { de: "Anmelden", en: "Sign In", fr: "Connexion" },
  subtitle: {
    de: "FMH Gynäkologie Lernassistent",
    en: "FMH Gynecology Learning Assistant",
    fr: "Assistant FMH Gynécologie",
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
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      {/* Language toggle */}
      <div className="absolute right-4 top-4 flex items-center rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
        {(["de", "en", "fr"] as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
              lang === l
                ? "bg-rose-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-600/20">
            <span className="text-lg font-bold text-white">FMH</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {T.title[lang]}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {T.subtitle[lang]}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={T.placeholder[lang]}
            autoFocus
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-500 dark:focus:border-rose-600 dark:focus:ring-rose-900/40"
          />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
              {T.error[lang]}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 py-3 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
          >
            {loading ? "..." : T.button[lang]}
          </button>
        </form>
      </div>
    </div>
  );
}
