import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { Parcelle, PlotStatus, useUpdateParcelle, useParcelles } from "@/hooks/useParcelles";
import { useIlots } from "@/hooks/useIlots";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { AssignUserSelect } from "@/components/assignment/AssignUserSelect";

interface EditParcelleDialogProps {
  parcelle: Parcelle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNumbers: string[];
}

export function EditParcelleDialog({ 
  parcelle, 
  open, 
  onOpenChange, 
  existingNumbers 
}: EditParcelleDialogProps) {
  const updateParcelle = useUpdateParcelle();
  const { data: ilots } = useIlots(parcelle.lotissement_id);
  const { data: allParcelles } = useParcelles(parcelle.lotissement_id);
  const { role } = usePermissions();
  const isAdmin = role === "admin" || role === "super_admin";
  
  const [formData, setFormData] = useState({
    plot_number: "",
    area: "",
    price: "",
    status: "disponible" as PlotStatus,
    ilot_id: "",
    notes: "",
    assigned_to: null as string | null,
  });

  useEffect(() => {
    if (parcelle) {
      setFormData({
        plot_number: parcelle.plot_number,
        area: parcelle.area.toString(),
        price: parcelle.price.toString(),
        status: parcelle.status,
        ilot_id: parcelle.ilot_id || "",
        notes: parcelle.notes || "",
        assigned_to: parcelle.assigned_to,
      });
    }
  }, [parcelle]);

  const isDuplicate = existingNumbers.some(
    n => n.toLowerCase() === formData.plot_number.trim().toLowerCase()
  );

  // Check if changing ilot would exceed capacity
  const ilotCapacityInfo = useMemo(() => {
    if (!formData.ilot_id || !ilots || !allParcelles) {
      return { currentCount: 0, maxCount: null, wouldExceed: false };
    }
    
    const selectedIlot = ilots.find(i => i.id === formData.ilot_id);
    if (!selectedIlot || selectedIlot.plots_count === null) {
      return { currentCount: 0, maxCount: null, wouldExceed: false };
    }

    // Count parcelles in this ilot, excluding the current one being edited
    const currentCount = allParcelles.filter(p => p.ilot_id === formData.ilot_id && p.id !== parcelle.id).length;
    const maxCount = selectedIlot.plots_count;
    const wouldExceed = (currentCount + 1) > maxCount;

    return { currentCount, maxCount, wouldExceed };
  }, [formData.ilot_id, ilots, allParcelles, parcelle.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plot_number.trim() || !formData.area || !formData.price) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    if (isDuplicate) {
      toast.error("Ce numéro de lot existe déjà");
      return;
    }

    try {
      await updateParcelle.mutateAsync({
        id: parcelle.id,
        plot_number: formData.plot_number.trim(),
        area: parseFloat(formData.area),
        price: parseFloat(formData.price),
        status: formData.status,
        ilot_id: formData.ilot_id || null,
        notes: formData.notes.trim() || null,
        assigned_to: formData.assigned_to,
      });

      toast.success("Parcelle modifiée avec succès");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la parcelle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plot_number">Numéro de lot *</Label>
            <Input
              id="plot_number"
              value={formData.plot_number}
              onChange={(e) => setFormData({ ...formData, plot_number: e.target.value })}
              placeholder="ex: A1, B12, Lot 25..."
              className={isDuplicate ? "border-destructive" : ""}
            />
            {isDuplicate && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Ce numéro de lot existe déjà
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Superficie (m²) *</Label>
              <Input
                id="area"
                type="number"
                min="0"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Prix (F CFA) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as PlotStatus })}
                disabled={parcelle.status === "vendu"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="reserve">Réservé</SelectItem>
                  <SelectItem value="vendu">Vendu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ilot">Îlot</Label>
              <Select
                value={formData.ilot_id}
                onValueChange={(value) => setFormData({ ...formData, ilot_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun îlot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun îlot</SelectItem>
                  {ilots?.map((ilot) => {
                    const count = allParcelles?.filter(p => p.ilot_id === ilot.id && p.id !== parcelle.id).length || 0;
                    const isFull = ilot.plots_count !== null && count >= ilot.plots_count;
                    return (
                      <SelectItem key={ilot.id} value={ilot.id} disabled={isFull}>
                        {ilot.name}
                        {ilot.plots_count !== null && (
                          <span className={`ml-2 text-xs ${isFull ? "text-destructive" : "text-muted-foreground"}`}>
                            ({count}/{ilot.plots_count})
                          </span>
                        )}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {ilotCapacityInfo.wouldExceed && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  L'îlot est plein ({ilotCapacityInfo.currentCount}/{ilotCapacityInfo.maxCount} lots)
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label>Assigné à</Label>
              <AssignUserSelect
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                placeholder="Assigner à un gestionnaire"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateParcelle.isPending || isDuplicate || ilotCapacityInfo.wouldExceed}>
              {updateParcelle.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
