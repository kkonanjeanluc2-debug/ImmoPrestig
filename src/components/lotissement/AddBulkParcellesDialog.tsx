import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { useCreateBulkParcelles } from "@/hooks/useParcelles";
import { useIlots } from "@/hooks/useIlots";
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
  const { data: ilots } = useIlots(lotissementId);
  
  const [formData, setFormData] = useState({
    prefix: "",
    startNumber: "1",
    count: "10",
    area: "",
    price: "",
    ilot_id: "",
  });

  // Calculate total area of the parcelles being created
  const totalArea = useMemo(() => {
    const count = parseInt(formData.count) || 0;
    const area = parseFloat(formData.area) || 0;
    return count * area;
  }, [formData.count, formData.area]);

  // Find matching îlots (where total_area equals total area of parcelles)
  const matchingIlots = useMemo(() => {
    if (!ilots || totalArea === 0) return [];
    return ilots.filter(ilot => {
      if (!ilot.total_area) return false;
      // Allow a small tolerance (0.1%) for floating point comparison
      const diff = Math.abs(ilot.total_area - totalArea);
      const tolerance = totalArea * 0.001;
      return diff <= tolerance;
    });
  }, [ilots, totalArea]);

  // Check if selected îlot still matches
  const selectedIlotMatches = useMemo(() => {
    if (!formData.ilot_id || formData.ilot_id === "none") return true;
    return matchingIlots.some(i => i.id === formData.ilot_id);
  }, [formData.ilot_id, matchingIlots]);

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
        ilot_id: formData.ilot_id && formData.ilot_id !== "none" ? formData.ilot_id : null,
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
        ilot_id: "",
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

          {/* Îlot selector - only shown when there are îlots */}
          {ilots && ilots.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="ilot" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Assigner à un îlot
              </Label>
              <Select
                value={formData.ilot_id}
                onValueChange={(value) => setFormData({ ...formData, ilot_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un îlot (optionnel)" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">Aucun îlot</SelectItem>
                  {ilots.map((ilot) => {
                    const isMatching = matchingIlots.some(m => m.id === ilot.id);
                    return (
                      <SelectItem 
                        key={ilot.id} 
                        value={ilot.id}
                        className={isMatching ? "text-emerald-600" : ""}
                      >
                        <span className="flex items-center gap-2">
                          {ilot.name}
                          {ilot.total_area && (
                            <span className="text-xs text-muted-foreground">
                              ({ilot.total_area.toLocaleString("fr-FR")} m²)
                            </span>
                          )}
                          {isMatching && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {/* Info about matching */}
              {totalArea > 0 && (
                <div className="text-xs text-muted-foreground">
                  Superficie totale : {totalArea.toLocaleString("fr-FR")} m²
                  {matchingIlots.length > 0 ? (
                    <span className="text-emerald-600 ml-2">
                      ({matchingIlots.length} îlot{matchingIlots.length > 1 ? "s" : ""} correspond{matchingIlots.length > 1 ? "ent" : ""})
                    </span>
                  ) : (
                    <span className="text-muted-foreground ml-2">
                      (aucun îlot correspondant)
                    </span>
                  )}
                </div>
              )}

              {/* Warning if selected îlot doesn't match */}
              {formData.ilot_id && formData.ilot_id !== "none" && !selectedIlotMatches && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  La superficie de l'îlot ne correspond pas à la superficie totale des lots
                </p>
              )}
            </div>
          )}

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
