import { passwordRules, getPasswordStrength, strengthColors, strengthLabels } from "@/lib/passwordValidation";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const passed = passwordRules.filter((r) => r.test(password)).length;
  const percentage = (passed / passwordRules.length) * 100;

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${strengthColors[strength]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${
          strength === "very-strong" ? "text-emerald-600" :
          strength === "strong" ? "text-yellow-600" :
          strength === "medium" ? "text-orange-600" : "text-red-600"
        }`}>
          {strengthLabels[strength]}
        </span>
      </div>

      {/* Rules checklist */}
      <ul className="space-y-1">
        {passwordRules.map((rule, i) => {
          const passes = rule.test(password);
          return (
            <li key={i} className={`flex items-center gap-1.5 text-xs ${passes ? "text-emerald-600" : "text-muted-foreground"}`}>
              {passes ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
