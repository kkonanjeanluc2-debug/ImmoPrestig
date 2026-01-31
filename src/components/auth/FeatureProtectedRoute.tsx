import { ReactNode, useEffect } from "react";
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

  useEffect(() => {
    if (!isLoading && !hasFeature(feature)) {
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
  }, [isLoading, hasFeature, feature, navigate, requiredPlanForFeature]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasFeature(feature)) {
    return null; // Will be redirected by useEffect
  }

  return <>{children}</>;
}
