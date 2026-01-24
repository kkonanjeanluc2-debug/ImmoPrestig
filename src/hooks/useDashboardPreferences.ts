import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type WidgetId = 
  | "stats"
  | "revenue-trend"
  | "late-analysis"
  | "property-performance"
  | "occupancy"
  | "property-types"
  | "recent-payments"
  | "recent-activity"
  | "property-map"
  | "kpi-roi"
  | "kpi-recovery"
  | "kpi-vacancy"
  | "kpi-delay"
  | "commission-evolution";

export type PeriodFilter = "month" | "quarter" | "year";

export interface DashboardPreferences {
  visibleWidgets: WidgetId[];
  widgetOrder: WidgetId[];
  period: PeriodFilter;
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  visibleWidgets: [
    "stats",
    "revenue-trend",
    "late-analysis",
    "property-performance",
    "occupancy",
    "property-types",
    "recent-payments",
    "recent-activity",
    "property-map",
    "kpi-roi",
    "kpi-recovery",
    "kpi-vacancy",
    "kpi-delay",
    "commission-evolution",
  ],
  widgetOrder: [
    "stats",
    "kpi-roi",
    "kpi-recovery",
    "kpi-vacancy",
    "kpi-delay",
    "property-map",
    "revenue-trend",
    "commission-evolution",
    "late-analysis",
    "property-performance",
    "occupancy",
    "property-types",
    "recent-payments",
    "recent-activity",
  ],
  period: "month",
};

export const WIDGET_LABELS: Record<WidgetId, string> = {
  stats: "Statistiques principales",
  "revenue-trend": "Tendances revenus/dépenses",
  "late-analysis": "Analyse des retards",
  "property-performance": "Performance par bien",
  occupancy: "Taux d'occupation",
  "property-types": "Types de biens",
  "recent-payments": "Paiements récents",
  "recent-activity": "Activité récente",
  "property-map": "Carte des biens",
  "kpi-roi": "ROI par propriété",
  "kpi-recovery": "Taux de recouvrement",
  "kpi-vacancy": "Vacance locative",
  "kpi-delay": "Délai moyen de paiement",
  "commission-evolution": "Évolution des commissions",
};

export function useDashboardPreferences() {
  const { user } = useAuth();
  const storageKey = user ? `dashboard-prefs-${user.id}` : "dashboard-prefs-guest";

  const [preferences, setPreferences] = useState<DashboardPreferences>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Error loading dashboard preferences:", e);
    }
    return DEFAULT_PREFERENCES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch (e) {
      console.error("Error saving dashboard preferences:", e);
    }
  }, [preferences, storageKey]);

  const toggleWidget = (widgetId: WidgetId) => {
    setPreferences((prev) => ({
      ...prev,
      visibleWidgets: prev.visibleWidgets.includes(widgetId)
        ? prev.visibleWidgets.filter((id) => id !== widgetId)
        : [...prev.visibleWidgets, widgetId],
    }));
  };

  const updateOrder = (newOrder: WidgetId[]) => {
    setPreferences((prev) => ({
      ...prev,
      widgetOrder: newOrder,
    }));
  };

  const setPeriod = (period: PeriodFilter) => {
    setPreferences((prev) => ({
      ...prev,
      period,
    }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  return {
    preferences,
    toggleWidget,
    updateOrder,
    setPeriod,
    resetPreferences,
    isVisible: (widgetId: WidgetId) => preferences.visibleWidgets.includes(widgetId),
  };
}
