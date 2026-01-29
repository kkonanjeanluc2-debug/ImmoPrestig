// Utilities for generating PDFs with jsPDF.
// Keep formatting predictable across browsers and fonts.

/**
 * Formats an amount using regular ASCII spaces as thousand separators.
 * Avoids non-breaking spaces that can render as odd glyphs in some PDF viewers.
 * Returns format: "1 500 000" (without currency suffix)
 */
export const formatAmountForPDF = (amount: number): string => {
  const str = Math.floor(amount).toString();
  const parts: string[] = [];

  for (let i = str.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    parts.unshift(str.slice(start, i));
  }

  return parts.join(" ");
};

/**
 * Formats an amount with F CFA suffix for display in PDFs.
 * Returns format: "1 500 000F CFA"
 */
export const formatAmountWithCurrency = (amount: number): string => {
  return `${formatAmountForPDF(amount)}F CFA`;
};

/**
 * Converts a number to French words for PDF display.
 * Handles numbers up to billions without using special characters.
 */
export const numberToWordsPDF = (num: number): string => {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
  
  if (num === 0) return "zero";
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (t === 7 || t === 9) {
      return tens[t - 1] + "-" + teens[u];
    }
    return tens[t] + (u > 0 ? "-" + units[u] : "");
  }
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    const prefix = h === 1 ? "cent" : units[h] + " cent";
    return prefix + (rest > 0 ? " " + numberToWordsPDF(rest) : "");
  }
  if (num < 1000000) {
    const t = Math.floor(num / 1000);
    const rest = num % 1000;
    const prefix = t === 1 ? "mille" : numberToWordsPDF(t) + " mille";
    return prefix + (rest > 0 ? " " + numberToWordsPDF(rest) : "");
  }
  if (num < 1000000000) {
    const m = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const prefix = m === 1 ? "un million" : numberToWordsPDF(m) + " millions";
    return prefix + (rest > 0 ? " " + numberToWordsPDF(rest) : "");
  }
  // For billions
  const b = Math.floor(num / 1000000000);
  const rest = num % 1000000000;
  const prefix = b === 1 ? "un milliard" : numberToWordsPDF(b) + " milliards";
  return prefix + (rest > 0 ? " " + numberToWordsPDF(rest) : "");
};

/**
 * Formats currency for display (not PDF-specific).
 * Returns format: "1 500 000 FCFA"
 */
export const formatCurrency = (amount: number): string => {
  return `${formatAmountForPDF(amount)} FCFA`;
};
