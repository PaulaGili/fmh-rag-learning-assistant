import fmhData from "@/data/fmh_info.json";

export interface FmhEntry {
  topic: string;
  keywords: string[];
  content: string;
  source: string;
  category: string;
}

const MAX_RESULTS = 8;
const MAX_CONTEXT_CHARS = 12_000;
const MIN_SCORE = 4;
const MIN_TOKEN_LENGTH = 3;

const STOP_WORDS = new Set([
  // German
  "der", "die", "das", "ein", "eine", "und", "oder", "ist", "sind", "war",
  "wie", "was", "wer", "den", "dem", "des", "von", "für", "mit", "auf",
  "bei", "nach", "über", "unter", "sich", "auch", "noch", "nur", "aber",
  "wenn", "dass", "wird", "hat", "haben", "kann", "sein", "wird", "alle",
  "bitte", "welche", "welcher", "welches", "gibt", "gibt's", "muss",
  // English
  "the", "and", "for", "with", "from", "that", "this", "which", "are",
  "not", "can", "has", "have", "been", "was", "were", "will", "into",
  // French
  "le", "la", "les", "un", "une", "des", "du", "de", "et", "ou", "est", "sont",
  "dans", "pour", "avec", "sur", "par", "que", "qui", "ne", "pas", "plus",
  "cette", "ces", "ses", "son", "leur", "leurs", "tout", "tous", "aussi",
  "comme", "mais", "donc", "car", "si", "quand", "dont", "où",
  "quel", "quelle", "quels", "quelles", "est-ce", "qu", "comment",
]);

/** DE/FR→EN medical term synonyms for cross-language retrieval */
const SYNONYMS: Record<string, string[]> = {
  endometriose: ["endometriosis", "endometrial"],
  schwangerschaft: ["pregnancy", "pregnant", "gravid"],
  ektope: ["ectopic"],
  eileiterschwangerschaft: ["ectopic", "pregnancy", "tubal"],
  gebärmutter: ["uterus", "uterine"],
  eierstock: ["ovary", "ovarian"],
  eierstockkrebs: ["ovarian", "cancer"],
  brustkrebs: ["breast", "cancer"],
  brust: ["breast"],
  gebärmutterhals: ["cervix", "cervical"],
  zervix: ["cervix", "cervical"],
  zervixkarzinom: ["cervical", "cancer", "carcinoma"],
  dysplasie: ["dysplasia"],
  fehlgeburt: ["miscarriage", "abortion", "spontaneous"],
  abtreibung: ["abortion", "induced", "termination"],
  myom: ["fibroid", "leiomyoma", "myoma"],
  tumor: ["tumor", "tumour", "neoplasm"],
  inkontinenz: ["incontinence"],
  harninkontinenz: ["urinary", "incontinence"],
  prolaps: ["prolapse", "descensus"],
  senkung: ["prolapse", "descensus", "pelvic"],
  vulva: ["vulvar", "vulva"],
  vagina: ["vaginal", "vagina"],
  krebs: ["cancer", "carcinoma", "malignancy"],
  karzinom: ["carcinoma", "cancer"],
  diagnose: ["diagnosis", "diagnostic"],
  behandlung: ["treatment", "therapy"],
  therapie: ["therapy", "treatment"],
  chirurgie: ["surgery", "surgical"],
  operation: ["surgery", "surgical", "operation"],
  staging: ["staging", "stage", "classification"],
  prognose: ["prognosis"],
  prävention: ["prevention", "screening"],
  screening: ["screening"],
  ultraschall: ["ultrasound", "sonography"],
  infekt: ["infection", "infectious"],
  infektion: ["infection"],
  harnwegsinfekt: ["urinary", "tract", "infection"],
  psychosomatik: ["psychosomatic", "psychosomatics"],
  senologie: ["senology", "breast"],
  tumormarker: ["tumor", "marker"],
  malformation: ["malformation", "anomaly"],
  endometrium: ["endometrial", "endometrium"],
  onkologie: ["oncology"],
  laparoskopie: ["laparoscopy", "laparoscopic"],
  hysterektomie: ["hysterectomy"],
  weiterbildung: ["training", "education"],
  facharzt: ["specialist", "board"],
  prüfung: ["exam", "examination"],
  lernplan: ["training", "plan", "curriculum"],
  // French → English
  endométriose: ["endometriosis", "endometrial"],
  grossesse: ["pregnancy", "pregnant", "gravid"],
  ectopique: ["ectopic"],
  utérus: ["uterus", "uterine"],
  ovaire: ["ovary", "ovarian"],
  col: ["cervix", "cervical"],
  sein: ["breast"],
  fibrome: ["fibroid", "leiomyoma", "myoma"],
  myome: ["fibroid", "leiomyoma", "myoma"],
  incontinence: ["incontinence", "urinary"],
  prolapsus: ["prolapse", "descensus"],
  vulvaire: ["vulvar", "vulva"],
  vaginale: ["vaginal", "vagina"],
  diagnostic: ["diagnosis", "diagnostic"],
  traitement: ["treatment", "therapy"],
  stadification: ["staging", "stage", "classification"],
  pronostic: ["prognosis"],
  prévention: ["prevention", "screening"],
  échographie: ["ultrasound", "sonography"],
  infection: ["infection", "infectious"],
  psychosomatique: ["psychosomatic", "psychosomatics"],
  marqueurs: ["marker", "tumor"],
  hystérectomie: ["hysterectomy"],
  laparoscopie: ["laparoscopy", "laparoscopic"],
  fausse: ["miscarriage", "abortion", "spontaneous"],
  avortement: ["abortion", "induced", "termination"],
  cancer: ["cancer", "carcinoma", "malignancy"],
};

function expandQuery(tokens: string[]): string[] {
  const expanded = [...tokens];
  for (const token of tokens) {
    // Try exact match first, then try without trailing 's'/'es' for French/German plurals
    const synonyms =
      SYNONYMS[token] ??
      (token.endsWith("es") ? SYNONYMS[token.slice(0, -2)] : undefined) ??
      (token.endsWith("s") ? SYNONYMS[token.slice(0, -1)] : undefined);
    if (synonyms) expanded.push(...synonyms);
  }
  return expanded;
}

export function getRelevantContext(query: string): FmhEntry[] {
  const normalised = query.toLowerCase();

  const rawTokens = normalised
    .split(/[\s,.\-:;!?()\u0027\u2019]+/)
    .filter((t) => t.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(t));

  const tokens = expandQuery(rawTokens);

  const scored = (fmhData as FmhEntry[])
    .map((entry) => {
      let score = 0;

      // 1. Entry keywords matched by expanded query tokens
      for (const kw of entry.keywords) {
        const kwLower = kw.toLowerCase();
        for (const token of tokens) {
          if (kwLower === token) score += 3;
          else if (kwLower.includes(token) || token.includes(kwLower))
            score += 1;
        }
      }

      // 2. Topic matches (high value)
      const topicLower = entry.topic.toLowerCase();
      for (const token of tokens) {
        if (topicLower.includes(token)) score += 4;
      }

      // 3. Content substring match for remaining query words (low weight)
      const contentLower = entry.content.toLowerCase();
      for (const token of rawTokens) {
        if (contentLower.includes(token)) score += 1;
      }

      return { entry, score };
    })
    .filter(({ score }) => score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);

  const results: FmhEntry[] = [];
  let totalChars = 0;

  for (const { entry } of scored) {
    if (results.length >= MAX_RESULTS) break;
    if (totalChars + entry.content.length > MAX_CONTEXT_CHARS) break;
    results.push(entry);
    totalChars += entry.content.length;
  }

  return results;
}
