import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useCreateBulkParcelles } from "@/hooks/useParcelles";
import { toast } from "sonner";

interface AddBulkParcellesDialogProps {
  lotissementId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNumbers: string[];
}

export function AddBulkParcellesDialog({ 
  lotissementId, 
  open, 
  onOpenChange, 
  existingNumbers 
}: AddBulkParcellesDialogProps) {
  const createBulkParcelles = useCreateBulkParcelles();
  const [formData, setFormData] = useState({
    prefix: "",
    startNumber: "1",
    count: "10",
    area: "",
    price: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const count = parseInt(formData.count);
    const startNumber = parseInt(formData.startNumber);

    if (!formData.area || !formData.price || count < 1) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const parcelles = [];
    const existingLower = existingNumbers.map(n => n.toLowerCase());

    for (let i = 0; i < count; i++) {
      const plotNumber = formData.prefix 
        ? `${formData.prefix}${startNumber + i}`
        : `${startNumber + i}`;

      if (existingLower.includes(plotNumber.toLowerCase())) {
        toast.error(`Le lot ${plotNumber} existe déjà`);
        return;
      }

      parcelles.push({
        lotissement_id: lotissementId,
        plot_number: plotNumber,
        area: parseFloat(formData.area),
        price: parseFloat(formData.price),
        status: "disponible" as const,
      });
    }

    try {
      await createBulkParcelles.mutateAsync(parcelles);
      toast.success(`${count} parcelles créées avec succès`);
      setFormData({
        prefix: "",
        startNumber: "1",
        count: "10",
        area: "",
        price: "",
      });
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la création des parcelles");
    }
  };

  const previewNumbers = () => {
    const count = Math.min(parseInt(formData.count) || 0, 5);
    const startNumber = parseInt(formData.startNumber) || 1;
    const numbers = [];
    for (let i = 0; i < count; i++) {
      numbers.push(formData.prefix ? `${formData.prefix}${startNumber + i}` : `${startNumber + i}`);
    }
    if (parseInt(formData.count) > 5) numbers.push("...");
    return numbers.join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter des parcelles en masse</DialogTitle>
          <DialogDescription>
            Créez plusieurs parcelles avec les mêmes caractéristiques
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prefix">Préfixe</Label>
              <Input
                id="prefix"
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                placeholder="ex: A, B, Lot-"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startNumber">Début *</Label>
              <Input
                id="startNumber"
                type="number"
                min="1"
                value={formData.startNumber}
                onChange={(e) => setFormData({ ...formData, startNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="count">Nombre *</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="100"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: e.target.value })}
              />
            </div>
          </div>

          {previewNumbers() && (
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
              Aperçu : {previewNumbers()}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Superficie par lot (m²) *</Label>
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
              <Label htmlFor="price">Prix par lot (F CFA) *</Label>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createBulkParcelles.isPending}>
              {createBulkParcelles.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Créer {formData.count} parcelles
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
