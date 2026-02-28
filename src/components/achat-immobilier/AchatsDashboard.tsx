import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, ShoppingCart, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { useBiensAchat } from "@/hooks/useBiensAchat";
import { useOffresAchat } from "@/hooks/useOffresAchat";
import { useAchatsImmobiliers } from "@/hooks/useAchatsImmobiliers";
import { useEcheancesAchats } from "@/hooks/useEcheancesAchats";
import { formatCurrency } from "@/lib/pdfFormat";
import { PeriodFilter, PeriodValue, getDefaultPeriod, getPeriodLabel } from "@/components/dashboard/PeriodFilter";

interface AchatsDashboardProps {
  period: PeriodValue;
  onPeriodChange: (value: PeriodValue) => void;
}

export function AchatsDashboard({ period, onPeriodChange }: AchatsDashboardProps) {
  const { data: biens = [] } = useBiensAchat();
  const { data: offres = [] } = useOffresAchat();
  const { data: achats = [] } = useAchatsImmobiliers();
  const { data: echeances = [] } = useEcheancesAchats();

  const enRetard = echeances.filter(e => e.status === "en_retard").length;
  const enRetardAmount = echeances.filter(e => e.status === "en_retard").reduce((sum, e) => sum + e.amount, 0);

  const offresEnCours = offres.filter(o => o.status === "en_attente").length;

  // Calculate revenue filtered by period
  const { periodRevenue, periodLabel } = useMemo(() => {
    const from = period.from;
    const to = period.to;

    const isInPeriod = (dateStr: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= from && d <= to;
    };

    const downPayments = achats
      .filter((a) => isInPeriod(a.sale_date))
      .reduce((sum, a) => sum + (a.down_payment || 0), 0);

    const paidInstallments = echeances
      .filter((e) => e.status === "paye" && isInPeriod(e.paid_date))
      .reduce((sum, e) => sum + (e.paid_amount || e.amount), 0);

    return {
      periodRevenue: downPayments + paidInstallments,
      periodLabel: getPeriodLabel(period),
    };
  }, [achats, echeances, period]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Biens prospectés</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{biens.length}</div>
            <p className="text-xs text-muted-foreground">au total</p>
          </CardContent>
        </Card>

        <Card className={offresEnCours > 0 ? "border-primary/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Offres en cours</CardTitle>
            <FileText className={`h-4 w-4 ${offresEnCours > 0 ? "text-primary" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${offresEnCours > 0 ? "text-primary" : ""}`}>
              {offresEnCours}
            </div>
            <p className="text-xs text-muted-foreground">en attente de réponse</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{periodLabel.title}</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(periodRevenue)}</div>
            <p className="text-xs text-muted-foreground">{periodLabel.subtitle}</p>
          </CardContent>
        </Card>

        <Card className={enRetard > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Échéances en retard</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${enRetard > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${enRetard > 0 ? "text-destructive" : ""}`}>
              {enRetard}
            </div>
            <p className="text-xs text-muted-foreground">{formatCurrency(enRetardAmount)} à payer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Achats réalisés</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{achats.length}</div>
            <p className="text-xs text-muted-foreground">au total</p>
          </CardContent>
        </Card>
      </div>

      <PeriodFilter value={period} onChange={onPeriodChange} />
    </div>
  );
}
