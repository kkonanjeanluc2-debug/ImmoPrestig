import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureAccess, FeatureKey } from "@/hooks/useFeatureAccess";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
}

const FEATURE_LABELS: Record<FeatureKey, { title: string; description: string }> = {
  ventes_immobilieres: {
    title: "Ventes Immobilières",
    description: "Gérez vos biens à vendre, suivez les transactions et les paiements échelonnés.",
  },
  lotissement: {
    title: "Lotissements",
    description: "Gérez vos lotissements, parcelles et ventes de terrains.",
  },
  rappels_sms: {
    title: "Rappels SMS",
    description: "Envoyez des rappels de paiement par SMS à vos locataires.",
  },
  rappels_automatiques: {
    title: "Rappels automatiques",
    description: "Automatisez l'envoi de rappels de paiement à vos locataires.",
  },
  quittances_personnalisees: {
    title: "Quittances personnalisées",
    description: "Personnalisez le design et le contenu de vos quittances de loyer.",
  },
  rapports_avances: {
    title: "Rapports avancés",
    description: "Accédez à des rapports détaillés sur vos performances.",
  },
  support_prioritaire: {
    title: "Support prioritaire",
    description: "Bénéficiez d'un support client prioritaire.",
  },
  support_dedie: {
    title: "Support dédié",
    description: "Un gestionnaire de compte dédié pour vous accompagner.",
  },
  formation_personnalisee: {
    title: "Formation personnalisée",
    description: "Une formation sur mesure pour maîtriser toutes les fonctionnalités.",
  },
};

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const navigate = useNavigate();
  const { hasFeature, isLoading, planName, requiredPlanForFeature } = useFeatureAccess();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Skeleton className="h-64 w-full max-w-md" />
      </div>
    );
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const requiredPlan = requiredPlanForFeature(feature);
  const featureInfo = FEATURE_LABELS[feature];

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full border-primary/20 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Fonctionnalité Premium
          </CardTitle>
          <CardDescription className="text-base">
            Cette fonctionnalité n'est pas disponible avec votre forfait actuel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">{featureInfo.title}</h3>
            <p className="text-muted-foreground">{featureInfo.description}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Votre forfait actuel</span>
              <span className="font-medium">{planName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Forfait requis</span>
              <span className="font-medium text-primary">{requiredPlan} ou supérieur</span>
            </div>
          </div>

          <Button 
            className="w-full gap-2" 
            size="lg"
            onClick={() => navigate("/settings?tab=subscription")}
          >
            <Crown className="h-4 w-4" />
            Passer au forfait {requiredPlan}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Débloquez cette fonctionnalité et bien plus encore avec un forfait supérieur
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook version for conditional rendering in components
export function useFeatureGate(feature: FeatureKey) {
  const { hasFeature, isLoading, planName, requiredPlanForFeature } = useFeatureAccess();
  
  return {
    hasAccess: hasFeature(feature),
    isLoading,
    planName,
    requiredPlan: requiredPlanForFeature(feature),
  };
}
