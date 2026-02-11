export interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

export const passwordRules: PasswordRule[] = [
  { label: "8 caractères minimum", test: (p) => p.length >= 8 },
  { label: "Au moins une lettre majuscule (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "Au moins une lettre minuscule (a-z)", test: (p) => /[a-z]/.test(p) },
  { label: "Au moins un chiffre (0-9)", test: (p) => /[0-9]/.test(p) },
  { label: "Au moins un caractère spécial (!@#$%^&*...)", test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors = passwordRules
    .filter((rule) => !rule.test(password))
    .map((rule) => rule.label);
  return { valid: errors.length === 0, errors };
}

export function getPasswordStrength(password: string): "weak" | "medium" | "strong" | "very-strong" {
  const passed = passwordRules.filter((rule) => rule.test(password)).length;
  if (passed <= 2) return "weak";
  if (passed <= 3) return "medium";
  if (passed <= 4) return "strong";
  return "very-strong";
}

export const strengthColors: Record<ReturnType<typeof getPasswordStrength>, string> = {
  weak: "bg-red-500",
  medium: "bg-orange-500",
  strong: "bg-yellow-500",
  "very-strong": "bg-emerald-500",
};

export const strengthLabels: Record<ReturnType<typeof getPasswordStrength>, string> = {
  weak: "Faible",
  medium: "Moyen",
  strong: "Fort",
  "very-strong": "Très fort",
};
