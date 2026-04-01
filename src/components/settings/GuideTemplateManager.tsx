import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Star, Loader2, Copy, BookOpen } from "lucide-react";
import { toast } from "sonner";
import {
  useGuideTemplates, useCreateGuideTemplate, useUpdateGuideTemplate, useDeleteGuideTemplate,
  type GuideTemplate, type GuideTemplateInsert,
} from "@/hooks/useGuideTemplates";

const emptyForm: GuideTemplateInsert = {
  name: "",
  district: "DISTRICT AUTONOME D'ABIDJAN",
  commune: "",
  title_color: "#CC0000",
  subtitle_color: "#003399",
  border_color: "#228B22",
  bg_color: "#FFFFFF",
  is_default: false,
};

export function GuideTemplateManager() {
  const { data: templates = [], isLoading } = useGuideTemplates();
  const createMutation = useCreateGuideTemplate();
  const updateMutation = useUpdateGuideTemplate();
  const deleteMutation = useDeleteGuideTemplate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GuideTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<GuideTemplate | null>(null);
  const [form, setForm] = useState<GuideTemplateInsert>(emptyForm);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (t: GuideTemplate) => {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      district: t.district,
      commune: t.commune,
      title_color: t.title_color,
      subtitle_color: t.subtitle_color,
      border_color: t.border_color,
      bg_color: t.bg_color,
      is_default: t.is_default,
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (t: GuideTemplate) => {
    setEditingTemplate(null);
    setForm({
      name: `${t.name} (copie)`,
      district: t.district,
      commune: t.commune,
      title_color: t.title_color,
      subtitle_color: t.subtitle_color,
      border_color: t.border_color,
      bg_color: t.bg_color,
      is_default: false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync({ id: editingTemplate.id, ...form });
        toast.success("Modèle mis à jour");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Modèle créé");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteMutation.mutateAsync(templateToDelete.id);
      toast.success("Modèle supprimé");
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSetDefault = async (t: GuideTemplate) => {
    try {
      await updateMutation.mutateAsync({ id: t.id, is_default: true });
      toast.success("Modèle défini par défaut");
    } catch {
      toast.error("Erreur");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Modèles de page de garde du guide
              </CardTitle>
              <CardDescription>
                Personnalisez la page de garde des guides de lotissement (district, commune, couleurs)
              </CardDescription>
            </div>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau modèle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun modèle créé. Cliquez sur "Nouveau modèle" pour commencer.
            </p>
          ) : (
            <div className="grid gap-3">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: t.title_color }} />
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: t.subtitle_color }} />
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: t.border_color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        {t.is_default && <Badge variant="secondary"><Star className="h-3 w-3 mr-1" />Défaut</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[t.district, t.commune].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!t.is_default && (
                      <Button variant="ghost" size="sm" onClick={() => handleSetDefault(t)} title="Définir par défaut">
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(t)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setTemplateToDelete(t); setDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Modifier le modèle" : "Nouveau modèle de guide"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form fields */}
            <div className="space-y-4">
              <div>
                <Label>Nom du modèle *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Guide Songon" />
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Zone en-tête (haut de page)</p>
              <div>
                <Label>District</Label>
                <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="DISTRICT AUTONOME D'ABIDJAN" />
              </div>
              <div>
                <Label>Commune</Label>
                <Input value={form.commune} onChange={(e) => setForm({ ...form, commune: e.target.value })} placeholder="COMMUNE DE SONGON" />
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Couleurs</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Titre "GUIDE"</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={form.title_color} onChange={(e) => setForm({ ...form, title_color: e.target.value })} className="w-8 h-7 cursor-pointer" />
                    <Input value={form.title_color} onChange={(e) => setForm({ ...form, title_color: e.target.value })} className="font-mono text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Nom du lotissement</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={form.subtitle_color} onChange={(e) => setForm({ ...form, subtitle_color: e.target.value })} className="w-8 h-7 cursor-pointer" />
                    <Input value={form.subtitle_color} onChange={(e) => setForm({ ...form, subtitle_color: e.target.value })} className="font-mono text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Bordure / Frise</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={form.border_color} onChange={(e) => setForm({ ...form, border_color: e.target.value })} className="w-8 h-7 cursor-pointer" />
                    <Input value={form.border_color} onChange={(e) => setForm({ ...form, border_color: e.target.value })} className="font-mono text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Fond de page</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="w-8 h-7 cursor-pointer" />
                    <Input value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="font-mono text-xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Aperçu</p>
              <div
                className="border rounded-lg overflow-hidden shadow-sm"
                style={{ backgroundColor: form.bg_color, aspectRatio: "210/297" }}
              >
                {/* Zigzag border top */}
                <div className="w-full h-3" style={{ background: `linear-gradient(135deg, ${form.border_color} 25%, transparent 25%) -10px 0, linear-gradient(225deg, ${form.border_color} 25%, transparent 25%) -10px 0, linear-gradient(315deg, ${form.border_color} 25%, transparent 25%), linear-gradient(45deg, ${form.border_color} 25%, transparent 25%)`, backgroundSize: "12px 12px", backgroundRepeat: "repeat-x" }} />

                <div className="px-4 py-3 flex flex-col h-[calc(100%-24px)]">
                  {/* Header area */}
                  <div className="flex items-start justify-between text-[6px]">
                    <div className="font-bold leading-tight max-w-[40%]">
                      {form.district && <p>{form.district}</p>}
                      {form.commune && <p className="mt-0.5">{form.commune}</p>}
                    </div>
                    <div className="text-center text-[5px]">
                      <div className="w-8 h-8 mx-auto bg-muted rounded flex items-center justify-center text-[4px] text-muted-foreground">MCLAU</div>
                    </div>
                    <div className="text-center text-[5px]">
                      <div className="w-8 h-8 mx-auto bg-muted rounded flex items-center justify-center text-[4px] text-muted-foreground">🇨🇮</div>
                      <p className="mt-0.5">RÉPUBLIQUE DE CÔTE D'IVOIRE</p>
                    </div>
                  </div>

                  {/* Title area */}
                  <div className="flex-1 flex flex-col items-center justify-center text-center -mt-2">
                    <p className="font-extrabold text-sm leading-tight" style={{ color: form.title_color }}>
                      GUIDE DU LOTISSEMENT
                    </p>
                    <p className="font-bold text-xs mt-1 underline" style={{ color: form.subtitle_color }}>
                      NOM DU LOTISSEMENT
                    </p>

                    {/* Bordered box */}
                    <div className="mt-3 border-2 rounded px-4 py-2" style={{ borderColor: form.border_color }}>
                      <p className="text-[6px] font-semibold" style={{ color: form.subtitle_color }}>ILOT N°... À ILOT N°...</p>
                      <p className="text-[6px] font-semibold" style={{ color: form.subtitle_color }}>LOT N°... À LOT N°...</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-right">
                    <p className="text-[6px] font-bold" style={{ color: form.title_color }}>
                      {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Zigzag border bottom */}
                <div className="w-full h-3" style={{ background: `linear-gradient(135deg, ${form.border_color} 25%, transparent 25%) -10px 0, linear-gradient(225deg, ${form.border_color} 25%, transparent 25%) -10px 0, linear-gradient(315deg, ${form.border_color} 25%, transparent 25%), linear-gradient(45deg, ${form.border_color} 25%, transparent 25%)`, backgroundSize: "12px 12px", backgroundRepeat: "repeat-x" }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingTemplate ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le modèle "{templateToDelete?.name}" sera supprimé définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
