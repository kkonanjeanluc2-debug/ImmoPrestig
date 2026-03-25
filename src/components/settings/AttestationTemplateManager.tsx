import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Star, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useAttestationTemplates,
  useCreateAttestationTemplate,
  useUpdateAttestationTemplate,
  useDeleteAttestationTemplate,
  type AttestationTemplate,
  type AttestationTemplateInsert,
} from "@/hooks/useAttestationTemplates";

const emptyForm: AttestationTemplateInsert = {
  name: "",
  district: "",
  commune: "",
  village: "",
  chef_village_name: "",
  chef_village_titre: "",
  arrete_numero: "",
  arrete_date: "",
  lotissement_origin_name: "",
  arrete_approbation: "",
  is_default: false,
};

export function AttestationTemplateManager() {
  const { data: templates = [], isLoading } = useAttestationTemplates();
  const createMutation = useCreateAttestationTemplate();
  const updateMutation = useUpdateAttestationTemplate();
  const deleteMutation = useDeleteAttestationTemplate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AttestationTemplateInsert>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, is_default: templates.length === 0 });
    setDialogOpen(true);
  };

  const openEdit = (t: AttestationTemplate) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      district: t.district,
      commune: t.commune,
      village: t.village,
      chef_village_name: t.chef_village_name,
      chef_village_titre: t.chef_village_titre,
      arrete_numero: t.arrete_numero,
      arrete_date: t.arrete_date,
      lotissement_origin_name: t.lotissement_origin_name,
      arrete_approbation: t.arrete_approbation,
      is_default: t.is_default,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...form });
        toast.success("Modèle mis à jour");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Modèle créé");
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce modèle ?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Modèle supprimé");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const updateField = (field: keyof AttestationTemplateInsert, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Modèles d'attestation villageoise
            </CardTitle>
            <CardDescription>
              Créez des modèles pour générer automatiquement les attestations d'attribution
            </CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau modèle
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucun modèle créé</p>
            <p className="text-sm">Créez un modèle pour générer des attestations villageoises</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    {t.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                        Par défaut
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[t.village, t.commune, t.district].filter(Boolean).join(" • ") || "Non configuré"}
                  </p>
                  {t.chef_village_name && (
                    <p className="text-xs text-muted-foreground">Chef: {t.chef_village_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Modifier le modèle" : "Nouveau modèle d'attestation"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Nom du modèle *</Label>
                <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Ex: Attestation Songon Agban" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>District</Label>
                  <Input value={form.district} onChange={(e) => updateField("district", e.target.value)} placeholder="Ex: District Autonome d'Abidjan" />
                </div>
                <div>
                  <Label>Commune</Label>
                  <Input value={form.commune} onChange={(e) => updateField("commune", e.target.value)} placeholder="Ex: Commune de Songon" />
                </div>
                <div>
                  <Label>Village</Label>
                  <Input value={form.village} onChange={(e) => updateField("village", e.target.value)} placeholder="Ex: Village de Songon Agban" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nom du Chef du Village</Label>
                  <Input value={form.chef_village_name} onChange={(e) => updateField("chef_village_name", e.target.value)} placeholder="Ex: AKRE AMOUSSO SIMEON" />
                </div>
                <div>
                  <Label>Titre / Arrêté de nomination</Label>
                  <Input value={form.chef_village_titre} onChange={(e) => updateField("chef_village_titre", e.target.value)} placeholder="Ex: nommé par arrêté N°1953 /AT/ DGAT..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nom du lotissement d'origine</Label>
                  <Input value={form.lotissement_origin_name} onChange={(e) => updateField("lotissement_origin_name", e.target.value)} placeholder="Ex: SONGON DAGBE-BLEBIYA" />
                </div>
                <div>
                  <Label>Arrêté d'approbation</Label>
                  <Input value={form.arrete_approbation} onChange={(e) => updateField("arrete_approbation", e.target.value)} placeholder="Ex: Approuvé par Arrêté N°20-00140/MCLU..." />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={form.is_default} onCheckedChange={(v) => updateField("is_default", v)} />
                <Label>Définir comme modèle par défaut</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
