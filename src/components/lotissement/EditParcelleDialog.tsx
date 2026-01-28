import { useState, useEffect } from "react";
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
import { Parcelle, PlotStatus, useUpdateParcelle } from "@/hooks/useParcelles";
import { useIlots } from "@/hooks/useIlots";
import { toast } from "sonner";

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
  const [formData, setFormData] = useState({
    plot_number: "",
    area: "",
    price: "",
    status: "disponible" as PlotStatus,
    ilot_id: "",
    notes: "",
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
      });
    }
  }, [parcelle]);

  const isDuplicate = existingNumbers.some(
    n => n.toLowerCase() === formData.plot_number.trim().toLowerCase()
  );

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
                  {ilots?.map((ilot) => (
                    <SelectItem key={ilot.id} value={ilot.id}>
                      {ilot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateParcelle.isPending || isDuplicate}>
              {updateParcelle.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
