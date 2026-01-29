import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Lotissement } from "@/hooks/useLotissements";

interface Parcelle {
  id: string;
  lotissement_id: string;
  status: string;
  price: number;
  area: number;
}

interface VenteParcelle {
  id: string;
  parcelle_id: string;
  total_price: number;
  down_payment: number | null;
  payment_type: string;
  parcelle?: {
    plot_number?: string;
    area?: number;
    lotissement_id?: string;
    lotissement?: {
      name?: string;
    };
  } | null;
}

interface EcheanceParcelle {
  id: string;
  vente_id: string;
  status: string;
  paid_amount: number | null;
  amount: number;
}

interface LotissementStats {
  lotissement: Lotissement;
  totalParcelles: number;
  parcellesVendues: number;
  parcellesReservees: number;
  parcellesDisponibles: number;
  superficieTotale: number;
  valeurTotale: number;
  revenusEncaisses: number;
  tauxVente: number;
  prixMoyenM2: number;
}

interface LotissementsComparisonTableProps {
  lotissements: Lotissement[];
  parcelles: Parcelle[];
  ventes: VenteParcelle[];
  echeances: EcheanceParcelle[];
}

export function LotissementsComparisonTable({
  lotissements,
  parcelles,
  ventes,
  echeances,
}: LotissementsComparisonTableProps) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    return lotissements.map((lot): LotissementStats => {
      const lotParcelles = parcelles.filter((p) => p.lotissement_id === lot.id);
      const lotVentes = ventes.filter((v) => {
        const parcelle = parcelles.find((p) => p.id === v.parcelle_id);
        return parcelle?.lotissement_id === lot.id;
      });

      const totalParcelles = lotParcelles.length;
      const parcellesVendues = lotParcelles.filter((p) => p.status === "vendu").length;
      const parcellesReservees = lotParcelles.filter((p) => p.status === "reserve").length;
      const parcellesDisponibles = lotParcelles.filter((p) => p.status === "disponible").length;

      const superficieTotale = lotParcelles.reduce((sum, p) => sum + (p.area || 0), 0);
      const valeurTotale = lotParcelles.reduce((sum, p) => sum + (p.price || 0), 0);

      // Calcul des revenus encaissés
      let revenusEncaisses = 0;

      lotVentes.forEach((vente) => {
        if (vente.payment_type === "comptant") {
          revenusEncaisses += vente.total_price;
        } else {
          // Acompte
          revenusEncaisses += vente.down_payment || 0;
          // Échéances payées
          const venteEcheances = echeances.filter(
            (e) => e.vente_id === vente.id && e.status === "paid"
          );
          venteEcheances.forEach((e) => {
            revenusEncaisses += e.paid_amount || e.amount;
          });
        }
      });

      const tauxVente = totalParcelles > 0 ? (parcellesVendues / totalParcelles) * 100 : 0;
      const prixMoyenM2 = superficieTotale > 0 ? valeurTotale / superficieTotale : 0;

      return {
        lotissement: lot,
        totalParcelles,
        parcellesVendues,
        parcellesReservees,
        parcellesDisponibles,
        superficieTotale,
        valeurTotale,
        revenusEncaisses,
        tauxVente,
        prixMoyenM2,
      };
    });
  }, [lotissements, parcelles, ventes, echeances]);

  // Trier par taux de vente décroissant
  const sortedStats = [...stats].sort((a, b) => b.tauxVente - a.tauxVente);

  // Calculer les totaux
  const totals = useMemo(() => {
    return {
      totalParcelles: stats.reduce((sum, s) => sum + s.totalParcelles, 0),
      parcellesVendues: stats.reduce((sum, s) => sum + s.parcellesVendues, 0),
      parcellesReservees: stats.reduce((sum, s) => sum + s.parcellesReservees, 0),
      parcellesDisponibles: stats.reduce((sum, s) => sum + s.parcellesDisponibles, 0),
      superficieTotale: stats.reduce((sum, s) => sum + s.superficieTotale, 0),
      valeurTotale: stats.reduce((sum, s) => sum + s.valeurTotale, 0),
      revenusEncaisses: stats.reduce((sum, s) => sum + s.revenusEncaisses, 0),
    };
  }, [stats]);

  const avgTauxVente =
    totals.totalParcelles > 0
      ? (totals.parcellesVendues / totals.totalParcelles) * 100
      : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(value) + " F";
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTrendIcon = (tauxVente: number) => {
    if (tauxVente >= 70) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (tauxVente >= 30) return <Minus className="h-4 w-4 text-amber-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getProgressColor = (tauxVente: number) => {
    if (tauxVente >= 70) return "bg-emerald-500";
    if (tauxVente >= 30) return "bg-amber-500";
    return "bg-red-500";
  };

  if (lotissements.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Tableau comparatif des lotissements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Lotissement</TableHead>
                <TableHead className="text-center font-semibold">Parcelles</TableHead>
                <TableHead className="text-center font-semibold">Vendues</TableHead>
                <TableHead className="text-center font-semibold">Réservées</TableHead>
                <TableHead className="text-center font-semibold">Disponibles</TableHead>
                <TableHead className="text-center font-semibold">Taux de vente</TableHead>
                <TableHead className="text-right font-semibold">Superficie</TableHead>
                <TableHead className="text-right font-semibold">Valeur totale</TableHead>
                <TableHead className="text-right font-semibold">Revenus encaissés</TableHead>
                <TableHead className="text-right font-semibold">Prix/m²</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStats.map((stat, index) => (
                <TableRow key={stat.lotissement.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="h-6 w-6 p-0 flex items-center justify-center text-xs"
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{stat.lotissement.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {stat.lotissement.location}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {stat.totalParcelles}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    >
                      {stat.parcellesVendues}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-600 border-amber-500/30"
                    >
                      {stat.parcellesReservees}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="secondary"
                      className="bg-blue-500/10 text-blue-600 border-blue-500/30"
                    >
                      {stat.parcellesDisponibles}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      {getTrendIcon(stat.tauxVente)}
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{stat.tauxVente.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(stat.tauxVente)} transition-all`}
                            style={{ width: `${stat.tauxVente}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(stat.superficieTotale)} m²
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(stat.valeurTotale)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-emerald-600 font-medium">
                      {formatCurrency(stat.revenusEncaisses)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(stat.prixMoyenM2)}/m²
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/lotissements/${stat.lotissement.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {/* Ligne de totaux */}
              <TableRow className="bg-muted/50 font-semibold border-t-2">
                <TableCell>
                  <span className="text-primary">TOTAL</span>
                </TableCell>
                <TableCell className="text-center">{totals.totalParcelles}</TableCell>
                <TableCell className="text-center text-emerald-600">
                  {totals.parcellesVendues}
                </TableCell>
                <TableCell className="text-center text-amber-600">
                  {totals.parcellesReservees}
                </TableCell>
                <TableCell className="text-center text-blue-600">
                  {totals.parcellesDisponibles}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[120px]">
                    {getTrendIcon(avgTauxVente)}
                    <span className="font-semibold">{avgTauxVente.toFixed(0)}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(totals.superficieTotale)} m²
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totals.valeurTotale)}
                </TableCell>
                <TableCell className="text-right text-emerald-600">
                  {formatCurrency(totals.revenusEncaisses)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">—</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
