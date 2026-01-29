import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { useCreateParcelle, PlotStatus, Parcelle } from "@/hooks/useParcelles";
import { useIlots } from "@/hooks/useIlots";
import { toast } from "sonner";

interface AddParcelleDialogProps {
  lotissementId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNumbers: string[];
  existingParcelles?: Parcelle[];
}

export function AddParcelleDialog({ 
  lotissementId, 
  open, 
  onOpenChange, 
  existingNumbers,
  existingParcelles = []
}: AddParcelleDialogProps) {
  const createParcelle = useCreateParcelle();
  const { data: ilots } = useIlots(lotissementId);
  const [formData, setFormData] = useState({
    plot_number: "",
    area: "",
    price: "",
    status: "disponible" as PlotStatus,
    ilot_id: "",
    notes: "",
  });

  const isDuplicate = existingNumbers.some(
    n => n.toLowerCase() === formData.plot_number.trim().toLowerCase()
  );

  // Check if adding to this îlot would exceed capacity
  const ilotCapacityInfo = useMemo(() => {
    if (!formData.ilot_id || !ilots) {
      return { currentCount: 0, maxCount: null, wouldExceed: false };
    }
    
    const selectedIlot = ilots.find(i => i.id === formData.ilot_id);
    if (!selectedIlot) {
      return { currentCount: 0, maxCount: null, wouldExceed: false };
    }

    const currentCount = existingParcelles.filter(p => p.ilot_id === formData.ilot_id).length;
    const maxCount = selectedIlot.plots_count;
    const wouldExceed = maxCount !== null && (currentCount + 1) > maxCount;
    const remainingCapacity = maxCount !== null ? Math.max(0, maxCount - currentCount) : null;

    return { currentCount, maxCount, wouldExceed, remainingCapacity };
  }, [formData.ilot_id, ilots, existingParcelles]);

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
      await createParcelle.mutateAsync({
        lotissement_id: lotissementId,
        plot_number: formData.plot_number.trim(),
        area: parseFloat(formData.area),
        price: parseFloat(formData.price),
        status: formData.status,
        ilot_id: formData.ilot_id || null,
        notes: formData.notes.trim() || null,
      });

      toast.success("Parcelle créée avec succès");
      setFormData({
        plot_number: "",
        area: "",
        price: "",
        status: "disponible",
        ilot_id: "",
        notes: "",
      });
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la création de la parcelle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle parcelle</DialogTitle>
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
                placeholder="ex: 500"
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
                placeholder="ex: 5000000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as PlotStatus })}
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
                    const currentCount = existingParcelles.filter(p => p.ilot_id === ilot.id).length;
                    const isFull = ilot.plots_count !== null && currentCount >= ilot.plots_count;
                    return (
                      <SelectItem key={ilot.id} value={ilot.id} disabled={isFull}>
                        {ilot.name}
                        {ilot.plots_count !== null && (
                          <span className={`ml-2 text-xs ${isFull ? "text-destructive" : "text-muted-foreground"}`}>
                            ({currentCount}/{ilot.plots_count})
                          </span>
                        )}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {/* Warning if would exceed îlot capacity */}
              {ilotCapacityInfo.wouldExceed && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  L'îlot est plein ({ilotCapacityInfo.currentCount}/{ilotCapacityInfo.maxCount} lots)
                </p>
              )}
              {/* Info about current capacity */}
              {formData.ilot_id && ilotCapacityInfo.maxCount !== null && !ilotCapacityInfo.wouldExceed && (
                <p className="text-xs text-muted-foreground">
                  Capacité : {ilotCapacityInfo.currentCount}/{ilotCapacityInfo.maxCount} lots
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createParcelle.isPending || isDuplicate || ilotCapacityInfo.wouldExceed}>
              {createParcelle.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
