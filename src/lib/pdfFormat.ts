// Utilities for generating PDFs with jsPDF.
// Keep formatting predictable across browsers and fonts.

/**
 * Formats an amount using regular ASCII spaces as thousand separators.
 * Avoids non‑breaking spaces that can render as odd glyphs in some PDF viewers.
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
