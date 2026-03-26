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
  const wasAccessible = useRef(false);

  const featureAllowed = hasFeature(feature);

  // Track if feature was initially accessible to prevent redirect on refetch glitches
  useEffect(() => {
    if (!isLoading && featureAllowed) {
      wasAccessible.current = true;
    }
  }, [isLoading, featureAllowed]);

  useEffect(() => {
    if (!isLoading && !featureAllowed && !hasRedirected.current && !wasAccessible.current) {
      hasRedirected.current = true;
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
  }, [isLoading, featureAllowed, feature, navigate, requiredPlanForFeature]);

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
