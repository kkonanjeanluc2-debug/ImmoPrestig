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
    <div className={`${isTrial ? "bg-primary/10 border-primary/30" : "bg-destructive/10 border-destructive/30"} border rounded-lg px-3 sm:px-4 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300`}>
      <Clock className={`h-4 w-4 ${isTrial ? "text-primary" : "text-destructive"} shrink-0`} />
      <p className={`text-sm ${isTrial ? "text-primary" : "text-destructive"} font-medium flex-1`}>
        {message}
      </p>
      <Button
        size="sm"
        variant={isTrial ? "default" : "destructive"}
        onClick={() => navigate("/settings?tab=subscription")}
        className="shrink-0 gap-1.5"
      >
        <Crown className="h-3.5 w-3.5" />
        Choisir un forfait
      </Button>
    </div>
  );
}
