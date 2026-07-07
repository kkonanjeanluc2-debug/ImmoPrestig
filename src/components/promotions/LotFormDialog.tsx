import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateLot,
  useUpdateLot,
  TYPE_BIEN_LABELS,
  STATUT_LOT_LABELS,
  type LotProgramme,
  type StatutLot,
  type TypeBien,
} from "@/hooks/usePromotionsImmobilieres";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programmeId: string;
  lot?: LotProgramme | null;
}

export function LotFormDialog({ open, onOpenChange, programmeId, lot }: Props) {
  const createLot = useCreateLot();
  const updateLot = useUpdateLot();
  const isEdit = !!lot;

  const [form, setForm] = useState({
    reference_lot: lot?.reference_lot || "",
    type_bien: (lot?.type_bien || "appartement") as TypeBien,
    statut: (lot?.statut || "disponible") as StatutLot,
    prix_fcfa: lot?.prix_fcfa ? String(lot.prix_fcfa) : "",
    superficie_m2: lot?.superficie_m2 ? String(lot.superficie_m2) : "",
    nombre_pieces: lot?.nombre_pieces ? String(lot.nombre_pieces) : "",
    etage: lot?.etage !== null && lot?.etage !== undefined ? String(lot.etage) : "",
    orientation: lot?.orientation || "",
    description: lot?.description || "",
    plan_url: lot?.plan_url || "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reference_lot.trim() || !form.prix_fcfa) {
      toast.error("Référence et prix sont obligatoires");
      return;
    }
    const payload = {
      programme_id: programmeId,
      reference_lot: form.reference_lot.trim(),
      type_bien: form.type_bien,
      statut: form.statut,
      prix_fcfa: parseInt(form.prix_fcfa),
      superficie_m2: form.superficie_m2 ? parseFloat(form.superficie_m2) : null,
      nombre_pieces: form.nombre_pieces ? parseInt(form.nombre_pieces) : null,
      etage: form.etage !== "" ? parseInt(form.etage) : null,
      orientation: form.orientation.trim() || null,
      description: form.description.trim() || null,
      plan_url: form.plan_url.trim() || null,
    };
    try {
      if (isEdit && lot) {
        await updateLot.mutateAsync({ id: lot.id, programme_id: programmeId, ...payload });
        toast.success("Lot mis à jour");
      } else {
        await createLot.mutateAsync(payload);
        toast.success("Lot créé");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erreur");
    }
  };

  const isPending = createLot.isPending || updateLot.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le lot" : "Ajouter un lot"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Référence lot *</Label>
              <Input value={form.reference_lot} onChange={(e) => set("reference_lot", e.target.value)} placeholder="Villa A-01" />
            </div>
            <div className="space-y-1.5">
              <Label>Type de bien *</Label>
              <Select value={form.type_bien} onValueChange={(v) => set("type_bien", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TYPE_BIEN_LABELS) as [TypeBien, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={(v) => set("statut", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUT_LOT_LABELS) as [StatutLot, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prix (F CFA) *</Label>
              <Input type="number" min="0" value={form.prix_fcfa} onChange={(e) => set("prix_fcfa", e.target.value)} placeholder="25000000" />
            </div>
            <div className="space-y-1.5">
              <Label>Superficie (m²)</Label>
              <Input type="number" min="0" value={form.superficie_m2} onChange={(e) => set("superficie_m2", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre de pièces</Label>
              <Input type="number" min="0" value={form.nombre_pieces} onChange={(e) => set("nombre_pieces", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Étage</Label>
              <Input type="number" min="0" value={form.etage} onChange={(e) => set("etage", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Orientation</Label>
              <Input value={form.orientation} onChange={(e) => set("orientation", e.target.value)} placeholder="Nord-Est" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Plan du lot (URL)</Label>
              <Input type="url" value={form.plan_url} onChange={(e) => set("plan_url", e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEdit ? "Mettre à jour" : "Ajouter le lot"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
