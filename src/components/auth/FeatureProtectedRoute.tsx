import { ReactNode, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureAccess, FeatureKey } from "@/hooks/useFeatureAccess";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FeatureProtectedRouteProps {
  feature: FeatureKey;
  children: ReactNode;
}

export function FeatureProtectedRoute({ feature, children }: FeatureProtectedRouteProps) {
  const navigate = useNavigate();
  const { hasFeature, isLoading, requiredPlanForFeature } = useFeatureAccess();
  const hasRedirected = useRef(false);

  // Persist feature access in sessionStorage so a page refresh doesn't trigger
  // a premature redirect before the subscription data reloads.
  const sessionKey = `_feat_ok_${feature}`;
  const wasAccessible = useRef(!!sessionStorage.getItem(sessionKey));

  const featureAllowed = hasFeature(feature);

  // Mark access as granted (in-memory + sessionStorage)
  useEffect(() => {
    if (!isLoading && featureAllowed) {
      sessionStorage.setItem(sessionKey, "1");
      wasAccessible.current = true;
    }
  }, [isLoading, featureAllowed, sessionKey]);

  // Redirect only when we're certain access is denied and it was never granted this session
  useEffect(() => {
    if (!isLoading && !featureAllowed && !hasRedirected.current && !wasAccessible.current) {
      hasRedirected.current = true;
      sessionStorage.removeItem(sessionKey); // Clean up stale flag if any
      const requiredPlan = requiredPlanForFeature(feature);
      toast.error(`Fonctionnalité non disponible`, {
        description: `Cette fonctionnalité nécessite le forfait ${requiredPlan} ou supérieur.`,
        action: {
          label: "Voir les forfaits",
          onClick: () => navigate("/settings?tab=subscription"),
        },
      });
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, featureAllowed, feature, navigate, requiredPlanForFeature, sessionKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!featureAllowed && !wasAccessible.current) {
    return null;
  }

  return <>{children}</>;
}
