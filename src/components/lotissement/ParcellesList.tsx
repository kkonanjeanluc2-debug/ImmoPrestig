import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreVertical, Pencil, Trash2, ShoppingCart, Layers, Search, X, User, BookmarkPlus, Building2, Star } from "lucide-react";
import { Parcelle, useSoftDeleteParcelle } from "@/hooks/useParcelles";
import { useIlots } from "@/hooks/useIlots";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfiles } from "@/hooks/useAssignedUserProfile";
import { useBeneficiairesLots } from "@/hooks/useBeneficiairesLots";
import { toast } from "sonner";
import { EditParcelleDialog } from "./EditParcelleDialog";
import { SellParcelleDialog } from "./SellParcelleDialog";
import { ReserveParcelleDialog } from "./ReserveParcelleDialog";
import { ReservationParcelleCard } from "./ReservationParcelleCard";
import { useReservationByParcelle } from "@/hooks/useReservationsParcelles";
import { useLotissement } from "@/hooks/useLotissements";
import { useAuth } from "@/contexts/AuthContext";

interface ParcellesListProps {
  parcelles: Parcelle[];
  lotissementId: string;
}

const STATUS_STYLES: Record<string, string> = {
  disponible: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  reserve: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  vendu: "bg-blue-500/10 text-blue-600 border-blue-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  disponible: "Disponible",
  reserve: "Réservé",
  vendu: "Vendu",
};

