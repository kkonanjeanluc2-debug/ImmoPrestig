import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Star, FileText, Loader2, Copy, Info, Eye, Edit, Upload, X, ImageIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  useAttestationTemplates,
  useCreateAttestationTemplate,
  useUpdateAttestationTemplate,
  useDeleteAttestationTemplate,
  type AttestationTemplate,
  type AttestationTemplateInsert,
} from "@/hooks/useAttestationTemplates";
import { DEFAULT_ATTESTATION_TEMPLATE, ATTESTATION_VARIABLES, replaceAttestationVariables } from "@/lib/defaultAttestationTemplate";
import { DEFAULT_CESSION_TEMPLATE, CESSION_VARIABLES } from "@/lib/defaultCessionTemplate";
import { supabase } from "@/integrations/supabase/client";

const SAMPLE_DATA: Record<string, string> = {
  "{numero_lot}": "A-001",
  "{ilot}": "B",
  "{nom_lotissement}": "SONGON DAGBE-BLEBIYA",
  "{superficie}": "500",
  "{district}": "District Autonome d'Abidjan",
  "{commune}": "Commune de Songon",
  "{village}": "Songon Agban",
  "{chef_village_name}": "AKRE AMOUSSO SIMEON",
  "{chef_village_titre}": "nommé par arrêté N°1953/AT/DGAT du 15/03/2020",
  "{arrete_approbation}": "Approuvé par Arrêté N°20-00140/MCLU/DGUF",
  "{beneficiaire_nom}": "KOUASSI Jean-Pierre",
  "{beneficiaire_cni}": "CI-0012345678",
  "{beneficiaire_profession}": "Ingénieur",
  "{beneficiaire_telephone}": "+225 07 01 02 03 04",
  "{beneficiaire_email}": "kouassi@email.com",
  "{beneficiaire_adresse}": "Cocody, Abidjan",
  "{date_vente}": new Date().toLocaleDateString("fr-FR"),
  "{ville}": "Abidjan",
  "{nom_agence}": "Agence Immobilière ABC",
};

function AttestationPreview({ content }: { content: string }) {
  const previewContent = useMemo(() => {
    if (!content) return "";
    return replaceAttestationVariables(content, SAMPLE_DATA);
  }, [content]);

  const renderLines = () => {
    if (!previewContent) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Rédigez votre modèle pour voir l'aperçu</p>
        </div>
      );
    }
    return previewContent.split("\n").map((line, i) => {
      const t = line.trim();
      if (t.startsWith("# ")) return <h1 key={i} className="text-xl font-bold text-primary mt-6 mb-3">{t.substring(2)}</h1>;
      if (t.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold text-primary mt-5 mb-2">{t.substring(3)}</h2>;
      if (t.startsWith("### ")) return <h3 key={i} className="text-base font-medium mt-4 mb-2">{t.substring(4)}</h3>;
      if (t === "---") return <hr key={i} className="my-4 border-border" />;
      if (t === "") return <div key={i} className="h-3" />;
      // Handle bold
      const parts = t.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-sm leading-relaxed mb-1">
          {parts.map((p, j) =>
            p.startsWith("**") && p.endsWith("**")
              ? <strong key={j}>{p.slice(2, -2)}</strong>
              : p.startsWith("_") && p.endsWith("_")
              ? <em key={j}>{p.slice(1, -1)}</em>
              : p
          )}
        </p>
      );
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>Aperçu avec données d'exemple. Les vraies valeurs seront insérées lors de la génération.</span>
      </div>
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="p-6 bg-background prose prose-sm max-w-none">
          {renderLines()}
        </div>
      </ScrollArea>
    </div>
  );
}

const emptyForm: AttestationTemplateInsert = {
  name: "",
  content: DEFAULT_ATTESTATION_TEMPLATE,
  district: "",
  commune: "",
  village: "",
  arrete_numero: "",
  arrete_date: "",
  lotissement_origin_name: "",
  arrete_approbation: "",
  is_default: false,
  banner_color_1: "#003399",
  banner_color_2: null,
  banner_gradient: false,
  doc_bg_color_1: null,
  doc_bg_color_2: null,
  doc_bg_gradient: false,
  village_logo_url: null,
  template_type: "attribution",
};

