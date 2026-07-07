import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateProgramme,
  useUpdateProgramme,
  TYPE_PROGRAMME_LABELS,
  STATUT_PROGRAMME_LABELS,
  type ProgrammeImmobilier,
  type StatutProgramme,
  type TypeProgramme,
} from "@/hooks/usePromotionsImmobilieres";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programme?: ProgrammeImmobilier | null;
}

type FormData = {
  nom: string;
  description: string;
  localisation: string;
  commune: string;
  ville: string;
  type_programme: TypeProgramme;
  statut: StatutProgramme;
  nombre_lots_total: string;
  prix_min_fcfa: string;
  prix_max_fcfa: string;
  superficie_terrain_m2: string;
  date_lancement: string;
  date_livraison_prevue: string;
  date_livraison_effective: string;
  numero_acd: string;
  numero_permis_construire: string;
  numero_agrement_promoteur: string;
  garantie_financiere_achevement: boolean;
  nom_garant: string;
  image_principale_url: string;
  plan_masse_url: string;
};

const defaultForm: FormData = {
  nom: "",
  description: "",
  localisation: "",
  commune: "",
  ville: "Abidjan",
  type_programme: "appartement",
  statut: "en_preparation",
  nombre_lots_total: "0",
  prix_min_fcfa: "",
  prix_max_fcfa: "",
  superficie_terrain_m2: "",
  date_lancement: "",
  date_livraison_prevue: "",
  date_livraison_effective: "",
  numero_acd: "",
  numero_permis_construire: "",
  numero_agrement_promoteur: "",
  garantie_financiere_achevement: false,
  nom_garant: "",
  image_principale_url: "",
  plan_masse_url: "",
};