function ReservationModalList({ parcelleId, plotNumber, parcelle, lotissementId, open, onOpenChange }: { parcelleId: string; plotNumber: string; parcelle?: Parcelle; lotissementId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: reservation, isLoading } = useReservationByParcelle(parcelleId);
  const { data: lotissement } = useLotissement(lotissementId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground">Chargement...</div>
        ) : !reservation ? (
          <div className="p-6 text-center text-muted-foreground">Aucune réservation trouvée pour le lot {plotNumber}</div>
        ) : (
          <ReservationParcelleCard reservation={reservation} parcelle={parcelle} lotissement={lotissement ? { name: lotissement.name, location: lotissement.location, city: lotissement.city } : undefined} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ParcellesList({ parcelles, lotissementId }: ParcellesListProps) {
  const { user } = useAuth();
  const { hasPermission, role } = usePermissions();
  const canCreate = hasPermission("can_create_parcelles");
  const canEdit = hasPermission("can_edit_lotissements");
  const canDelete = hasPermission("can_delete_lotissements");
  const deleteParcelle = useSoftDeleteParcelle();
  const { data: ilots } = useIlots(lotissementId);
  const { data: lotissement } = useLotissement(lotissementId);
  const { data: beneficiaires = [] } = useBeneficiairesLots(lotissementId);
  const isAdmin = role !== "gestionnaire";

  // Fetch profiles for assigned users
  const assignedUserIds = parcelles?.map(p => p.assigned_to) || [];
  const { data: userProfilesMap } = useUserProfiles(assignedUserIds);

  const [editingParcelle, setEditingParcelle] = useState<Parcelle | null>(null);
  const [sellingParcelle, setSellingParcelle] = useState<Parcelle | null>(null);
  const [reservingParcelle, setReservingParcelle] = useState<Parcelle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingReservation, setViewingReservation] = useState<Parcelle | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [attributionFilter, setAttributionFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isBulkDeleteLoading, setIsBulkDeleteLoading] = useState(false);

  const getAttributionLabel = (attribution: string | null) => {
    if (attribution === "proprietaire") return lotissement?.proprietaire_name || "Propriétaire";
    if (attribution === "lotisseur") return lotissement?.lotisseur_name || "Lotisseur";
    return null;
  };

  const getIlotName = (ilotId: string | null) => {
    if (!ilotId) return null;
    return ilots?.find(i => i.id === ilotId)?.name || null;
  };

  // Filter parcelles based on search query and status
  const filteredParcelles = useMemo(() => {
    let filtered = parcelles;
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (attributionFilter !== "all") {
      filtered = filtered.filter(p => p.attribution === attributionFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((parcelle) => {
        const ilotName = getIlotName(parcelle.ilot_id)?.toLowerCase() || "";
        const statusLabel = STATUS_LABELS[parcelle.status]?.toLowerCase() || "";
        const attrLabel = getAttributionLabel(parcelle.attribution)?.toLowerCase() || "";
        
        return (
          parcelle.plot_number.toLowerCase().includes(query) ||
          ilotName.includes(query) ||
          statusLabel.includes(query) ||
          attrLabel.includes(query) ||
          parcelle.area.toString().includes(query) ||
          parcelle.price.toString().includes(query)
        );
      });
    }
    
    return filtered;
  }, [parcelles, searchQuery, statusFilter, attributionFilter, ilots, lotissement]);

  // Deletable parcelles in current filtered view (exclude "vendu")
  const deletableFilteredIds = useMemo(
    () => filteredParcelles.filter(p => p.status !== "vendu").map(p => p.id),
    [filteredParcelles]
  );

  const allSelected = deletableFilteredIds.length > 0 && deletableFilteredIds.every(id => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletableFilteredIds));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const parcelle = parcelles.find(p => p.id === deletingId);
    try {
      await deleteParcelle.mutateAsync({ id: deletingId, plotNumber: parcelle?.plot_number });
      toast.success("Lot déplacé vers la corbeille");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
    setDeletingId(null);
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleteLoading(true);
    let success = 0;
    let fail = 0;
    for (const id of selectedIds) {
      const parcelle = parcelles.find(p => p.id === id);
      try {
        await deleteParcelle.mutateAsync({ id, plotNumber: parcelle?.plot_number });
        success++;
      } catch {
        fail++;
      }
    }
    setIsBulkDeleteLoading(false);
    setBulkDeleting(false);
    setSelectedIds(new Set());
    if (fail > 0) {
      toast.warning(`${success} lot(s) supprimé(s), ${fail} en erreur`);
    } else {
      toast.success(`${success} lot(s) déplacé(s) vers la corbeille`);
    }
  };

  if (parcelles.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <p className="text-muted-foreground">Aucune parcelle dans ce lotissement</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        {/* Search Bar & Status Filter */}
        {parcelles.length > 0 && (
          <div className="p-4 border-b">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une parcelle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Tous ({parcelles.length})
                </Button>
                <Button
                  variant={statusFilter === "disponible" ? "default" : "outline"}
                  size="sm"
                  className={statusFilter !== "disponible" ? "text-emerald-600 border-emerald-300 hover:bg-emerald-50" : "bg-emerald-600 hover:bg-emerald-700"}
                  onClick={() => setStatusFilter("disponible")}
                >
                  Disponibles ({parcelles.filter(p => p.status === "disponible").length})
                </Button>
                <Button
                  variant={statusFilter === "reserve" ? "default" : "outline"}
                  size="sm"
                  className={statusFilter !== "reserve" ? "text-amber-600 border-amber-300 hover:bg-amber-50" : "bg-amber-600 hover:bg-amber-700"}
                  onClick={() => setStatusFilter("reserve")}
                >
                  Réservées ({parcelles.filter(p => p.status === "reserve").length})
                </Button>
                <Button
                  variant={statusFilter === "vendu" ? "default" : "outline"}
                  size="sm"
                  className={statusFilter !== "vendu" ? "text-blue-600 border-blue-300 hover:bg-blue-50" : "bg-blue-600 hover:bg-blue-700"}
                  onClick={() => setStatusFilter("vendu")}
                >
                  Vendues ({parcelles.filter(p => p.status === "vendu").length})
                </Button>
              </div>
              {/* Attribution filter */}
              {parcelles.some(p => p.attribution) && (
                <div className="flex gap-1.5 flex-wrap">
                  <Button
                    variant={attributionFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAttributionFilter("all")}
                  >
                    Toutes parties
                  </Button>
                  <Button
                    variant={attributionFilter === "proprietaire" ? "default" : "outline"}
                    size="sm"
                    className={attributionFilter !== "proprietaire" ? "text-blue-600 border-blue-300 hover:bg-blue-50" : "bg-blue-600 hover:bg-blue-700"}
                    onClick={() => setAttributionFilter("proprietaire")}
                  >
                    <User className="h-3 w-3 mr-1" />
                    {lotissement?.proprietaire_name || "Propriétaire"} ({parcelles.filter(p => p.attribution === "proprietaire").length})
                  </Button>
                  <Button
                    variant={attributionFilter === "lotisseur" ? "default" : "outline"}
                    size="sm"
                    className={attributionFilter !== "lotisseur" ? "text-amber-600 border-amber-300 hover:bg-amber-50" : "bg-amber-600 hover:bg-amber-700"}
                    onClick={() => setAttributionFilter("lotisseur")}
                  >
                    <Building2 className="h-3 w-3 mr-1" />
                    {lotissement?.lotisseur_name || "Lotisseur"} ({parcelles.filter(p => p.attribution === "lotisseur").length})
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {filteredParcelles.length === 0 && searchQuery ? (
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">Aucun résultat</p>
            <p className="text-sm text-muted-foreground mt-1">
              Aucune parcelle ne correspond à "{searchQuery}"
            </p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => setSearchQuery("")}
            >
              Effacer la recherche
            </Button>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                 <TableRow>
                  <TableHead>N° Lot</TableHead>
                  <TableHead>Îlot</TableHead>
                  <TableHead>Attribution</TableHead>
                  <TableHead>Superficie</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Statut</TableHead>
                  {isAdmin && <TableHead>Gestionnaire</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredParcelles.map((parcelle) => {
                const ilotName = getIlotName(parcelle.ilot_id);
                return (
                  <TableRow key={parcelle.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {parcelle.plot_number}
                        {!isAdmin && parcelle.beneficiaire_id && beneficiaires.find(b => b.id === parcelle.beneficiaire_id && b.member_user_id === user?.id) && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Star className="h-3 w-3" />
                            Mon lot
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  <TableCell>
                    {ilotName ? (
                      <Badge variant="outline" className="gap-1">
                        <Layers className="h-3 w-3" />
                        {ilotName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const beneficiaire = parcelle.beneficiaire_id
                        ? beneficiaires.find(b => b.id === parcelle.beneficiaire_id)
                        : null;
                      const partieLabel = parcelle.attribution === "proprietaire"
                        ? (lotissement?.proprietaire_name || "Propriétaire")
                        : parcelle.attribution === "lotisseur"
                        ? (lotissement?.lotisseur_name || "Lotisseur")
                        : null;

                      if (beneficiaire) {
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col gap-0.5">
                                <Badge className={parcelle.attribution === "proprietaire"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-100 gap-1"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 hover:bg-amber-100 gap-1"
                                }>
                                  <User className="h-3 w-3" />
                                  {beneficiaire.nom}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Attribué par : <strong>{partieLabel}</strong></p>
                              {beneficiaire.lien_role && <p className="text-xs">{beneficiaire.lien_role}</p>}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      if (parcelle.attribution === "proprietaire") {
                        return (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-100 gap-1">
                            <User className="h-3 w-3" />
                            {partieLabel}
                          </Badge>
                        );
                      }
                      if (parcelle.attribution === "lotisseur") {
                        return (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 hover:bg-amber-100 gap-1">
                            <Building2 className="h-3 w-3" />
                            {partieLabel}
                          </Badge>
                        );
                      }
                      return <span className="text-muted-foreground text-sm">-</span>;
                    })()}
                  </TableCell>
                  <TableCell>{parcelle.area.toLocaleString("fr-FR")} m²</TableCell>
                  <TableCell>{parcelle.price.toLocaleString("fr-FR")} F CFA</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLES[parcelle.status]}>
                      {parcelle.status === "disponible" && "Disponible"}
                      {parcelle.status === "reserve" && "Réservé"}
                      {parcelle.status === "vendu" && "Vendu"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {parcelle.assigned_to && userProfilesMap?.get(parcelle.assigned_to) ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-sm">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[100px]">
                                {userProfilesMap.get(parcelle.assigned_to)}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {userProfilesMap.get(parcelle.assigned_to)}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  )}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {parcelle.status === "disponible" && (
                        <>
                          <DropdownMenuItem onClick={() => setSellingParcelle(parcelle)}>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Vendre
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setReservingParcelle(parcelle)}>
                            <BookmarkPlus className="h-4 w-4 mr-2" />
                            Réserver
                          </DropdownMenuItem>
                        </>
                      )}
                      {parcelle.status === "reserve" && (
                        <DropdownMenuItem onClick={() => setViewingReservation(parcelle)}>
                          <BookmarkPlus className="h-4 w-4 mr-2" />
                          Voir réservation
                        </DropdownMenuItem>
                      )}
                      {canEdit && (
                        <DropdownMenuItem onClick={() => setEditingParcelle(parcelle)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                      )}
                      {canDelete && parcelle.status !== "vendu" && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingId(parcelle.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              );
            })}
            </TableBody>
          </Table>
          </div>
        )}
      </Card>

      {/* Reservation card for selected reserved parcelle */}
      {viewingReservation && viewingReservation.status === "reserve" && (
        <ReservationModalList parcelleId={viewingReservation.id} plotNumber={viewingReservation.plot_number} parcelle={viewingReservation} lotissementId={lotissementId} open={!!viewingReservation} onOpenChange={(open) => !open && setViewingReservation(null)} />
      )}

      {editingParcelle && (
        <EditParcelleDialog
          parcelle={editingParcelle}
          open={!!editingParcelle}
          onOpenChange={(open) => !open && setEditingParcelle(null)}
          existingNumbers={parcelles.filter(p => p.id !== editingParcelle.id).map(p => p.plot_number)}
        />
      )}

      {sellingParcelle && (
        <SellParcelleDialog
          parcelle={sellingParcelle}
          open={!!sellingParcelle}
          onOpenChange={(open) => !open && setSellingParcelle(null)}
        />
      )}

      {reservingParcelle && (
        <ReserveParcelleDialog
          parcelle={reservingParcelle}
          open={!!reservingParcelle}
          onOpenChange={(open) => !open && setReservingParcelle(null)}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette parcelle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
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
    </>
  );
}
