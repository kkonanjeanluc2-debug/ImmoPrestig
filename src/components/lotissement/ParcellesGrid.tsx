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
import { MoreVertical, Pencil, Trash2, ShoppingCart } from "lucide-react";
import { Parcelle, useDeleteParcelle } from "@/hooks/useParcelles";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { EditParcelleDialog } from "./EditParcelleDialog";
import { SellParcelleDialog } from "./SellParcelleDialog";

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

export function ParcellesGrid({ parcelles, lotissementId }: ParcellesGridProps) {
  const { canEdit, canDelete } = usePermissions();
  const deleteParcelle = useDeleteParcelle();

  const [editingParcelle, setEditingParcelle] = useState<Parcelle | null>(null);
  const [sellingParcelle, setSellingParcelle] = useState<Parcelle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    const parcelle = parcelles.find(p => p.id === deletingId);
    try {
      await deleteParcelle.mutateAsync({ id: deletingId, plotNumber: parcelle?.plot_number });
      toast.success("Parcelle supprimée avec succès");
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
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {parcelles.map((parcelle) => (
          <Card
            key={parcelle.id}
            className={`relative cursor-pointer hover:shadow-md transition-all border-2 ${STATUS_BG[parcelle.status]}`}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="font-bold text-lg">{parcelle.plot_number}</div>
                {(canEdit || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1">
                        <MoreVertical className="h-3 w-3" />
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
                )}
              </div>
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
        ))}
      </div>

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
