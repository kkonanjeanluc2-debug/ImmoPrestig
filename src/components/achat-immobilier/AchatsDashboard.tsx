import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, FileText, ShoppingCart, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { useBiensAchat } from "@/hooks/useBiensAchat";
import { useOffresAchat } from "@/hooks/useOffresAchat";
import { useAchatsImmobiliers } from "@/hooks/useAchatsImmobiliers";
import { useEcheancesAchats } from "@/hooks/useEcheancesAchats";
import { formatCurrency } from "@/lib/pdfFormat";
import { PeriodFilter, PeriodValue, getDefaultPeriod, getPeriodLabel } from "@/components/dashboard/PeriodFilter";

export function AchatsDashboard() {
  const { data: biens = [] } = useBiensAchat();
  const { data: offres = [] } = useOffresAchat();
  const { data: achats = [] } = useAchatsImmobiliers();
  const { data: echeances = [] } = useEcheancesAchats();

  const [period, setPeriod] = useState<PeriodValue>(getDefaultPeriod);

  const enRetard = echeances.filter(e => e.status === "en_retard").length;

  // Calculate revenue filtered by period
  const { periodRevenue, periodLabel } = useMemo(() => {
    const from = period.from;
    const to = period.to;

    const isInPeriod = (dateStr: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= from && d <= to;
    };

    // Down payments from achats within period
    const downPayments = achats
      .filter((a) => isInPeriod(a.sale_date))
      .reduce((sum, a) => sum + (a.down_payment || 0), 0);

    // Paid installments within period
    const paidInstallments = echeances
      .filter((e) => e.status === "paye" && isInPeriod(e.paid_date))
      .reduce((sum, e) => sum + (e.paid_amount || e.amount), 0);

    return {
      periodRevenue: downPayments + paidInstallments,
      periodLabel: getPeriodLabel(period),
    };
  }, [achats, echeances, period]);

  const kpis = [
    { label: "Biens prospectés", value: biens.length, icon: Building2, color: "text-blue-500" },
    { label: "Offres en cours", value: offres.filter(o => o.status === "en_attente").length, icon: FileText, color: "text-amber-500" },
    { label: "Achats réalisés", value: achats.length, icon: ShoppingCart, color: "text-emerald-500" },
    { label: "Échéances en retard", value: enRetard, icon: Calendar, color: enRetard > 0 ? "text-destructive" : "text-muted-foreground" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Revenue card */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(periodRevenue)}</p>
              <p className="text-xs text-muted-foreground">{periodLabel.title}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <PeriodFilter value={period} onChange={setPeriod} />
    </div>
  );
}
