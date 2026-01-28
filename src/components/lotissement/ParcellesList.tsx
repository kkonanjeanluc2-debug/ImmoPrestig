import { useState } from "react";
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
import { MoreVertical, Pencil, Trash2, ShoppingCart, Layers } from "lucide-react";
import { Parcelle, useDeleteParcelle } from "@/hooks/useParcelles";
import { useIlots } from "@/hooks/useIlots";
import { usePermissions } from "@/hooks/usePermissions";
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

export function ParcellesList({ parcelles, lotissementId }: ParcellesListProps) {
  const { canEdit, canDelete } = usePermissions();
  const deleteParcelle = useDeleteParcelle();
  const { data: ilots } = useIlots(lotissementId);

  const [editingParcelle, setEditingParcelle] = useState<Parcelle | null>(null);
  const [sellingParcelle, setSellingParcelle] = useState<Parcelle | null>(null);
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
      <Card>
        <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>N° Lot</TableHead>
                <TableHead>Îlot</TableHead>
                <TableHead>Superficie</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {parcelles.map((parcelle) => {
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
                <TableCell className="text-right">
                  {(canEdit || canDelete) && (
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
                  )}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
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
