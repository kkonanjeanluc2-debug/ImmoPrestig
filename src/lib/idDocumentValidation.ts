export type IdDocType = "cni" | "passeport" | "permis" | "extrait" | "carte_consulaire";

interface Rule {
  label: string;
  pattern: RegExp;
  minLength: number;
  maxLength: number;
  hint: string;
  // Allowed characters used to filter live input
  allowedChars: RegExp;
  transform?: (v: string) => string;
}

export const ID_DOC_RULES: Record<IdDocType, Rule> = {
  cni: {
    label: "N° CNI",
    // CI + 7 to 13 digits (ex: CI1234567)
    pattern: /^CI\d{7,13}$/,
    minLength: 9,
    maxLength: 15,
    hint: "Format CNI: CI suivi de 7 à 13 chiffres (ex: CI1234567)",
    allowedChars: /[^A-Za-z0-9]/g,
    transform: (v) => v.toUpperCase(),
  },
  passeport: {
    label: "N° Passeport",
    // 2 digits + 2 letters + 5 digits (ex: 23AA12345)
    pattern: /^\d{2}[A-Z]{2}\d{5}$/,
    minLength: 9,
    maxLength: 9,
    hint: "Format Passeport: 2 chiffres + 2 lettres + 5 chiffres (ex: 23AA12345)",
    allowedChars: /[^A-Za-z0-9]/g,
    transform: (v) => v.toUpperCase(),
  },
  permis: {
    label: "N° Permis de conduire",
    // PC + 7 digits or 7-12 alphanumeric
    pattern: /^[A-Z0-9]{6,12}$/,
    minLength: 6,
    maxLength: 12,
    hint: "Format Permis: 6 à 12 caractères alphanumériques (ex: PC0123456)",
    allowedChars: /[^A-Za-z0-9]/g,
    transform: (v) => v.toUpperCase(),
  },
  extrait: {
    label: "N° Extrait de naissance",
    // Numero d'acte: digits/letters/separators
    pattern: /^[A-Z0-9/\-]{3,30}$/,
    minLength: 3,
    maxLength: 30,
    hint: "N° d'extrait: 3 à 30 caractères (chiffres, lettres, / et -)",
    allowedChars: /[^A-Za-z0-9/\-]/g,
    transform: (v) => v.toUpperCase(),
  },
  carte_consulaire: {
    label: "N° Carte consulaire",
    pattern: /^[A-Z0-9]{5,20}$/,
    minLength: 5,
    maxLength: 20,
    hint: "N° Carte consulaire: 5 à 20 caractères alphanumériques",
    allowedChars: /[^A-Za-z0-9]/g,
    transform: (v) => v.toUpperCase(),
  },
};

/** Sanitize a raw input for the given doc type (strip disallowed chars, uppercase, trim max). */
export function sanitizeIdNumber(type: IdDocType, value: string): string {
  const rule = ID_DOC_RULES[type];
  let v = (value || "").replace(rule.allowedChars, "");
  if (rule.transform) v = rule.transform(v);
  if (v.length > rule.maxLength) v = v.slice(0, rule.maxLength);
  return v;
}

/** Returns null if valid, or an error message. Empty string returns null (let caller decide if required). */
export function validateIdNumber(type: IdDocType, value: string): string | null {
  const v = (value || "").trim();
  if (!v) return null;
  const rule = ID_DOC_RULES[type];
  if (v.length < rule.minLength) {
    return `${rule.label}: minimum ${rule.minLength} caractères`;
  }
  if (v.length > rule.maxLength) {
    return `${rule.label}: maximum ${rule.maxLength} caractères`;
  }
  if (!rule.pattern.test(v)) {
    return rule.hint;
  }
  return null;
}