export function AttestationTemplateManager({ templateType = "attribution" }: { templateType?: string }) {
  const { data: allTemplates = [], isLoading } = useAttestationTemplates();
  const templates = useMemo(() => allTemplates.filter(t => (t.template_type || 'attribution') === templateType), [allTemplates, templateType]);
  const createMutation = useCreateAttestationTemplate();
  const updateMutation = useUpdateAttestationTemplate();
  const deleteMutation = useDeleteAttestationTemplate();
  const isCession = templateType === "cession";
  const defaultContent = isCession ? DEFAULT_CESSION_TEMPLATE : DEFAULT_ATTESTATION_TEMPLATE;
  const variables = isCession ? CESSION_VARIABLES : ATTESTATION_VARIABLES;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AttestationTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<AttestationTemplate | null>(null);
  const [form, setForm] = useState<AttestationTemplateInsert>(emptyForm);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `village-logo-${Date.now()}.${fileExt}`;
      const filePath = `attestation-logos/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('agency-assets')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('agency-assets')
        .getPublicUrl(filePath);
      updateField('village_logo_url', urlData.publicUrl);
      toast.success("Logo du village importé");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'import du logo");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({ ...emptyForm, content: defaultContent, template_type: templateType, is_default: templates.length === 0 });
    setDialogOpen(true);
  };

  const openEdit = (t: AttestationTemplate) => {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      content: t.content || defaultContent,
      district: t.district,
      commune: t.commune,
      village: t.village,
      arrete_numero: t.arrete_numero,
      arrete_date: t.arrete_date,
      lotissement_origin_name: t.lotissement_origin_name,
      arrete_approbation: t.arrete_approbation,
      is_default: t.is_default,
      banner_color_1: t.banner_color_1 || "#003399",
      banner_color_2: t.banner_color_2 || null,
      banner_gradient: t.banner_gradient || false,
      doc_bg_color_1: t.doc_bg_color_1 || null,
      doc_bg_color_2: t.doc_bg_color_2 || null,
      doc_bg_gradient: t.doc_bg_gradient || false,
      village_logo_url: t.village_logo_url || null,
      template_type: t.template_type || templateType,
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (t: AttestationTemplate) => {
    setEditingTemplate(null);
    setForm({
      name: `${t.name} (copie)`,
      content: t.content || defaultContent,
      district: t.district,
      commune: t.commune,
      village: t.village,
      arrete_numero: t.arrete_numero,
      arrete_date: t.arrete_date,
      lotissement_origin_name: t.lotissement_origin_name,
      arrete_approbation: t.arrete_approbation,
      is_default: false,
      banner_color_1: t.banner_color_1 || "#003399",
      banner_color_2: t.banner_color_2 || null,
      banner_gradient: t.banner_gradient || false,
      doc_bg_color_1: t.doc_bg_color_1 || null,
      doc_bg_color_2: t.doc_bg_color_2 || null,
      doc_bg_gradient: t.doc_bg_gradient || false,
      village_logo_url: t.village_logo_url || null,
      template_type: t.template_type || templateType,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Le contenu est obligatoire");
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
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteMutation.mutateAsync(templateToDelete.id);
      toast.success("Modèle supprimé");
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const handleSetDefault = async (t: AttestationTemplate) => {
    try {
      await updateMutation.mutateAsync({ id: t.id, is_default: true });
      toast.success(`"${t.name}" est maintenant le modèle par défaut`);
    } catch {
      toast.error("Erreur");
    }
  };

  const insertVariable = (variable: string) => {
    setForm((prev) => ({ ...prev, content: prev.content + variable }));
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const updateField = (field: keyof AttestationTemplateInsert, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Modèles d'attestation villageoise
              </CardTitle>
              <CardDescription>
                Créez des modèles avec variables dynamiques pour générer automatiquement les attestations d'attribution
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
              <p className="text-sm mb-4">Créez un modèle pour générer des attestations villageoises</p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier modèle
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        {t.is_default && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            Par défaut
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[t.village, t.commune, t.district].filter(Boolean).join(" • ") || "Non configuré"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Modifié le {new Date(t.updated_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!t.is_default && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleSetDefault(t)}>
                              <Star className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Définir par défaut</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicate(t)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Dupliquer</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setTemplateToDelete(t); setDeleteDialogOpen(true); }}>
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
            <DialogTitle>
              {editingTemplate ? "Modifier le modèle" : "Nouveau modèle d'attestation"}
            </DialogTitle>
            <DialogDescription>
              Créez un modèle avec des variables dynamiques qui seront remplacées par les informations du lot et du bénéficiaire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du modèle *</Label>
              <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Ex: Attestation Songon Agban" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modèle par défaut</Label>
                <p className="text-sm text-muted-foreground">
                  Ce modèle sera utilisé automatiquement pour les nouveaux lotissements
                </p>
              </div>
              <Switch checked={form.is_default} onCheckedChange={(v) => updateField("is_default", v)} />
            </div>

            <Separator />

            {/* Informations administratives */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Informations administratives</Label>
              <p className="text-xs text-muted-foreground">
                Ces informations pré-remplissent les variables du modèle. Le nom et l'arrêté du Chef du village se configurent directement dans chaque lotissement.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">District</Label>
                  <Input value={form.district} onChange={(e) => updateField("district", e.target.value)} placeholder="Ex: District Autonome d'Abidjan" />
                </div>
                <div>
                  <Label className="text-xs">Commune</Label>
                  <Input value={form.commune} onChange={(e) => updateField("commune", e.target.value)} placeholder="Ex: Commune de Songon" />
                </div>
                <div>
                  <Label className="text-xs">Village</Label>
                  <Input value={form.village} onChange={(e) => updateField("village", e.target.value)} placeholder="Ex: Village de Songon Agban" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nom du lotissement d'origine</Label>
                  <Input value={form.lotissement_origin_name} onChange={(e) => updateField("lotissement_origin_name", e.target.value)} placeholder="Ex: SONGON DAGBE-BLEBIYA" />
                </div>
                <div>
                  <Label className="text-xs">Arrêté d'approbation</Label>
                  <Input value={form.arrete_approbation} onChange={(e) => updateField("arrete_approbation", e.target.value)} placeholder="Ex: Approuvé par Arrêté N°20-00140/MCLU..." />
                </div>
              </div>
            </div>

            <Separator />

            {/* Logo du village */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Logo du village</Label>
              <p className="text-xs text-muted-foreground">
                Importez le logo/image du village qui apparaîtra en haut à gauche de l'attestation d'attribution.
              </p>
              {form.village_logo_url ? (
                <div className="flex items-center gap-4">
                  <img
                    src={form.village_logo_url}
                    alt="Logo du village"
                    className="w-20 h-20 object-contain border rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateField('village_logo_url', null)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Supprimer
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Importer le logo du village
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Couleurs du bandeau */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Couleurs du bandeau</Label>
              <p className="text-xs text-muted-foreground">
                Choisissez une couleur unique ou un dégradé pour le bandeau de titre de l'attestation.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.banner_gradient}
                    onCheckedChange={(v) => {
                      updateField("banner_gradient", v);
                      if (v && !form.banner_color_2) {
                        updateField("banner_color_2", "#001a66");
                      }
                    }}
                  />
                  <Label className="text-sm">Dégradé</Label>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">{form.banner_gradient ? "Couleur 1" : "Couleur du bandeau"}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.banner_color_1 || "#003399"}
                      onChange={(e) => updateField("banner_color_1", e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={form.banner_color_1 || "#003399"}
                      onChange={(e) => updateField("banner_color_1", e.target.value)}
                      className="w-28 font-mono text-xs"
                    />
                  </div>
                </div>
                {form.banner_gradient && (
                  <div className="space-y-1">
                    <Label className="text-xs">Couleur 2</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.banner_color_2 || "#001a66"}
                        onChange={(e) => updateField("banner_color_2", e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={form.banner_color_2 || "#001a66"}
                        onChange={(e) => updateField("banner_color_2", e.target.value)}
                        className="w-28 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <Label className="text-xs">Aperçu</Label>
                  <div
                    className="h-10 rounded mt-1"
                    style={{
                      background: form.banner_gradient && form.banner_color_2
                        ? `linear-gradient(135deg, ${form.banner_color_1 || "#003399"}, ${form.banner_color_2})`
                        : form.banner_color_1 || "#003399",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Couleur de fond du document */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Couleur de fond du document</Label>
              <p className="text-xs text-muted-foreground">
                Choisissez une couleur de fond unique ou en dégradé pour l'ensemble du document.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.doc_bg_gradient}
                    onCheckedChange={(v) => {
                      updateField("doc_bg_gradient", v);
                      if (v && !form.doc_bg_color_2) {
                        updateField("doc_bg_color_2", "#f5f5dc");
                      }
                      if (!form.doc_bg_color_1) {
                        updateField("doc_bg_color_1", "#fffff0");
                      }
                    }}
                  />
                  <Label className="text-sm">Dégradé</Label>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">{form.doc_bg_gradient ? "Couleur 1" : "Couleur de fond"}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.doc_bg_color_1 || "#ffffff"}
                      onChange={(e) => updateField("doc_bg_color_1", e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={form.doc_bg_color_1 || "#ffffff"}
                      onChange={(e) => updateField("doc_bg_color_1", e.target.value)}
                      className="w-28 font-mono text-xs"
                    />
                  </div>
                </div>
                {form.doc_bg_gradient && (
                  <div className="space-y-1">
                    <Label className="text-xs">Couleur 2</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.doc_bg_color_2 || "#f5f5dc"}
                        onChange={(e) => updateField("doc_bg_color_2", e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={form.doc_bg_color_2 || "#f5f5dc"}
                        onChange={(e) => updateField("doc_bg_color_2", e.target.value)}
                        className="w-28 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <Label className="text-xs">Aperçu</Label>
                  <div
                    className="h-10 rounded mt-1 border border-border"
                    style={{
                      background: form.doc_bg_color_1
                        ? (form.doc_bg_gradient && form.doc_bg_color_2
                          ? `linear-gradient(180deg, ${form.doc_bg_color_1}, ${form.doc_bg_color_2})`
                          : form.doc_bg_color_1)
                        : "#ffffff",
                    }}
                  />
                </div>
              </div>
              {form.doc_bg_color_1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateField("doc_bg_color_1", null);
                    updateField("doc_bg_color_2", null);
                    updateField("doc_bg_gradient", false);
                  }}
                >
                  Supprimer la couleur de fond
                </Button>
              )}
            </div>

            <Separator />

            {/* Variables helper */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Variables disponibles</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ATTESTATION_VARIABLES.map((v) => (
                  <TooltipProvider key={v.variable}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => insertVariable(v.variable)} className="font-mono text-xs">
                          {v.variable}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{v.description}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>

            {/* Editor and Preview Tabs */}
            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Éditeur
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Aperçu en temps réel
                </TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="space-y-2 mt-4">
                <Label>Contenu de l'attestation</Label>
                <p className="text-sm text-muted-foreground">
                  Utilisez # pour les titres, ## pour les sous-titres, **texte** pour le gras, --- pour un séparateur
                </p>
                <Textarea
                  value={form.content}
                  onChange={(e) => updateField("content", e.target.value)}
                  placeholder="Contenu de l'attestation villageoise..."
                  className="min-h-[400px] font-mono text-sm"
                />
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <AttestationPreview content={form.content} />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingTemplate ? "Mettre à jour" : "Créer le modèle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le modèle "{templateToDelete?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
