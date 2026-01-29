import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBiensVente } from "@/hooks/useBiensVente";
import { useVentesImmobilieres } from "@/hooks/useVentesImmobilieres";
import { useOverdueEcheancesVentes, useUpcomingEcheancesVentes } from "@/hooks/useEcheancesVentes";
import { Building2, TrendingUp, AlertTriangle, Calendar, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/pdfFormat";

export function VentesDashboard() {
  const { data: biens } = useBiensVente();
  const { data: ventes } = useVentesImmobilieres();
  const { data: overdueEcheances } = useOverdueEcheancesVentes();
  const { data: upcomingEcheances } = useUpcomingEcheancesVentes();

  const biensDisponibles = biens?.filter((b) => b.status === "disponible").length || 0;
  const biensVendus = biens?.filter((b) => b.status === "vendu").length || 0;
  
  const totalRevenue = ventes?.reduce((sum, v) => sum + v.total_price, 0) || 0;
  const ventesEnCours = ventes?.filter((v) => v.status === "en_cours").length || 0;
  const ventesCompletes = ventes?.filter((v) => v.status === "complete").length || 0;

  const overdueCount = overdueEcheances?.length || 0;
  const overdueAmount = overdueEcheances?.reduce((sum, e) => sum + e.amount, 0) || 0;
  
  const upcomingCount = upcomingEcheances?.length || 0;
  const upcomingAmount = upcomingEcheances?.reduce((sum, e) => sum + e.amount, 0) || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            {ventesCompletes} ventes complétées
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
  );
}
