import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Plus, TrendingUp, Home, CheckCircle } from "lucide-react";
import { useProgrammes } from "@/hooks/usePromotionsImmobilieres";
import { ProgrammeCard } from "@/components/promotions/ProgrammeCard";
import { ProgrammeFormDialog } from "@/components/promotions/ProgrammeFormDialog";
import { usePermissions } from "@/hooks/usePermissions";

export default function PromotionsImmobilieres() {
  const { data: programmes = [], isLoading } = useProgrammes();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("can_create_biens_vente");
  const [createOpen, setCreateOpen] = useState(false);

  const totalLots    = programmes.reduce((s, p) => s + p.nombre_lots_total, 0);
  const lotsVendus   = programmes.reduce((s, p) => s + p.nombre_lots_vendus, 0);
  const lotsReserves = programmes.reduce((s, p) => s + p.nombre_lots_reserves, 0);
  const tauxGlobal   = totalLots > 0 ? Math.round(((lotsVendus + lotsReserves) / totalLots) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Promotions Immobilières
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gérez vos programmes, réservations et appels de fonds VEFA
            </p>
          </div>
          {canCreate && (
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau programme
            </Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total lots</p>
              </div>
              <p className="text-2xl font-bold mt-1">{totalLots}</p>
              <p className="text-xs text-muted-foreground">{programmes.length} programme(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <p className="text-xs text-muted-foreground">Vendus</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{lotsVendus}</p>
              <p className="text-xs text-muted-foreground">Actes signés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-muted-foreground">Réservés</p>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-1">{lotsReserves}</p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <p className="text-xs text-muted-foreground">Taux global</p>
              </div>
              <p className="text-2xl font-bold text-orange-600 mt-1">{tauxGlobal}%</p>
              <p className="text-xs text-muted-foreground">Commercialisation</p>
            </CardContent>
          </Card>
        </div>

        {/* Liste des programmes */}
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Chargement...</div>
        ) : programmes.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Aucun programme immobilier enregistré</p>
              {canCreate && (
                <Button variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer le premier programme
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {programmes.map((programme) => (
              <ProgrammeCard key={programme.id} programme={programme} />
            ))}
          </div>
        )}

        <ProgrammeFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </DashboardLayout>
  );
}
