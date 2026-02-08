import { useMemo } from "react";
import { useAgencySubscription } from "./useAgencySubscription";

// Feature keys that map to subscription plan features
export type FeatureKey = 
  | "ventes_immobilieres"
  | "lotissement"
  | "rappels_sms"
  | "rappels_automatiques"
  | "quittances_personnalisees"
  | "rapports_avances"
  | "support_prioritaire"
  | "support_dedie"
  | "formation_personnalisee";

// Map feature keys to strings that appear in subscription_plans.features
const FEATURE_MAPPING: Record<FeatureKey, string[]> = {
  ventes_immobilieres: ["Ventes immobilières", "ventes immobilieres", "Toutes les fonctionnalités"],
  lotissement: ["Lotissement", "lotissement", "Toutes les fonctionnalités"],
  rappels_sms: ["Rappels SMS & Email", "Rappels SMS", "rappels sms", "Rappels Whatsapp & Email", "Toutes les fonctionnalités"],
  rappels_automatiques: ["Rappels automatiques", "Rappels SMS & Email", "Rappels Whatsapp & Email", "Planification des automatisations", "Toutes les fonctionnalités"],
  quittances_personnalisees: ["Quittances personnalisées", "quittances personnalisees", "Toutes les fonctionnalités"],
  rapports_avances: ["Rapports avancés", "rapports avances", "Toutes les fonctionnalités"],
  support_prioritaire: ["Support prioritaire", "Support dédié", "Toutes les fonctionnalités"],
  support_dedie: ["Support dédié", "Toutes les fonctionnalités"],
  formation_personnalisee: ["Formation personnalisée", "Toutes les fonctionnalités"],
};

// Plans that have all features by default (for display purposes)
const PLANS_WITH_ALL_FEATURES = ["Enterprise"];

// Define which plan level unlocks which features
const PLAN_FEATURE_LEVELS: Record<string, FeatureKey[]> = {
  "Gratuit": [],
  "Starter": ["rappels_automatiques"],
  "Pro": ["rappels_automatiques", "rappels_sms", "quittances_personnalisees", "rapports_avances", "support_prioritaire", "ventes_immobilieres"],
  "Enterprise": ["ventes_immobilieres", "lotissement", "rappels_sms", "rappels_automatiques", "quittances_personnalisees", "rapports_avances", "support_prioritaire", "support_dedie", "formation_personnalisee"],
};

export interface FeatureAccessResult {
  hasFeature: (feature: FeatureKey) => boolean;
  isLoading: boolean;
  planName: string;
  planFeatures: string[];
  requiredPlanForFeature: (feature: FeatureKey) => string;
}

export function useFeatureAccess(): FeatureAccessResult {
  const { data: subscription, isLoading } = useAgencySubscription();

  return useMemo(() => {
    const planName = subscription?.plan?.name ?? "Gratuit";
    const planFeatures = (subscription?.plan?.features as string[]) ?? [];

    const hasFeature = (feature: FeatureKey): boolean => {
      // Enterprise plan has all features
      if (PLANS_WITH_ALL_FEATURES.includes(planName)) {
        return true;
      }

      // Check if feature is in plan's feature list
      const featureStrings = FEATURE_MAPPING[feature];
      return featureStrings.some(str => 
        planFeatures.some(pf => pf.toLowerCase().includes(str.toLowerCase()))
      );
    };

    const requiredPlanForFeature = (feature: FeatureKey): string => {
      // Find the minimum plan that has this feature
      const planOrder = ["Gratuit", "Starter", "Pro", "Enterprise"];
      for (const plan of planOrder) {
        if (PLAN_FEATURE_LEVELS[plan]?.includes(feature)) {
          return plan;
        }
      }
      return "Enterprise";
    };

    return {
      hasFeature,
      isLoading,
      planName,
      planFeatures,
      requiredPlanForFeature,
    };
  }, [subscription, isLoading]);
}
