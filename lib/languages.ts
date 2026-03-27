export type Language = "de" | "en" | "fr";

export const LANGUAGES: Record<Language, { label: string; flag: string }> = {
  de: { label: "Deutsch", flag: "DE" },
  en: { label: "English", flag: "EN" },
  fr: { label: "Français", flag: "FR" },
};

export const DEFAULT_LANGUAGE: Language = "de";
