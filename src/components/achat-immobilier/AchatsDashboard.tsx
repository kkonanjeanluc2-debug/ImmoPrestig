import { Card, CardContent } from "@/components/ui/card";
import { Building2, FileText, ShoppingCart, Calendar } from "lucide-react";
import { useBiensAchat } from "@/hooks/useBiensAchat";
import { useOffresAchat } from "@/hooks/useOffresAchat";
import { useAchatsImmobiliers } from "@/hooks/useAchatsImmobiliers";
import { useEcheancesAchats } from "@/hooks/useEcheancesAchats";

export function AchatsDashboard() {
  const { data: biens = [] } = useBiensAchat();
  const { data: offres = [] } = useOffresAchat();
  const { data: achats = [] } = useAchatsImmobiliers();
  const { data: echeances = [] } = useEcheancesAchats();

  const enRetard = echeances.filter(e => e.status === "en_retard").length;
  const totalInvesti = achats.reduce((sum, a) => sum + Number(a.sale_price), 0);

  const kpis = [
    { label: "Biens prospectés", value: biens.length, icon: Building2, color: "text-blue-500" },
    { label: "Offres en cours", value: offres.filter(o => o.status === "en_attente").length, icon: FileText, color: "text-amber-500" },
    { label: "Achats réalisés", value: achats.length, icon: ShoppingCart, color: "text-emerald-500" },
    { label: "Échéances en retard", value: enRetard, icon: Calendar, color: enRetard > 0 ? "text-destructive" : "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
}
