import type { Language } from "./languages";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

const locales = { de, en, fr };

type Locale = typeof de;
type Section = keyof Locale;

function lookup(lang: Language, section: Section, key: string): string {
  const locale = locales[lang] as Locale;
  const fallback = locales.de as Locale;
  return (
    (locale[section] as Record<string, string>)[key] ??
    (fallback[section] as Record<string, string>)[key] ??
    key
  );
}

export function t(key: string, lang: Language, params?: Record<string, string | number>): string {
  const dot = key.indexOf(".");
  const section = key.slice(0, dot) as Section;
  const subkey = key.slice(dot + 1);

  let text = lookup(lang, section, subkey);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function tCat(category: string, lang: Language, fallback?: string): string {
  const locale = locales[lang] as Locale;
  return (
    (locale.cat as Record<string, string>)[category] ??
    (locales.de.cat as Record<string, string>)[category] ??
    fallback ??
    category
  );
}
