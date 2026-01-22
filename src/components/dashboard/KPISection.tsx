import { KPICard } from "./KPICard";
import { TrendingUp, Percent, Clock, Home } from "lucide-react";
import { PeriodFilter, WidgetId } from "@/hooks/useDashboardPreferences";

interface KPISectionProps {
  properties: Array<{
    id: string;
    price: number | string;
    status: string;
    created_at: string;
  }>;
  payments: Array<{
    amount: number | string;
    due_date: string;
    paid_date: string | null;
    status: string;
    tenant?: {
      property?: {
        id: string;
        price: number | string;
      } | null;
    } | null;
  }>;
  contracts: Array<{
    property_id: string;
    status: string;
    start_date: string;
    end_date: string;
  }>;
  period: PeriodFilter;
  visibleWidgets: WidgetId[];
}

export function KPISection({ properties, payments, contracts, period, visibleWidgets }: KPISectionProps) {
  const now = new Date();
  const periodMonths = period === "month" ? 1 : period === "quarter" ? 3 : 12;
  const startDate = new Date(now.getFullYear(), now.getMonth() - periodMonths + 1, 1);

  // KPI 1: ROI par propriété (moyenne)
  const calculateROI = () => {
    const occupiedProperties = properties.filter((p) => p.status === "occupé");
    if (occupiedProperties.length === 0) return { value: "0%", subtitle: "Aucun bien occupé" };

    const roiValues = occupiedProperties.map((property) => {
      const annualRent = Number(property.price) * 12;
      // Simplified ROI calculation (rent / property value approximation)
      const estimatedValue = annualRent * 10; // Rough cap rate estimation
      return (annualRent / estimatedValue) * 100;
    });

    const avgROI = roiValues.reduce((sum, r) => sum + r, 0) / roiValues.length;
    return {
      value: `${avgROI.toFixed(1)}%`,
      subtitle: `${occupiedProperties.length} bien(s) analysé(s)`,
      trend: { value: Math.round(avgROI - 8), label: "vs. marché" },
    };
  };

  // KPI 2: Taux de recouvrement
  const calculateRecoveryRate = () => {
    const periodPayments = payments.filter((p) => {
      const dueDate = new Date(p.due_date);
      return dueDate >= startDate && dueDate <= now;
    });

    if (periodPayments.length === 0) return { value: "N/A", subtitle: "Aucun paiement attendu" };

    const totalExpected = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPaid = periodPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const rate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;
    return {
      value: `${rate}%`,
      subtitle: `${totalPaid.toLocaleString("fr-FR")} / ${totalExpected.toLocaleString("fr-FR")} F`,
      trend: rate >= 90 ? { value: rate - 85, label: "performant" } : undefined,
    };
  };

  // KPI 3: Vacance locative moyenne
  const calculateVacancy = () => {
    if (properties.length === 0) return { value: "N/A", subtitle: "Aucun bien" };

    const vacantProperties = properties.filter((p) => p.status === "disponible");
    const vacancyRate = Math.round((vacantProperties.length / properties.length) * 100);

    // Calculate average vacancy duration for vacant properties
    const vacantDurations = vacantProperties.map((property) => {
      const lastContract = contracts
        .filter((c) => c.property_id === property.id && c.status === "expired")
        .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0];

      if (lastContract) {
        const endDate = new Date(lastContract.end_date);
        const daysSinceVacant = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceVacant;
      }
      return 30; // Default assumption
    });

    const avgDays = vacantDurations.length > 0
      ? Math.round(vacantDurations.reduce((sum, d) => sum + d, 0) / vacantDurations.length)
      : 0;

    return {
      value: `${vacancyRate}%`,
      subtitle: `${vacantProperties.length} bien(s) vacant(s)`,
      trend: vacancyRate <= 10 ? { value: -5, label: "optimal" } : undefined,
    };
  };

  // KPI 4: Délai moyen de paiement
  const calculatePaymentDelay = () => {
    const paidPayments = payments.filter((p) => p.status === "paid" && p.paid_date);
    if (paidPayments.length === 0) return { value: "N/A", subtitle: "Aucun paiement" };

    const delays = paidPayments.map((p) => {
      const dueDate = new Date(p.due_date);
      const paidDate = new Date(p.paid_date!);
      return Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    });

    const avgDelay = Math.round(delays.reduce((sum, d) => sum + d, 0) / delays.length);
    const onTimeCount = delays.filter((d) => d <= 0).length;
    const onTimeRate = Math.round((onTimeCount / delays.length) * 100);

    return {
      value: avgDelay <= 0 ? "À temps" : `${avgDelay}j`,
      subtitle: `${onTimeRate}% payés à temps`,
      trend: avgDelay <= 0 ? { value: onTimeRate - 80, label: "ponctuel" } : undefined,
    };
  };

  const roi = calculateROI();
  const recovery = calculateRecoveryRate();
  const vacancy = calculateVacancy();
  const delay = calculatePaymentDelay();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {visibleWidgets.includes("kpi-roi") && (
        <KPICard
          title="ROI moyen"
          value={roi.value}
          subtitle={roi.subtitle}
          trend={roi.trend}
          icon={TrendingUp}
          iconColor="primary"
          tooltip="Retour sur investissement estimé basé sur les loyers annuels"
        />
      )}
      {visibleWidgets.includes("kpi-recovery") && (
        <KPICard
          title="Taux de recouvrement"
          value={recovery.value}
          subtitle={recovery.subtitle}
          trend={recovery.trend}
          icon={Percent}
          iconColor="emerald"
          tooltip="Pourcentage des loyers effectivement perçus sur la période"
        />
      )}
      {visibleWidgets.includes("kpi-vacancy") && (
        <KPICard
          title="Vacance locative"
          value={vacancy.value}
          subtitle={vacancy.subtitle}
          trend={vacancy.trend}
          icon={Home}
          iconColor="amber"
          tooltip="Pourcentage de biens actuellement sans locataire"
        />
      )}
      {visibleWidgets.includes("kpi-delay") && (
        <KPICard
          title="Délai de paiement"
          value={delay.value}
          subtitle={delay.subtitle}
          trend={delay.trend}
          icon={Clock}
          iconColor={delay.value === "À temps" ? "emerald" : "destructive"}
          tooltip="Temps moyen entre l'échéance et le paiement effectif"
        />
      )}
    </div>
  );
}
