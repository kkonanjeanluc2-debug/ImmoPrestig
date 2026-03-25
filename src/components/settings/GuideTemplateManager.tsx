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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Modifier le modèle" : "Nouveau modèle de guide"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom du modèle *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Guide Songon" />
            </div>
            <div>
              <Label>District</Label>
              <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="DISTRICT AUTONOME D'ABIDJAN" />
            </div>
            <div>
              <Label>Commune</Label>
              <Input value={form.commune} onChange={(e) => setForm({ ...form, commune: e.target.value })} placeholder="COMMUNE DE SONGON" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Couleur titre "GUIDE"</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.title_color} onChange={(e) => setForm({ ...form, title_color: e.target.value })} className="w-10 h-8 cursor-pointer" />
                  <Input value={form.title_color} onChange={(e) => setForm({ ...form, title_color: e.target.value })} className="font-mono text-xs" />
                </div>
              </div>
              <div>
                <Label>Couleur sous-titres</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.subtitle_color} onChange={(e) => setForm({ ...form, subtitle_color: e.target.value })} className="w-10 h-8 cursor-pointer" />
                  <Input value={form.subtitle_color} onChange={(e) => setForm({ ...form, subtitle_color: e.target.value })} className="font-mono text-xs" />
                </div>
              </div>
              <div>
                <Label>Couleur bordure encadré</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.border_color} onChange={(e) => setForm({ ...form, border_color: e.target.value })} className="w-10 h-8 cursor-pointer" />
                  <Input value={form.border_color} onChange={(e) => setForm({ ...form, border_color: e.target.value })} className="font-mono text-xs" />
                </div>
              </div>
              <div>
                <Label>Couleur de fond</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="w-10 h-8 cursor-pointer" />
                  <Input value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="font-mono text-xs" />
                </div>
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
