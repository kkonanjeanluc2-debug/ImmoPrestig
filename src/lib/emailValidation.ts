/**
 * Strict email validation using a comprehensive regex.
 * Checks for:
 * - Valid format (user@domain.tld)
 * - No spaces
 * - Valid domain with at least 2-char TLD
 * - No consecutive dots
 * - No special chars at start/end of local part
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;

  // RFC 5322 simplified but strict regex
  const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmed)) return false;

  // No consecutive dots
  if (/\.\./.test(trimmed)) return false;

  // Domain part validation
  const [, domain] = trimmed.split("@");
  if (!domain || domain.length > 253) return false;

  // Each domain label max 63 chars
  const labels = domain.split(".");
  if (labels.some((l) => l.length > 63 || l.length === 0)) return false;

  return true;
}

export const EMAIL_ERROR_MESSAGE = "Veuillez entrer une adresse email valide (ex: nom@domaine.com)";
