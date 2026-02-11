import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { MoreVertical, Pencil, Trash2, ShoppingCart, Layers, BookmarkPlus } from "lucide-react";
import { Parcelle, useSoftDeleteParcelle } from "@/hooks/useParcelles";
import { useIlots } from "@/hooks/useIlots";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { EditParcelleDialog } from "./EditParcelleDialog";
import { SellParcelleDialog } from "./SellParcelleDialog";
import { ReserveParcelleDialog } from "./ReserveParcelleDialog";
import { ReservationParcelleCard } from "./ReservationParcelleCard";
import { useReservationByParcelle } from "@/hooks/useReservationsParcelles";

interface ParcellesGridProps {
  parcelles: Parcelle[];
  lotissementId: string;
}

const STATUS_STYLES = {
  disponible: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  reserve: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  vendu: "bg-blue-500/10 text-blue-600 border-blue-500/30",
};

const STATUS_BG = {
  disponible: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900",
  reserve: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900",
  vendu: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
};

function ReservationPanel({ parcelleId, plotNumber, parcelle, onClose }: { parcelleId: string; plotNumber: string; parcelle?: Parcelle; onClose: () => void }) {
  const { data: reservation, isLoading } = useReservationByParcelle(parcelleId);

  if (isLoading) return <div className="mt-4"><Card><CardContent className="p-4 text-center text-muted-foreground">Chargement...</CardContent></Card></div>;
  if (!reservation) return <div className="mt-4"><Card><CardContent className="p-4 text-center text-muted-foreground">Aucune réservation trouvée pour le lot {plotNumber}</CardContent></Card></div>;

  return (
    <div className="mt-4 max-w-md">
      <ReservationParcelleCard reservation={reservation} parcelle={parcelle} />
    </div>
  );
}

export function ParcellesGrid({ parcelles, lotissementId }: ParcellesGridProps) {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("can_create_parcelles");
  const canEdit = hasPermission("can_edit_lotissements");
  const canDelete = hasPermission("can_delete_lotissements");
  const deleteParcelle = useSoftDeleteParcelle();
  const { data: ilots } = useIlots(lotissementId);

  const [editingParcelle, setEditingParcelle] = useState<Parcelle | null>(null);
  const [sellingParcelle, setSellingParcelle] = useState<Parcelle | null>(null);
  const [reservingParcelle, setReservingParcelle] = useState<Parcelle | null>(null);
  const [viewingReservation, setViewingReservation] = useState<Parcelle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getIlotName = (ilotId: string | null) => {
    if (!ilotId) return null;
    return ilots?.find(i => i.id === ilotId)?.name || null;
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
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
        {parcelles.map((parcelle) => {
          const ilotName = getIlotName(parcelle.ilot_id);
          return (
            <Card
              key={parcelle.id}
              className={`relative cursor-pointer hover:shadow-md transition-all border-2 ${STATUS_BG[parcelle.status]} ${viewingReservation?.id === parcelle.id ? "ring-2 ring-amber-500" : ""}`}
              onClick={() => parcelle.status === "reserve" ? setViewingReservation(parcelle) : undefined}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="font-bold text-lg">{parcelle.plot_number}</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1">
                        <MoreVertical className="h-3 w-3" />
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
                </div>
                {ilotName && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                    <Layers className="h-2.5 w-2.5" />
                    {ilotName}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{parcelle.area} m²</p>
                <p className="text-sm font-medium mt-1">
                  {parcelle.price.toLocaleString("fr-FR")} F
                </p>
                <Badge
                  variant="outline"
                  className={`mt-2 text-[10px] ${STATUS_STYLES[parcelle.status]}`}
                >
                  {parcelle.status === "disponible" && "Dispo"}
                  {parcelle.status === "reserve" && "Réservé"}
                  {parcelle.status === "vendu" && "Vendu"}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reservation card for selected reserved parcelle */}
      {viewingReservation && viewingReservation.status === "reserve" && (
        <ReservationPanel parcelleId={viewingReservation.id} plotNumber={viewingReservation.plot_number} parcelle={viewingReservation} onClose={() => setViewingReservation(null)} />
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
