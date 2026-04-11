export const CARD_ACCENTS = [
  "#818CF8",
  "#F472B6",
  "#34D399",
  "#FBBF24",
  "#60A5FA",
  "#F87171",
  "#A78BFA",
  "#2DD4BF",
  "#FB923C",
  "#94A3B8",
];

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function sanitizeContent(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\uFFFD/g, "")
    .replace(/\u25A1/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/[\uE000-\uF8FF]/g, "")
    .trim();
}
