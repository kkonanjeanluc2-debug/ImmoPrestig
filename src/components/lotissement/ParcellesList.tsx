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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { MoreVertical, Pencil, Trash2, ShoppingCart, Layers, Search, X, User } from "lucide-react";
import { Parcelle, useSoftDeleteParcelle } from "@/hooks/useParcelles";
import { useIlots } from "@/hooks/useIlots";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfiles } from "@/hooks/useAssignedUserProfile";
import { toast } from "sonner";
import { EditParcelleDialog } from "./EditParcelleDialog";
import { SellParcelleDialog } from "./SellParcelleDialog";

interface ParcellesListProps {
  parcelles: Parcelle[];
  lotissementId: string;
}

const STATUS_STYLES = {
  disponible: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  reserve: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  vendu: "bg-blue-500/10 text-blue-600 border-blue-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  disponible: "Disponible",
  reserve: "Réservé",
  vendu: "Vendu",
};

export function ParcellesList({ parcelles, lotissementId }: ParcellesListProps) {
  const { hasPermission, role } = usePermissions();
  const canCreate = hasPermission("can_create_parcelles");
  const canEdit = hasPermission("can_edit_lotissements");
  const canDelete = hasPermission("can_delete_lotissements");
  const deleteParcelle = useSoftDeleteParcelle();
  const { data: ilots } = useIlots(lotissementId);
  const isAdmin = role !== "gestionnaire";

  // Fetch profiles for assigned users
  const assignedUserIds = parcelles?.map(p => p.assigned_to) || [];
  const { data: userProfilesMap } = useUserProfiles(assignedUserIds);

  const [editingParcelle, setEditingParcelle] = useState<Parcelle | null>(null);
  const [sellingParcelle, setSellingParcelle] = useState<Parcelle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const getIlotName = (ilotId: string | null) => {
    if (!ilotId) return null;
    return ilots?.find(i => i.id === ilotId)?.name || null;
  };

  // Filter parcelles based on search query
  const filteredParcelles = useMemo(() => {
    if (!searchQuery.trim()) return parcelles;
    
    const query = searchQuery.toLowerCase();
    return parcelles.filter((parcelle) => {
      const ilotName = getIlotName(parcelle.ilot_id)?.toLowerCase() || "";
      const statusLabel = STATUS_LABELS[parcelle.status]?.toLowerCase() || "";
      
      return (
        parcelle.plot_number.toLowerCase().includes(query) ||
        ilotName.includes(query) ||
        statusLabel.includes(query) ||
        parcelle.area.toString().includes(query) ||
        parcelle.price.toString().includes(query)
      );
    });
  }, [parcelles, searchQuery, ilots]);

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
        {/* Search Bar */}
        {parcelles.length > 0 && (
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
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
                    <TableCell className="font-medium">{parcelle.plot_number}</TableCell>
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
                        <DropdownMenuItem onClick={() => setSellingParcelle(parcelle)}>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Vendre
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