export function ProgrammeFormDialog({ open, onOpenChange, programme }: Props) {
  const createProgramme = useCreateProgramme();
  const updateProgramme = useUpdateProgramme();
  const isEdit = !!programme;

  const [form, setForm] = useState<FormData>(() =>
    programme
      ? {
          nom: programme.nom,
          description: programme.description || "",
          localisation: programme.localisation,
          commune: programme.commune,
          ville: programme.ville,
          type_programme: programme.type_programme,
          statut: programme.statut,
          nombre_lots_total: String(programme.nombre_lots_total),
          prix_min_fcfa: programme.prix_min_fcfa ? String(programme.prix_min_fcfa) : "",
          prix_max_fcfa: programme.prix_max_fcfa ? String(programme.prix_max_fcfa) : "",
          superficie_terrain_m2: programme.superficie_terrain_m2 ? String(programme.superficie_terrain_m2) : "",
          date_lancement: programme.date_lancement || "",
          date_livraison_prevue: programme.date_livraison_prevue || "",
          date_livraison_effective: programme.date_livraison_effective || "",
          numero_acd: programme.numero_acd || "",
          numero_permis_construire: programme.numero_permis_construire || "",
          numero_agrement_promoteur: programme.numero_agrement_promoteur || "",
          garantie_financiere_achevement: programme.garantie_financiere_achevement,
          nom_garant: programme.nom_garant || "",
          image_principale_url: programme.image_principale_url || "",
          plan_masse_url: programme.plan_masse_url || "",
        }
      : defaultForm
  );

  const set = (key: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.localisation.trim() || !form.commune.trim()) {
      toast.error("Nom, localisation et commune sont obligatoires");
      return;
    }
    const payload = {
      nom: form.nom.trim(),
      description: form.description.trim() || null,
      localisation: form.localisation.trim(),
      commune: form.commune.trim(),
      ville: form.ville.trim() || "Abidjan",
      type_programme: form.type_programme,
      statut: form.statut,
      nombre_lots_total: parseInt(form.nombre_lots_total) || 0,
      prix_min_fcfa: form.prix_min_fcfa ? parseInt(form.prix_min_fcfa) : null,
      prix_max_fcfa: form.prix_max_fcfa ? parseInt(form.prix_max_fcfa) : null,
      superficie_terrain_m2: form.superficie_terrain_m2 ? parseFloat(form.superficie_terrain_m2) : null,
      date_lancement: form.date_lancement || null,
      date_livraison_prevue: form.date_livraison_prevue || null,
      date_livraison_effective: form.date_livraison_effective || null,
      numero_acd: form.numero_acd.trim() || null,
      numero_permis_construire: form.numero_permis_construire.trim() || null,
      numero_agrement_promoteur: form.numero_agrement_promoteur.trim() || null,
      garantie_financiere_achevement: form.garantie_financiere_achevement,
      nom_garant: form.garantie_financiere_achevement ? (form.nom_garant.trim() || null) : null,
      image_principale_url: form.image_principale_url.trim() || null,
      images_urls: programme?.images_urls ?? null,
      plan_masse_url: form.plan_masse_url.trim() || null,
    };

    try {
      if (isEdit && programme) {
        await updateProgramme.mutateAsync({ id: programme.id, ...payload });
        toast.success("Programme mis à jour");
      } else {
        await createProgramme.mutateAsync(payload);
        toast.success("Programme créé avec succès");
        setForm(defaultForm);
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la sauvegarde");
    }
  };

  const isPending = createProgramme.isPending || updateProgramme.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le programme" : "Nouveau programme immobilier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Section : Informations générales */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Informations générales</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Nom du programme *</Label>
                <Input value={form.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Résidence Les Jardins" />
              </div>
              <div className="space-y-1.5">
                <Label>Type de programme *</Label>
                <Select value={form.type_programme} onValueChange={(v) => set("type_programme", v as TypeProgramme)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_PROGRAMME_LABELS) as [TypeProgramme, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={(v) => set("statut", v as StatutProgramme)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUT_PROGRAMME_LABELS) as [StatutProgramme, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Localisation *</Label>
                <Input value={form.localisation} onChange={(e) => set("localisation", e.target.value)} placeholder="Cocody, Angré" />
              </div>
              <div className="space-y-1.5">
                <Label>Commune *</Label>
                <Input value={form.commune} onChange={(e) => set("commune", e.target.value)} placeholder="Cocody" />
              </div>
              <div className="space-y-1.5">
                <Label>Ville</Label>
                <Input value={form.ville} onChange={(e) => set("ville", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Superficie terrain (m²)</Label>
                <Input type="number" min="0" step="0.01" value={form.superficie_terrain_m2}
                  onChange={(e) => set("superficie_terrain_m2", e.target.value)} placeholder="5000" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)}
                  rows={3} placeholder="Description du programme..." />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section : Lots & Prix */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lots & Prix</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre de lots</Label>
                <Input type="number" min="0" value={form.nombre_lots_total}
                  onChange={(e) => set("nombre_lots_total", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prix min (F CFA)</Label>
                <Input type="number" min="0" value={form.prix_min_fcfa}
                  onChange={(e) => set("prix_min_fcfa", e.target.value)} placeholder="15 000 000" />
              </div>
              <div className="space-y-1.5">
                <Label>Prix max (F CFA)</Label>
                <Input type="number" min="0" value={form.prix_max_fcfa}
                  onChange={(e) => set("prix_max_fcfa", e.target.value)} placeholder="50 000 000" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section : Calendrier */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Calendrier</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date de lancement</Label>
                <Input type="date" value={form.date_lancement} onChange={(e) => set("date_lancement", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Livraison prévue</Label>
                <Input type="date" value={form.date_livraison_prevue} onChange={(e) => set("date_livraison_prevue", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Livraison effective</Label>
                <Input type="date" value={form.date_livraison_effective} onChange={(e) => set("date_livraison_effective", e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section : Documents administratifs */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documents administratifs</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>N° ACD</Label>
                <Input value={form.numero_acd} onChange={(e) => set("numero_acd", e.target.value)} placeholder="ACD-2026-XXXX" />
              </div>
              <div className="space-y-1.5">
                <Label>N° Permis de construire</Label>
                <Input value={form.numero_permis_construire} onChange={(e) => set("numero_permis_construire", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>N° Agrément promoteur</Label>
                <Input value={form.numero_agrement_promoteur} onChange={(e) => set("numero_agrement_promoteur", e.target.value)}
                  placeholder="AGR-PROMO-XXXX" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section : Garantie financière d'achèvement */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Garantie financière d'achèvement (GFA)</p>
            <div className="flex items-center gap-3">
              <Checkbox
                id="gfa"
                checked={form.garantie_financiere_achevement}
                onCheckedChange={(c) => set("garantie_financiere_achevement", !!c)}
              />
              <Label htmlFor="gfa" className="cursor-pointer font-normal">
                Garantie financière d'achèvement souscrite
              </Label>
            </div>
            {form.garantie_financiere_achevement && (
              <div className="space-y-1.5">
                <Label>Nom du garant / organisme</Label>
                <Input value={form.nom_garant} onChange={(e) => set("nom_garant", e.target.value)}
                  placeholder="Banque Atlantique CI — N° GAR-2026-XXXX" />
              </div>
            )}
          </div>

          <Separator />

          {/* Section : Médias */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Médias (URLs)</p>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label>Image principale (URL)</Label>
                <Input value={form.image_principale_url} onChange={(e) => set("image_principale_url", e.target.value)}
                  placeholder="https://..." type="url" />
              </div>
              <div className="space-y-1.5">
                <Label>Plan de masse (URL)</Label>
                <Input value={form.plan_masse_url} onChange={(e) => set("plan_masse_url", e.target.value)}
                  placeholder="https://..." type="url" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEdit ? "Mettre à jour" : "Créer le programme"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
