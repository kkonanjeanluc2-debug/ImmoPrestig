import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBiensVente } from "@/hooks/useBiensVente";
import { useVentesImmobilieres } from "@/hooks/useVentesImmobilieres";
import { useOverdueEcheancesVentes, useUpcomingEcheancesVentes, useEcheancesVentes } from "@/hooks/useEcheancesVentes";
import { Building2, TrendingUp, AlertTriangle, Calendar, BookmarkCheck } from "lucide-react";
import { formatCurrency } from "@/lib/pdfFormat";
import { PeriodFilter, PeriodValue, getDefaultPeriod, getPeriodLabel } from "@/components/dashboard/PeriodFilter";

export function VentesDashboard() {
  const { data: biens } = useBiensVente();
  const { data: ventes } = useVentesImmobilieres();
  const { data: allEcheances } = useEcheancesVentes();
  const { data: overdueEcheances } = useOverdueEcheancesVentes();
  const { data: upcomingEcheances } = useUpcomingEcheancesVentes();

  const [period, setPeriod] = useState<PeriodValue>(getDefaultPeriod);

  const biensDisponibles = biens?.filter((b) => b.status === "disponible").length || 0;
  const biensReserves = biens?.filter((b) => b.status === "reserve").length || 0;
  const biensVendus = biens?.filter((b) => b.status === "vendu").length || 0;

  // Calculate revenue filtered by period
  const { periodRevenue, periodLabel } = useMemo(() => {
    const from = period.from;
    const to = period.to;

    const isInPeriod = (dateStr: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= from && d <= to;
    };

    // Down payments from ventes within period (use sale_date)
    const downPayments = ventes?.filter((v) => isInPeriod(v.sale_date)).reduce((sum, v) => sum + (v.down_payment || 0), 0) || 0;

    // Paid installments within period (use paid_date)
    const paidInstallments = allEcheances?.filter((e) => e.status === "paid" && isInPeriod(e.paid_date)).reduce((sum, e) => sum + (e.paid_amount || e.amount), 0) || 0;

    return {
      periodRevenue: downPayments + paidInstallments,
      periodLabel: getPeriodLabel(period),
    };
  }, [ventes, allEcheances, period]);

  const ventesCompletes = ventes?.filter((v) => v.status === "complete").length || 0;

  const overdueCount = overdueEcheances?.length || 0;
  const overdueAmount = overdueEcheances?.reduce((sum, e) => sum + e.amount, 0) || 0;

  const upcomingCount = upcomingEcheances?.length || 0;
  const upcomingAmount = upcomingEcheances?.reduce((sum, e) => sum + e.amount, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Biens disponibles</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{biensDisponibles}</div>
            <p className="text-xs text-muted-foreground">
              {biensVendus} vendus au total
            </p>
          </CardContent>
        </Card>

        <Card className={biensReserves > 0 ? "border-primary/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Biens réservés</CardTitle>
            <BookmarkCheck className={`h-4 w-4 ${biensReserves > 0 ? "text-primary" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${biensReserves > 0 ? "text-primary" : ""}`}>
              {biensReserves}
            </div>
            <p className="text-xs text-muted-foreground">
              en attente de finalisation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{periodLabel.title}</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(periodRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {periodLabel.subtitle}
            </p>
          </CardContent>
        </Card>

        <Card className={overdueCount > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Échéances en retard</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-destructive" : ""}`}>
              {overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(overdueAmount)} à recouvrer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">À venir (30j)</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingCount}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(upcomingAmount)} attendus
            </p>
          </CardContent>
        </Card>
      </div>

      <PeriodFilter value={period} onChange={setPeriod} />
    </div>
  );
}
