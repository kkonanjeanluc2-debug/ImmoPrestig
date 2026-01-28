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
