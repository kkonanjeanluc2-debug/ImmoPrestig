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
import { Loader2 } from "lucide-react";
import { useUpdateLotissement, Lotissement } from "@/hooks/useLotissements";
import { toast } from "sonner";

interface EditLotissementDialogProps {
  lotissement: Lotissement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLotissementDialog({ lotissement, open, onOpenChange }: EditLotissementDialogProps) {
  const updateLotissement = useUpdateLotissement();
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    city: "",
    total_area: "",
    description: "",
  });

  useEffect(() => {
    if (lotissement) {
      setFormData({
        name: lotissement.name,
        location: lotissement.location,
        city: lotissement.city || "Abidjan",
        total_area: lotissement.total_area?.toString() || "",
        description: lotissement.description || "",
      });
    }
  }, [lotissement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.location.trim()) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    try {
      await updateLotissement.mutateAsync({
        id: lotissement.id,
        name: formData.name.trim(),
        location: formData.location.trim(),
        city: formData.city.trim() || "Abidjan",
        total_area: formData.total_area ? parseFloat(formData.total_area) : null,
        description: formData.description.trim() || null,
      });

      toast.success("Lotissement modifié avec succès");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le lotissement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du lotissement *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: Résidence Les Palmiers"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Localisation *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="ex: Cocody Angré"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Abidjan"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_area">Superficie totale (m²)</Label>
            <Input
              id="total_area"
              type="number"
              min="0"
              value={formData.total_area}
              onChange={(e) => setFormData({ ...formData, total_area: e.target.value })}
              placeholder="ex: 50000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description du projet de lotissement..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateLotissement.isPending}>
              {updateLotissement.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
