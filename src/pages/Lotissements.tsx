import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Search, 
  MapPin, 
  MoreVertical, 
  Pencil, 
  Trash2,
  Building2,
  TrendingUp,
  Map,
} from "lucide-react";
import { useLotissements, useSoftDeleteLotissement } from "@/hooks/useLotissements";
import { useParcelles } from "@/hooks/useParcelles";
import { useVentesParcelles } from "@/hooks/useVentesParcelles";
import { useEcheancesParcelles } from "@/hooks/useEcheancesParcelles";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { AddLotissementDialog } from "@/components/lotissement/AddLotissementDialog";
import { EditLotissementDialog } from "@/components/lotissement/EditLotissementDialog";
import { LotissementsComparisonTable } from "@/components/lotissement/LotissementsComparisonTable";
import type { Lotissement } from "@/hooks/useLotissements";

const Lotissements = () => {
  const navigate = useNavigate();
  const { data: lotissements, isLoading } = useLotissements();
  const { data: allParcelles } = useParcelles();
  const { data: allVentes } = useVentesParcelles();
  const { data: allEcheances } = useEcheancesParcelles();
  const deleteLotissement = useSoftDeleteLotissement();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("can_create_lotissements");
  const canEdit = hasPermission("can_edit_lotissements");
  const canDelete = hasPermission("can_delete_lotissements");

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLotissement, setEditingLotissement] = useState<Lotissement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredLotissements = lotissements?.filter(
    (lot) =>
      lot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getParcelleStats = (lotissementId: string) => {
    const parcelles = allParcelles?.filter(p => p.lotissement_id === lotissementId) || [];
    const total = parcelles.length;
    const disponibles = parcelles.filter(p => p.status === "disponible").length;
    const vendues = parcelles.filter(p => p.status === "vendu").length;
    const reservees = parcelles.filter(p => p.status === "reserve").length;
    return { total, disponibles, vendues, reservees };
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const lotissement = lotissements?.find(l => l.id === deletingId);
    try {
      await deleteLotissement.mutateAsync({ id: deletingId, name: lotissement?.name });
      toast.success("Lotissement déplacé vers la corbeille");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
    setDeletingId(null);
  };

  const totalParcelles = allParcelles?.length || 0;
  const totalVendues = allParcelles?.filter(p => p.status === "vendu").length || 0;
  const totalDisponibles = allParcelles?.filter(p => p.status === "disponible").length || 0;
  const totalRevenue = allParcelles?.filter(p => p.status === "vendu").reduce((sum, p) => sum + p.price, 0) || 0;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Map className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
              Lotissements
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gérez vos projets de lotissement et parcelles
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setShowAddDialog(true)} className="gap-2 w-full sm:w-auto" size="sm">
              <Plus className="h-4 w-4" />
              <span>Nouveau lotissement</span>
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:pt-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                  <Map className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{lotissements?.length || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Lotissements</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:pt-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{totalParcelles}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Parcelles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:pt-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{totalVendues}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Vendues</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:pt-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{totalDisponibles}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Disponibles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un lotissement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lotissements Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !filteredLotissements || filteredLotissements.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Map className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun lotissement</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Aucun lotissement ne correspond à votre recherche"
                  : "Créez votre premier projet de lotissement"}
              </p>
              {canCreate && !searchQuery && (
                <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Créer un lotissement
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLotissements.map((lotissement) => {
              const stats = getParcelleStats(lotissement.id);
              return (
                <Card 
                  key={lotissement.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/lotissements/${lotissement.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{lotissement.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {lotissement.location}, {lotissement.city}
                        </CardDescription>
                      </div>
                      {(canEdit || canDelete) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingLotissement(lotissement);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(lotissement.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-lg font-bold">{stats.total}</p>
                        <p className="text-xs text-muted-foreground">Parcelles</p>
                      </div>
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <p className="text-lg font-bold text-emerald-600">{stats.vendues}</p>
                        <p className="text-xs text-muted-foreground">Vendues</p>
                      </div>
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <p className="text-lg font-bold text-amber-600">{stats.disponibles}</p>
                        <p className="text-xs text-muted-foreground">Dispo</p>
                      </div>
                    </div>
                    {lotissement.total_area && (
                      <p className="text-sm text-muted-foreground mt-3">
                        Superficie totale: {lotissement.total_area.toLocaleString("fr-FR")} m²
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tableau comparatif */}
        {lotissements && lotissements.length > 1 && (
          <LotissementsComparisonTable
            lotissements={lotissements}
            parcelles={allParcelles || []}
            ventes={allVentes || []}
            echeances={allEcheances || []}
          />
        )}
      </div>

      <AddLotissementDialog open={showAddDialog} onOpenChange={setShowAddDialog} />

      {editingLotissement && (
        <EditLotissementDialog
          lotissement={editingLotissement}
          open={!!editingLotissement}
          onOpenChange={(open) => !open && setEditingLotissement(null)}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lotissement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce lotissement sera déplacé vers la corbeille. Vous pourrez le restaurer dans les 30 jours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Lotissements;
