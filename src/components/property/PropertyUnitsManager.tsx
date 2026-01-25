import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, DoorOpen, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  usePropertyUnits,
  useCreatePropertyUnit,
  useUpdatePropertyUnit,
  useDeletePropertyUnit,
  PropertyUnit,
} from "@/hooks/usePropertyUnits";
import { UnitForm, UnitFormData } from "./UnitForm";

interface PropertyUnitsManagerProps {
  propertyId: string;
  canEdit?: boolean;
}

const defaultFormData: UnitFormData = {
  unit_number: "",
  rooms_count: 1,
  rent_amount: 0,
  area: null,
  status: "disponible",
};

export const PropertyUnitsManager = ({ propertyId, canEdit = true }: PropertyUnitsManagerProps) => {
  const { data: units = [], isLoading } = usePropertyUnits(propertyId);
  const createUnit = useCreatePropertyUnit();
  const updateUnit = useUpdatePropertyUnit();
  const deleteUnit = useDeletePropertyUnit();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<PropertyUnit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<PropertyUnit | null>(null);
  const [formData, setFormData] = useState<UnitFormData>(defaultFormData);

  const resetForm = () => {
    setFormData(defaultFormData);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unit_number.trim()) {
      toast.error("Le numéro de porte est requis");
      return;
    }
    if (formData.rent_amount <= 0) {
      toast.error("Le loyer doit être supérieur à 0");
      return;
    }

    try {
      await createUnit.mutateAsync({
        property_id: propertyId,
        unit_number: formData.unit_number,
        rooms_count: formData.rooms_count,
        rent_amount: formData.rent_amount,
        area: formData.area,
        status: formData.status,
      });
      toast.success("Porte ajoutée avec succès");
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;

    try {
      await updateUnit.mutateAsync({
        id: editingUnit.id,
        unit_number: formData.unit_number,
        rooms_count: formData.rooms_count,
        rent_amount: formData.rent_amount,
        area: formData.area,
        status: formData.status,
      });
      toast.success("Porte modifiée avec succès");
      setEditingUnit(null);
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de la modification");
    }
  };

  const handleDelete = async () => {
    if (!deletingUnit) return;
    try {
      await deleteUnit.mutateAsync({ id: deletingUnit.id, propertyId });
      toast.success("Porte supprimée");
      setDeletingUnit(null);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const openEditDialog = (unit: PropertyUnit) => {
    setFormData({
      unit_number: unit.unit_number,
      rooms_count: unit.rooms_count,
      rent_amount: unit.rent_amount,
      area: unit.area,
      status: unit.status,
    });
    setEditingUnit(unit);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " F CFA";
  };

  const statusColors: Record<string, string> = {
    disponible: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    occupé: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "en attente": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  };

  const existingUnitNumbers = units.map(u => u.unit_number);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Portes / Unités ({units.length})</h3>
        </div>
        {canEdit && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" onClick={resetForm}>
                <Plus className="h-4 w-4" />
                Ajouter une porte
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Ajouter une porte</DialogTitle>
              </DialogHeader>
              <UnitForm 
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleAddSubmit}
                onCancel={() => {
                  setIsAddOpen(false);
                  resetForm();
                }}
                isLoading={createUnit.isPending}
                existingUnitNumbers={existingUnitNumbers}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {units.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <DoorOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Aucune porte configurée pour ce bien.</p>
          {canEdit && (
            <p className="text-sm mt-1">Ajoutez des portes pour gérer plusieurs unités locatives.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {units.map((unit) => (
            <Card key={unit.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DoorOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{unit.unit_number}</span>
                        <Badge variant="outline" className={statusColors[unit.status]}>
                          {unit.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {unit.rooms_count} pièce{unit.rooms_count > 1 ? "s" : ""}
                        {unit.area && ` • ${unit.area} m²`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-primary">
                        {formatCurrency(unit.rent_amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">/ mois</div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(unit)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingUnit(unit)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingUnit} onOpenChange={(open) => !open && setEditingUnit(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Modifier la porte</DialogTitle>
          </DialogHeader>
          <UnitForm 
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleEditSubmit}
            onCancel={() => {
              setEditingUnit(null);
              resetForm();
            }}
            isEdit
            isLoading={updateUnit.isPending}
            existingUnitNumbers={existingUnitNumbers}
            editingUnitNumber={editingUnit?.unit_number}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingUnit} onOpenChange={(open) => !open && setDeletingUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette porte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{deletingUnit?.unit_number}" ? 
              Cette action est irréversible et supprimera également les contrats associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
