import { useAgencySubscription } from "@/hooks/useAgencySubscription";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";

export function SubscriptionExpiryBanner() {
  const navigate = useNavigate();
  const { data: subscription, isLoading: subLoading } = useAgencySubscription();
  const { data: userRole, isLoading: roleLoading } = useCurrentUserRole();
  const [dismissed, setDismissed] = useState(false);

  const daysRemaining = useMemo(() => {
    if (!subscription?.ends_at) return null;
    return differenceInDays(parseISO(subscription.ends_at), new Date());
  }, [subscription?.ends_at]);

  if (subLoading || roleLoading || dismissed) return null;

  // Only show for admin users
  const isAdmin = userRole?.role === "admin";
  if (!isAdmin) return null;

  // Only show if subscription exists, is active, and expires within 5 days
  if (!subscription || subscription.status !== "active") return null;
  if (daysRemaining === null || daysRemaining > 5) return null;

  const isExpired = daysRemaining <= 0;
  const message = isExpired
    ? "Votre abonnement a expiré. Renouvelez-le pour continuer à utiliser toutes les fonctionnalités."
    : `Votre abonnement expire dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}. Renouvelez-le pour éviter toute interruption.`;

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 sm:p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
      <p className="text-sm text-destructive font-medium flex-1">
        {message}
      </p>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => navigate("/settings?tab=subscription")}
        className="shrink-0"
      >
        Renouveler
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="text-destructive/60 hover:text-destructive transition-colors shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
