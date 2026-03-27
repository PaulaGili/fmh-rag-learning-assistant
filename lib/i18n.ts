import type { Language } from "./languages";

const translations = {
  // Navigation
  "nav.title": {
    de: "Gynäkologie Lernassistent",
    en: "Gynecology Learning Assistant",
    fr: "Assistant d'apprentissage en gynécologie",
  },
  "nav.subtitle": {
    de: "Facharztprüfung Schweiz",
    en: "Specialist Exam Switzerland",
    fr: "Examen de spécialiste Suisse",
  },
  "nav.chat": {
    de: "Chat",
    en: "Chat",
    fr: "Chat",
  },
  "nav.quiz": {
    de: "Quiz",
    en: "Quiz",
    fr: "Quiz",
  },
  "nav.flashcards": {
    de: "Lernkarten",
    en: "Flashcards",
    fr: "Fiches",
  },

  // Chat page
  "chat.welcome": {
    de: "Willkommen beim FMH Lernassistenten",
    en: "Welcome to the FMH Learning Assistant",
    fr: "Bienvenue sur l'assistant d'apprentissage FMH",
  },
  "chat.description": {
    de: "Stelle Fragen zur gynäkologischen Facharztausbildung. Die Antworten basieren ausschliesslich auf den hinterlegten FMH-Informationen.",
    en: "Ask questions about gynecological specialist training. Answers are based exclusively on the stored FMH information.",
    fr: "Posez des questions sur la formation de spécialiste en gynécologie. Les réponses sont basées exclusivement sur les informations FMH enregistrées.",
  },
  "chat.placeholder": {
    de: "Stelle eine Frage zur FMH-Weiterbildung …",
    en: "Ask a question about FMH training …",
    fr: "Posez une question sur la formation FMH …",
  },
  "chat.error": {
    de: "Fehler",
    en: "Error",
    fr: "Erreur",
  },
  "chat.initializing": {
    de: "Modell wird geladen...",
    en: "Loading model...",
    fr: "Chargement du modèle...",
  },
  "chat.errorCredits": {
    de: "API-Guthaben aufgebraucht. Bitte laden Sie Ihr Konto auf.",
    en: "API credits exhausted. Please top up your account.",
    fr: "Crédits API épuisés. Veuillez recharger votre compte.",
  },
  "chat.errorKey": {
    de: "Ungültiger API-Schlüssel. Bitte überprüfen Sie die Konfiguration.",
    en: "Invalid API key. Please check the configuration.",
    fr: "Clé API invalide. Veuillez vérifier la configuration.",
  },
  "chat.errorGeneric": {
    de: "Verbindungsfehler. Bitte versuchen Sie es erneut.",
    en: "Connection error. Please try again.",
    fr: "Erreur de connexion. Veuillez réessayer.",
  },
  "chat.suggestion1": {
    de: "Was ist Endometriose?",
    en: "What is endometriosis?",
    fr: "Qu'est-ce que l'endométriose ?",
  },
  "chat.suggestion2": {
    de: "Brustkrebs Staging",
    en: "Breast cancer staging",
    fr: "Stadification du cancer du sein",
  },
  "chat.suggestion3": {
    de: "Ektope Schwangerschaft",
    en: "Ectopic pregnancy",
    fr: "Grossesse ectopique",
  },

  // Quiz page
  "quiz.title": {
    de: "Quiz",
    en: "Quiz",
    fr: "Quiz",
  },
  "quiz.chooseCategory": {
    de: "Wähle eine Kategorie um mit den MC-Fragen zu starten.",
    en: "Choose a category to start with the MC questions.",
    fr: "Choisissez une catégorie pour commencer les questions QCM.",
  },
  "quiz.totalQuestions": {
    de: "Insgesamt {count} Fragen verfügbar.",
    en: "{count} questions available in total.",
    fr: "{count} questions disponibles au total.",
  },
  "quiz.questionSingular": {
    de: "Frage",
    en: "question",
    fr: "question",
  },
  "quiz.questionPlural": {
    de: "Fragen",
    en: "questions",
    fr: "questions",
  },
  "quiz.categories": {
    de: "← Kategorien",
    en: "← Categories",
    fr: "← Catégories",
  },
  "quiz.questionOf": {
    de: "Frage {current} / {total}",
    en: "Question {current} / {total}",
    fr: "Question {current} / {total}",
  },
  "quiz.checkAnswer": {
    de: "Antwort prüfen",
    en: "Check answer",
    fr: "Vérifier la réponse",
  },
  "quiz.nextQuestion": {
    de: "Nächste Frage →",
    en: "Next question →",
    fr: "Question suivante →",
  },
  "quiz.showResult": {
    de: "Ergebnis anzeigen",
    en: "Show result",
    fr: "Afficher le résultat",
  },
  "quiz.completed": {
    de: "Quiz abgeschlossen!",
    en: "Quiz completed!",
    fr: "Quiz terminé !",
  },
  "quiz.correct": {
    de: "richtig",
    en: "correct",
    fr: "correct",
  },
  "quiz.newCategory": {
    de: "Neue Kategorie wählen",
    en: "Choose new category",
    fr: "Choisir une nouvelle catégorie",
  },
  "quiz.explanation": {
    de: "Erklärung",
    en: "Explanation",
    fr: "Explication",
  },

  // Flashcards page
  "fc.title": {
    de: "Lernkarten",
    en: "Flashcards",
    fr: "Fiches d'apprentissage",
  },
  "fc.chooseCategory": {
    de: "Wähle eine Kategorie.",
    en: "Choose a category.",
    fr: "Choisissez une catégorie.",
  },
  "fc.totalCards": {
    de: "Insgesamt {count} Karten verfügbar.",
    en: "{count} cards available in total.",
    fr: "{count} fiches disponibles au total.",
  },
  "fc.cards": {
    de: "Karten",
    en: "cards",
    fr: "fiches",
  },
  "fc.categories": {
    de: "← Kategorien",
    en: "← Categories",
    fr: "← Catégories",
  },
  "fc.clickToFlip": {
    de: "Klicken zum Umdrehen",
    en: "Click to flip",
    fr: "Cliquez pour retourner",
  },
  "fc.known": {
    de: "Gewusst",
    en: "Known",
    fr: "Connu",
  },
  "fc.unknown": {
    de: "Nicht gewusst",
    en: "Didn't know",
    fr: "Pas connu",
  },
  "fc.completed": {
    de: "Stapel durchgearbeitet!",
    en: "Deck completed!",
    fr: "Paquet terminé !",
  },
  "fc.again": {
    de: "Nochmal",
    en: "Again",
    fr: "Encore",
  },
  "fc.otherCategory": {
    de: "Andere Kategorie",
    en: "Other category",
    fr: "Autre catégorie",
  },
  // Category names
  "cat.Benign_adnexal_tumors_(G08p)": {
    de: "Benigne Adnextumoren",
    en: "Benign Adnexal Tumors",
    fr: "Tumeurs annexielles bénignes",
  },
  "cat.Benign_uterine_tumors_(G07p)": {
    de: "Benigne Uterustumoren",
    en: "Benign Uterine Tumors",
    fr: "Tumeurs utérines bénignes",
  },
  "cat.Cervical_dysplasiacervical_carcinoma_(G11p)": {
    de: "Zervixdysplasie & Zervixkarzinom",
    en: "Cervical Dysplasia & Cervical Carcinoma",
    fr: "Dysplasie cervicale & carcinome cervical",
  },
  "cat.Endometrial_cancer_malignancies_(G12p)": {
    de: "Endometriumkarzinom & Malignome",
    en: "Endometrial Cancer & Malignancies",
    fr: "Cancer de l'endomètre & tumeurs malignes",
  },
  "cat.Endometriosis_(G04p)": {
    de: "Endometriose",
    en: "Endometriosis",
    fr: "Endométriose",
  },
  "cat.Malformations_(G16p)": {
    de: "Genitale Fehlbildungen",
    en: "Genital Malformations",
    fr: "Malformations génitales",
  },
  "cat.Miscarriage_abortion_(G06p)": {
    de: "Fehlgeburt & Schwangerschaftsabbruch",
    en: "Miscarriage & Abortion",
    fr: "Fausse couche & avortement",
  },
  "cat.Ovarian_tumors_(G13p)": {
    de: "Ovarialtumoren",
    en: "Ovarian Tumors",
    fr: "Tumeurs ovariennes",
  },
  "cat.Psychosomatics_(G17p)": {
    de: "Psychosomatik",
    en: "Psychosomatics",
    fr: "Psychosomatique",
  },
  "cat.Tumor_markers_(G15p)": {
    de: "Tumormarker",
    en: "Tumor Markers",
    fr: "Marqueurs tumoraux",
  },
  "cat.Vulvar_vaginal_cancer_(G14p)": {
    de: "Vulva- & Vaginalkarzinom",
    en: "Vulvar & Vaginal Cancer",
    fr: "Cancer vulvaire & vaginal",
  },
  "cat.genital_organs_(G01p)": {
    de: "Genitalorgane",
    en: "Genital Organs",
    fr: "Organes génitaux",
  },
  "cat.urogynecology_(G02p)": {
    de: "Urogynäkologie",
    en: "Urogynecology",
    fr: "Urogynécologie",
  },
  "cat.case_series_gynaecology": {
    de: "Fallserien Gynäkologie",
    en: "Case Series Gynaecology",
    fr: "Séries de cas gynécologie",
  },
  "cat.Senology_(G10p)": {
    de: "Senologie",
    en: "Senology",
    fr: "Sénologie",
  },
  "cat.Infektiologie_(G03p)": {
    de: "Infektiologie",
    en: "Infectiology",
    fr: "Infectiologie",
  },
  "cat.Ectopic_pregnancy_(G05p)": {
    de: "Eileiterschwangerschaft",
    en: "Ectopic Pregnancy",
    fr: "Grossesse ectopique",
  },
  "cat.Precancerous_lesions_of_vulvavagina_(G09p)": {
    de: "Präkanzeröse Läsionen Vulva & Vagina",
    en: "Precancerous Lesions of Vulva & Vagina",
    fr: "Lésions précancéreuses vulve & vagin",
  },
} as const;

type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language, params?: Record<string, string | number>): string {
  let text: string = translations[key]?.[lang] ?? translations[key]?.["de"] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

/**
 * Translate a category key (e.g. "Senology_(G10p)") to the current language.
 * Falls back to the raw categoryDisplay if no translation exists.
 */
export function tCat(category: string, lang: Language, fallback?: string): string {
  const key = `cat.${category}` as TranslationKey;
  const entry = translations[key];
  if (entry) return entry[lang] ?? entry["de"] ?? fallback ?? category;
  return fallback ?? category;
}
