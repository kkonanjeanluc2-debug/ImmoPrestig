/**
 * Billing cycle types and utilities
 */

export type BillingCycle = "monthly" | "quarterly" | "semi_annual" | "yearly";

export const billingCycleLabels: Record<BillingCycle, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  semi_annual: "Semestriel",
  yearly: "Annuel",
};

export const billingCyclePeriodLabels: Record<BillingCycle, string> = {
  monthly: "mois",
  quarterly: "trimestre",
  semi_annual: "semestre",
  yearly: "an",
};

export const billingCycleMonths: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  yearly: 12,
};

export interface PlanWithPrices {
  price_monthly: number;
  price_quarterly: number;
  price_semi_annual: number;
  price_yearly: number;
}

/**
 * Get the price for a specific billing cycle from a plan
 */
export function getPriceForCycle(plan: PlanWithPrices, cycle: BillingCycle): number {
  switch (cycle) {
    case "monthly": return plan.price_monthly;
    case "quarterly": return plan.price_quarterly;
    case "semi_annual": return plan.price_semi_annual;
    case "yearly": return plan.price_yearly;
    default: return plan.price_monthly;
  }
}

/**
 * Calculate savings percentage compared to monthly pricing
 */
export function getSavingsPercent(plan: PlanWithPrices, cycle: BillingCycle): number {
  if (cycle === "monthly" || plan.price_monthly === 0) return 0;
  const months = billingCycleMonths[cycle];
  const monthlyTotal = plan.price_monthly * months;
  const cyclePrice = getPriceForCycle(plan, cycle);
  if (monthlyTotal === 0) return 0;
  return Math.round((1 - cyclePrice / monthlyTotal) * 100);
}
