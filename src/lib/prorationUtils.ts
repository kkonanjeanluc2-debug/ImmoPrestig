/**
 * Utilitaires pour le calcul au prorata des changements d'abonnement
 */

export interface ProrationResult {
  /** Jours restants sur l'abonnement actuel */
  remainingDays: number;
  /** Nombre total de jours de la période actuelle */
  totalDays: number;
  /** Crédit au prorata de l'abonnement actuel (montant à déduire) */
  currentPlanCredit: number;
  /** Coût au prorata du nouveau forfait pour les jours restants */
  newPlanProrataCost: number;
  /** Montant final à payer (peut être négatif = crédit) */
  amountDue: number;
  /** Pourcentage de la période restante */
  remainingPercentage: number;
  /** Description lisible du calcul */
  description: string;
}

/**
 * Calcule le montant au prorata pour un changement de forfait
 * 
 * @param currentPlanPrice - Prix du forfait actuel (mensuel ou annuel selon cycle)
 * @param newPlanPrice - Prix du nouveau forfait (mensuel ou annuel selon cycle)
 * @param subscriptionStartDate - Date de début de l'abonnement actuel
 * @param subscriptionEndDate - Date de fin de l'abonnement actuel (si applicable)
 * @param billingCycle - Cycle de facturation ("monthly" | "yearly")
 * @returns ProrationResult - Détails du calcul au prorata
 */
export function calculateProration(
  currentPlanPrice: number,
  newPlanPrice: number,
  subscriptionStartDate: Date,
  subscriptionEndDate: Date | null,
  billingCycle: "monthly" | "yearly"
): ProrationResult {
  const now = new Date();
  
  // Si pas de date de fin, calculer basé sur le cycle
  let endDate = subscriptionEndDate;
  if (!endDate) {
    endDate = new Date(subscriptionStartDate);
    if (billingCycle === "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
  }

  // Calcul des jours
  const startMs = subscriptionStartDate.getTime();
  const endMs = endDate.getTime();
  const nowMs = now.getTime();

  const totalMs = endMs - startMs;
  const remainingMs = Math.max(0, endMs - nowMs);

  const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

  // Éviter division par zéro
  if (totalDays <= 0 || remainingDays <= 0) {
    return {
      remainingDays: 0,
      totalDays,
      currentPlanCredit: 0,
      newPlanProrataCost: newPlanPrice,
      amountDue: newPlanPrice,
      remainingPercentage: 0,
      description: "L'abonnement actuel est expiré. Le nouveau forfait sera facturé en totalité.",
    };
  }

  const remainingPercentage = (remainingDays / totalDays) * 100;
  
  // Calcul du crédit pour le temps restant sur l'ancien forfait
  const dailyRateCurrent = currentPlanPrice / totalDays;
  const currentPlanCredit = Math.round(dailyRateCurrent * remainingDays);

  // Calcul du coût au prorata pour le nouveau forfait
  const dailyRateNew = newPlanPrice / totalDays;
  const newPlanProrataCost = Math.round(dailyRateNew * remainingDays);

  // Montant final = coût du nouveau - crédit de l'ancien
  const amountDue = newPlanProrataCost - currentPlanCredit;

  // Générer une description
  let description: string;
  if (amountDue > 0) {
    description = `Vous avez ${remainingDays} jours restants. Crédit: ${formatCurrency(currentPlanCredit)}. Coût prorata nouveau forfait: ${formatCurrency(newPlanProrataCost)}. Total à payer: ${formatCurrency(amountDue)}.`;
  } else if (amountDue < 0) {
    description = `Vous avez ${remainingDays} jours restants. Un crédit de ${formatCurrency(Math.abs(amountDue))} sera appliqué à votre compte.`;
  } else {
    description = `Vous avez ${remainingDays} jours restants. Aucun montant supplémentaire dû.`;
  }

  return {
    remainingDays,
    totalDays,
    currentPlanCredit,
    newPlanProrataCost,
    amountDue,
    remainingPercentage,
    description,
  };
}

/**
 * Formate un montant en XOF
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-CI", {
    style: "decimal",
    minimumFractionDigits: 0,
  }).format(Math.abs(amount)) + " XOF";
}

/**
 * Formate le résultat au prorata pour affichage
 */
export function formatProrationSummary(proration: ProrationResult): {
  isCredit: boolean;
  displayAmount: string;
  summary: string;
} {
  const isCredit = proration.amountDue < 0;
  const displayAmount = formatCurrency(proration.amountDue);
  
  let summary: string;
  if (proration.amountDue > 0) {
    summary = `Montant au prorata à payer pour les ${proration.remainingDays} jours restants`;
  } else if (proration.amountDue < 0) {
    summary = `Crédit pour les ${proration.remainingDays} jours restants (applicable sur prochaine facture)`;
  } else {
    summary = `Aucun ajustement pour les ${proration.remainingDays} jours restants`;
  }

  return {
    isCredit,
    displayAmount,
    summary,
  };
}
