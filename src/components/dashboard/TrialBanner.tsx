import { useAgencySubscription } from "@/hooks/useAgencySubscription";
import { useNavigate } from "react-router-dom";
import { Clock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";

export function TrialBanner() {
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useAgencySubscription();

  const daysRemaining = useMemo(() => {
    if (!subscription) return null;
    
    // Show for trial status
    if (subscription.status === "trial" && subscription.trial_ends_at) {
      return differenceInDays(parseISO(subscription.trial_ends_at), new Date());
    }
    
    // Show for active subscriptions expiring within 5 days
    if (subscription.status === "active" && subscription.ends_at) {
      const days = differenceInDays(parseISO(subscription.ends_at), new Date());
      if (days <= 5) return days;
    }
    
    return null;
  }, [subscription]);

  if (isLoading || daysRemaining === null) return null;

  const isTrial = subscription?.status === "trial";
  const isExpired = daysRemaining <= 0;

  const message = isTrial
    ? isExpired
      ? "Votre période d'essai est terminée. Choisissez un forfait pour continuer."
      : `Période d'essai : ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} restant${daysRemaining > 1 ? "s" : ""}. Choisissez un forfait pour continuer après l'essai.`
    : isExpired
      ? "Votre abonnement a expiré. Renouvelez-le pour continuer."
      : `Votre abonnement expire dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}. Pensez à le renouveler.`;

  return (
    <div className={`${isExpired ? "bg-destructive border-destructive" : "bg-amber-500 border-amber-600"} border-2 rounded-xl px-5 sm:px-6 py-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg`}>
      <div className="bg-white/20 rounded-full p-2 shrink-0">
        <Clock className="h-6 w-6 text-white" />
      </div>
      <p className="text-base sm:text-lg text-white font-semibold flex-1">
        {message}
      </p>
      <Button
        size="lg"
        onClick={() => navigate("/settings?tab=subscription")}
        className="shrink-0 gap-2 bg-white text-foreground hover:bg-white/90 font-semibold shadow-md"
      >
        <Crown className="h-4 w-4" />
        Choisir un forfait
      </Button>
    </div>
  );
}
