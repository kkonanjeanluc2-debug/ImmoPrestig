import { useMemo } from "react";
import { useAgencySubscription } from "./useAgencySubscription";

// Feature keys that map to subscription plan features
export type FeatureKey = 
  | "ventes_immobilieres"
  | "achats_immobiliers"
  | "lotissement"
  | "rappels_sms"
  | "rappels_automatiques"
  | "quittances_personnalisees"
  | "rapports_avances"
  | "support_prioritaire"
  | "support_dedie"
  | "formation_personnalisee"
  | "assistant_ia"
  | "gestion_impayes"
  | "apporteurs_affaires";

// Map feature keys to exact strings that appear in subscription_plans.features
// Matching is done with exact equality (case-insensitive) to avoid false positives
const FEATURE_MAPPING: Record<FeatureKey, string[]> = {
  ventes_immobilieres: ["Ventes immobilières", "Ventes et Achats immobiliers", "CRM immobiliers"],
  achats_immobiliers: ["Achats immobiliers", "Ventes et Achats immobiliers", "CRM immobiliers"],
  lotissement: ["Lotissement", "Gestion des lotissements"],
  rappels_sms: ["Rappels SMS & Email", "Rappels SMS", "Rappels Whatsapp & Email", "Rappels WhatsApp & Email"],
  rappels_automatiques: ["Rappels automatiques", "Planification des automatisations"],
  quittances_personnalisees: ["Quittances personnalisées"],
  rapports_avances: ["Rapports avancés", "Rapports d'activité"],
  support_prioritaire: ["Support prioritaire", "Support dédié"],
  support_dedie: ["Support dédié"],
  formation_personnalisee: ["Formation personnalisée"],
  assistant_ia: ["Assistant IA"],
  gestion_impayes: ["Gestion des impayés", "Gestion des impayés & Procédure d'expulsion"],
  apporteurs_affaires: ["Gestion des Apporteurs d'affaires"],
};

// Plans that have all features by default (for display purposes)
const PLANS_WITH_ALL_FEATURES = ["Enterprise"];

// Define which plan level unlocks which features
const PLAN_FEATURE_LEVELS: Record<string, FeatureKey[]> = {
  "Gratuit": [],
  "Starter": ["rappels_automatiques", "assistant_ia", "gestion_impayes"],
  "Pro": ["rappels_automatiques", "rappels_sms", "quittances_personnalisees", "rapports_avances", "support_prioritaire", "ventes_immobilieres", "achats_immobiliers", "assistant_ia", "gestion_impayes"],
  "Premium": ["ventes_immobilieres", "achats_immobiliers", "lotissement", "rappels_sms", "rappels_automatiques", "quittances_personnalisees", "rapports_avances", "support_prioritaire", "support_dedie", "formation_personnalisee", "assistant_ia", "gestion_impayes"],
  "Prestige Max": ["ventes_immobilieres", "achats_immobiliers", "lotissement", "rappels_sms", "rappels_automatiques", "quittances_personnalisees", "rapports_avances", "support_prioritaire", "support_dedie", "formation_personnalisee", "assistant_ia", "gestion_impayes", "apporteurs_affaires"],
  "Enterprise": ["ventes_immobilieres", "achats_immobiliers", "lotissement", "rappels_sms", "rappels_automatiques", "quittances_personnalisees", "rapports_avances", "support_prioritaire", "support_dedie", "formation_personnalisee", "assistant_ia", "gestion_impayes", "apporteurs_affaires"],
};

export interface FeatureAccessResult {
  hasFeature: (feature: FeatureKey) => boolean;
  hasFeatureByName: (featureName: string) => boolean;
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
      if (PLANS_WITH_ALL_FEATURES.includes(planName)) return true;
      const featureStrings = FEATURE_MAPPING[feature];
      // Use exact equality (case-insensitive, trimmed) to avoid false positives
      return featureStrings.some(str => 
        planFeatures.some(pf => pf.trim().toLowerCase() === str.trim().toLowerCase())
      );
    };

    // Dynamic: check if a raw feature name string exists in the plan's features
    const hasFeatureByName = (featureName: string): boolean => {
      if (PLANS_WITH_ALL_FEATURES.includes(planName)) return true;
      return planFeatures.some(pf => pf.trim().toLowerCase() === featureName.trim().toLowerCase());
    };

    const requiredPlanForFeature = (feature: FeatureKey): string => {
      // Find the minimum plan that has this feature
      const planOrder = ["Gratuit", "Starter", "Pro", "Premium", "Prestige Max", "Enterprise"];
      for (const plan of planOrder) {
        if (PLAN_FEATURE_LEVELS[plan]?.includes(feature)) {
          return plan;
        }
      }
      return "Enterprise";
    };

    return {
      hasFeature,
      hasFeatureByName,
      isLoading,
      planName,
      planFeatures,
      requiredPlanForFeature,
    };
  }, [subscription, isLoading]);
}
