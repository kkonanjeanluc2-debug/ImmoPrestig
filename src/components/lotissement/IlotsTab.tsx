import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Layers, 
  MoreVertical, 
  Pencil, 
  Trash2,
  Grid3X3,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";
import { useIlotsWithStats, useDeleteIlot, IlotWithStats } from "@/hooks/useIlots";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { AddIlotDialog } from "./AddIlotDialog";
import { EditIlotDialog } from "./EditIlotDialog";
import { toast } from "sonner";

interface IlotsTabProps {
  lotissementId: string;
  lotissementName: string;
}

export function IlotsTab({ lotissementId, lotissementName }: IlotsTabProps) {
  const { data: ilots, isLoading } = useIlotsWithStats(lotissementId);
  const deleteIlot = useDeleteIlot();
  const { canCreate, canEdit, canDelete } = usePermissions();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingIlot, setEditingIlot] = useState<IlotWithStats | null>(null);
  const [deletingIlot, setDeletingIlot] = useState<IlotWithStats | null>(null);

  const handleDelete = async () => {
    if (!deletingIlot) return;
    try {
      await deleteIlot.mutateAsync({ id: deletingIlot.id, name: deletingIlot.name });
      toast.success("Îlot supprimé avec succès");
      setDeletingIlot(null);
    } catch (error) {
      toast.error("Erreur lors de la suppression de l'îlot");
    }
  };

  // Calculate totals
  const totalParcelles = ilots?.reduce((sum, i) => sum + i.parcelles_count, 0) || 0;
  const totalVendues = ilots?.reduce((sum, i) => sum + i.parcelles_vendues, 0) || 0;
  const totalDisponibles = ilots?.reduce((sum, i) => sum + i.parcelles_disponibles, 0) || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{ilots?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Îlots</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{totalParcelles}</p>
              <p className="text-sm text-muted-foreground">Parcelles assignées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{totalDisponibles}</p>
              <p className="text-sm text-muted-foreground">Disponibles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{totalVendues}</p>
              <p className="text-sm text-muted-foreground">Vendues</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Gestion des îlots
            </CardTitle>
            <CardDescription>
              Regroupez vos parcelles en îlots pour une meilleure organisation
            </CardDescription>
          </div>
          {canCreate && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel îlot
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!ilots?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun îlot créé</p>
              <p className="text-sm mt-1">
                Créez des îlots pour organiser vos parcelles en zones distinctes
              </p>
              {canCreate && (
                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer le premier îlot
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Îlot</TableHead>
                    <TableHead>Superficie</TableHead>
                    <TableHead className="text-center">Parcelles</TableHead>
                    <TableHead className="text-center">Disponibles</TableHead>
                    <TableHead className="text-center">Vendues</TableHead>
                    <TableHead className="text-center">Taux occupation</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ilots.map((ilot) => {
                    const occupancyRate = ilot.parcelles_count > 0 
                      ? Math.round((ilot.parcelles_vendues / ilot.parcelles_count) * 100) 
                      : 0;

                    return (
                      <TableRow key={ilot.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                              <Layers className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{ilot.name}</p>
                              {ilot.description && (
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {ilot.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {ilot.total_area 
                            ? `${ilot.total_area.toLocaleString("fr-FR")} m²` 
                            : "—"
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="gap-1">
                            <Grid3X3 className="h-3 w-3" />
                            {ilot.parcelles_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-emerald-500 text-emerald-600 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {ilot.parcelles_disponibles}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-blue-500 text-blue-600 gap-1">
                            <ShoppingCart className="h-3 w-3" />
                            {ilot.parcelles_vendues}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${occupancyRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{occupancyRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(canEdit || canDelete) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canEdit && (
                                  <DropdownMenuItem onClick={() => setEditingIlot(ilot)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => setDeletingIlot(ilot)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </>
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
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <AddIlotDialog
        lotissementId={lotissementId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {/* Edit Dialog */}
      {editingIlot && (
        <EditIlotDialog
          ilot={editingIlot}
          open={!!editingIlot}
          onOpenChange={(open) => !open && setEditingIlot(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingIlot} onOpenChange={(open) => !open && setDeletingIlot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'îlot ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'îlot "{deletingIlot?.name}" sera supprimé. Les parcelles associées ne seront pas supprimées mais ne seront plus liées à cet îlot.
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
    </div>
  );
}
