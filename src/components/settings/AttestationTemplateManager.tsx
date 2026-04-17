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
import { Plus, Pencil, Trash2, Star, FileText, Loader2, Copy, Info, Eye, Edit, Upload, X, ImageIcon, Droplets } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  estimatePreviewWatermarkImageSize,
  estimatePreviewWatermarkTextSize,
  estimateRepeatedWatermarkTextSize,
  getAttestationRepeatedWatermarkRatios,
  getAttestationWatermarkBounds,
  getAttestationWatermarkPlacement,
} from "@/lib/attestationWatermark";
import {
  useAttestationTemplates,
  useCreateAttestationTemplate,
  useUpdateAttestationTemplate,
  useDeleteAttestationTemplate,
  type AttestationTemplate,
  type AttestationTemplateInsert,
} from "@/hooks/useAttestationTemplates";
import { DEFAULT_ATTESTATION_TEMPLATE, ATTESTATION_VARIABLES } from "@/lib/defaultAttestationTemplate";
import { DEFAULT_CESSION_TEMPLATE, CESSION_VARIABLES } from "@/lib/defaultCessionTemplate";
import { buildAttestationTemplateContent } from "@/lib/attestationTemplateContent";
import { BORDER_MOTIF_OPTIONS, isMotifBorderStyle } from "@/lib/attestationBorderMotifs";
import { supabase } from "@/integrations/supabase/client";
import { WatermarkPositionEditor } from "./WatermarkPositionEditor";

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
  "{cedant_nom}": "TRAORE Abdoulaye",
  "{cedant_cni}": "CI-9876543210",
  "{cedant_telephone}": "+225 05 06 07 08 09",
  "{ancien_beneficiaire_nom}": "KONE Mamadou",
  "{ancien_beneficiaire_cni}": "CI-1122334455",
  "{ancien_beneficiaire_telephone}": "+225 01 02 03 04 05",
};

function AttestationPreview({
  content,
  templateType,
  watermarkType,
  watermarkText,
  watermarkImageUrl,
  watermarkAngle,
  watermarkOpacity,
  watermarkRepeat,
  watermarkPositionX,
  watermarkPositionY,
  watermarkRotation,
  pageBorderEnabled,
  pageBorderStyle,
}: {
  content: string;
  templateType: string;
  watermarkType?: string | null;
  watermarkText?: string | null;
  watermarkImageUrl?: string | null;
  watermarkAngle?: string | null;
  watermarkOpacity?: number | null;
  watermarkRepeat?: boolean | null;
  watermarkPositionX?: number | null;
  watermarkPositionY?: number | null;
  watermarkRotation?: number | null;
  pageBorderEnabled?: boolean | null;
  pageBorderStyle?: string | null;
}) {
  const previewContent = useMemo(() => {
    if (!content) return "";
    return buildAttestationTemplateContent(content, SAMPLE_DATA, {
      ancienBeneficiaire: templateType === "cession"
        ? {
            nom: SAMPLE_DATA["{cedant_nom}"],
            cni_number: SAMPLE_DATA["{cedant_cni}"],
            telephone: SAMPLE_DATA["{cedant_telephone}"],
          }
        : null,
    });
  }, [content, templateType]);

  const previewPageWidth = 210;
  const previewPageHeight = 297;
  const previewBounds = useMemo(
    () => getAttestationWatermarkBounds({
      pageWidth: previewPageWidth,
      pageHeight: previewPageHeight,
      templateType,
      pageBorderEnabled,
      pageBorderStyle,
    }),
    [pageBorderEnabled, pageBorderStyle, templateType]
  );

  const renderWatermarkLayer = () => {
    if (!previewContent || watermarkType === "none") return null;

    const opacity = Math.max(0.04, Math.min(watermarkOpacity ?? 0.1, 0.4));
    const placement = getAttestationWatermarkPlacement({
      templateType,
      watermarkAngle,
      watermarkRepeat,
      watermarkPositionX,
      watermarkPositionY,
      watermarkRotation,
    });
    const centerXRatio = (placement.parsedPositionX ?? 50) / 100;
    const centerYRatio = (placement.parsedPositionY ?? 50) / 100;
    const centerX = previewBounds.left + (previewBounds.width * centerXRatio);
    const centerY = previewBounds.top + (previewBounds.height * centerYRatio);
    const toPercentX = (value: number) => `${(value / previewPageWidth) * 100}%`;
    const toPercentY = (value: number) => `${(value / previewPageHeight) * 100}%`;
    const mapAreaPoint = (xRatio: number, yRatio: number) => ({
      left: toPercentX(previewBounds.left + previewBounds.width * xRatio),
      top: toPercentY(previewBounds.top + previewBounds.height * yRatio),
    });
    const positions = placement.useCustomSingle
      ? [{ left: toPercentX(centerX), top: toPercentY(centerY) }]
      : getAttestationRepeatedWatermarkRatios({
          centerX: centerXRatio,
          centerY: centerYRatio,
          isHorizontal: placement.isHorizontal,
        }).map(({ x, y }) => mapAreaPoint(x, y));
    const size = placement.useCustomSingle
      ? (watermarkType === "image"
          ? estimatePreviewWatermarkImageSize(previewBounds, true)
          : estimatePreviewWatermarkTextSize({
              text: watermarkText || "",
              bounds: previewBounds,
              centerX,
              templateType,
              isHorizontal: placement.isHorizontal,
              hasCustomPos: placement.hasCustomPos,
            }))
      : (watermarkType === "image"
          ? estimatePreviewWatermarkImageSize(previewBounds, false)
          : estimateRepeatedWatermarkTextSize({
              text: watermarkText || "",
              bounds: previewBounds,
              templateType,
              isHorizontal: placement.isHorizontal,
            }));
    const rotation = `rotate(${placement.isHorizontal ? 0 : (placement.customRotation ?? placement.defaultRotation)}deg)`;

    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {watermarkType === "text" && watermarkText?.trim() && positions.map((position, index) => (
          <span
            key={`${position.left}-${position.top}-${index}`}
            className="absolute select-none whitespace-nowrap font-bold tracking-[0.08em]"
            style={{
              left: position.left,
              top: position.top,
              transform: `translate(-50%, -50%) ${rotation}`,
              transformOrigin: "center",
              opacity,
              fontSize: `${size}px`,
              color: "hsl(var(--foreground) / 0.14)",
            }}
          >
            {watermarkText}
          </span>
        ))}

        {watermarkType === "image" && watermarkImageUrl && positions.map((position, index) => (
          <img
            key={`${position.left}-${position.top}-${index}`}
            src={watermarkImageUrl}
            alt=""
            loading="lazy"
            className="absolute select-none object-contain"
            style={{
              left: position.left,
              top: position.top,
              width: `${size}px`,
              height: `${size}px`,
              transform: `translate(-50%, -50%) ${rotation}`,
              transformOrigin: "center",
              opacity,
            }}
          />
        ))}
      </div>
    );
  };

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
        <div className="relative min-h-[560px] overflow-hidden bg-background p-6">
          <div
            className="pointer-events-none absolute rounded-sm border border-dashed border-border/60 bg-primary/5"
            style={{
              left: `${(previewBounds.left / previewPageWidth) * 100}%`,
              top: `${(previewBounds.top / previewPageHeight) * 100}%`,
              width: `${(previewBounds.width / previewPageWidth) * 100}%`,
              height: `${(previewBounds.height / previewPageHeight) * 100}%`,
            }}
          />
          {renderWatermarkLayer()}
          <div className="relative z-10 prose prose-sm max-w-none">
            {renderLines()}
          </div>
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
  header_ministere: "",
  header_region: "",
  header_departement: "",
  header_republique: "République de Côte d'Ivoire",
  header_devise: "Union-Discipline-Travail",
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
  right_logo_url: null,
  template_type: "attribution",
  header_line_color: "#FF8C00",
  title_border_color: null,
  title_bg_color: null,
  watermark_type: "none",
  watermark_text: null,
  watermark_image_url: null,
  watermark_angle: "diagonal",
  watermark_opacity: 0.1,
  watermark_repeat: true,
  watermark_position_x: 50,
  watermark_position_y: 50,
  watermark_rotation: -45,
  page_border_enabled: false,
  page_border_color: "#8B4513",
  page_border_style: "geometric",
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
  const [uploadingRightLogo, setUploadingRightLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const rightLogoInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const [uploadingWatermark, setUploadingWatermark] = useState(false);

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

  const handleRightLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRightLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `right-logo-${Date.now()}.${fileExt}`;
      const filePath = `attestation-logos/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('agency-assets')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('agency-assets')
        .getPublicUrl(filePath);
      updateField('right_logo_url', urlData.publicUrl);
      toast.success("Logo droit importé");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'import du logo");
    } finally {
      setUploadingRightLogo(false);
      if (rightLogoInputRef.current) rightLogoInputRef.current.value = '';
    }
  };

  const handleWatermarkImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingWatermark(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `watermark-${Date.now()}.${fileExt}`;
      const filePath = `attestation-logos/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('agency-assets')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('agency-assets')
        .getPublicUrl(filePath);
      updateField('watermark_image_url', urlData.publicUrl);
      toast.success("Image de filigrane importée");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'import");
    } finally {
      setUploadingWatermark(false);
      if (watermarkInputRef.current) watermarkInputRef.current.value = '';
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({
      ...emptyForm,
      content: defaultContent,
      template_type: templateType,
      is_default: templates.length === 0,
      watermark_rotation: templateType === "cession" ? -34 : -45,
    });
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
      header_ministere: (t as any).header_ministere || "",
      header_region: (t as any).header_region || "",
      header_departement: (t as any).header_departement || "",
      header_republique: (t as any).header_republique || "République de Côte d'Ivoire",
      header_devise: (t as any).header_devise || "Union-Discipline-Travail",
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
      right_logo_url: (t as any).right_logo_url || null,
      template_type: t.template_type || templateType,
      header_line_color: t.header_line_color || "#FF8C00",
      title_border_color: (t as any).title_border_color || null,
      title_bg_color: (t as any).title_bg_color || null,
      watermark_type: (t as any).watermark_type || "none",
      watermark_text: (t as any).watermark_text || null,
      watermark_image_url: (t as any).watermark_image_url || null,
      watermark_angle: (t as any).watermark_angle || "diagonal",
      watermark_opacity: (t as any).watermark_opacity ?? 0.1,
      watermark_repeat: (t as any).watermark_repeat ?? true,
      watermark_position_x: (t as any).watermark_position_x ?? 50,
      watermark_position_y: (t as any).watermark_position_y ?? 50,
      watermark_rotation: (t as any).watermark_rotation ?? (templateType === "cession" ? -34 : -45),
      page_border_enabled: (t as any).page_border_enabled || false,
      page_border_color: (t as any).page_border_color || '#8B4513',
      page_border_style: (t as any).page_border_style || 'geometric',
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
      header_ministere: (t as any).header_ministere || "",
      header_region: (t as any).header_region || "",
      header_departement: (t as any).header_departement || "",
      header_republique: (t as any).header_republique || "République de Côte d'Ivoire",
      header_devise: (t as any).header_devise || "Union-Discipline-Travail",
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
      right_logo_url: (t as any).right_logo_url || null,
      template_type: t.template_type || templateType,
      header_line_color: t.header_line_color || "#FF8C00",
      title_border_color: (t as any).title_border_color || null,
      title_bg_color: (t as any).title_bg_color || null,
      watermark_type: (t as any).watermark_type || "none",
      watermark_text: (t as any).watermark_text || null,
      watermark_image_url: (t as any).watermark_image_url || null,
      watermark_angle: (t as any).watermark_angle || "diagonal",
      watermark_opacity: (t as any).watermark_opacity ?? 0.1,
      watermark_repeat: (t as any).watermark_repeat ?? true,
      watermark_position_x: (t as any).watermark_position_x ?? 50,
      watermark_position_y: (t as any).watermark_position_y ?? 50,
      watermark_rotation: (t as any).watermark_rotation ?? (templateType === "cession" ? -34 : -45),
      page_border_enabled: (t as any).page_border_enabled || false,
      page_border_color: (t as any).page_border_color || '#8B4513',
      page_border_style: (t as any).page_border_style || 'geometric',
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
                {isCession ? "Modèles d'attestation de cession" : "Modèles d'attestation villageoise"}
              </CardTitle>
              <CardDescription>
                {isCession
                  ? "Créez des modèles pour générer automatiquement les attestations de cession (signataires : Cédant et Agence/Promoteur)"
                  : "Créez des modèles avec variables dynamiques pour générer automatiquement les attestations d'attribution"}
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
              <div className="space-y-2 rounded-lg border border-dashed p-3">
                <Label className="text-xs font-semibold text-muted-foreground">En-tête officiel (haut du document)</Label>
                <p className="text-xs text-muted-foreground">
                  Bloc gauche : Ministère, Région, Département, Commune, Village. Bloc droit : République et Devise.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Ministère (gauche)</Label>
                    <Textarea
                      value={form.header_ministere || ""}
                      onChange={(e) => updateField("header_ministere", e.target.value)}
                      placeholder="Ex: Ministère d'État, Ministère de l'Intérieur et de la Sécurité"
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">République (droite)</Label>
                    <Input
                      value={form.header_republique || ""}
                      onChange={(e) => updateField("header_republique", e.target.value)}
                      placeholder="Ex: République de Côte d'Ivoire"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Région (gauche)</Label>
                    <Input
                      value={form.header_region || ""}
                      onChange={(e) => updateField("header_region", e.target.value)}
                      placeholder="Ex: Région de la Marahoué"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Devise (droite)</Label>
                    <Input
                      value={form.header_devise || ""}
                      onChange={(e) => updateField("header_devise", e.target.value)}
                      placeholder="Ex: Union-Discipline-Travail"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Département (gauche)</Label>
                    <Input
                      value={form.header_departement || ""}
                      onChange={(e) => updateField("header_departement", e.target.value)}
                      placeholder="Ex: Département de Bouaflé"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">District (optionnel)</Label>
                  <Input value={form.district} onChange={(e) => updateField("district", e.target.value)} placeholder="Ex: District Autonome d'Abidjan" />
                </div>
                <div>
                  <Label className="text-xs">Commune (gauche)</Label>
                  <Input value={form.commune} onChange={(e) => updateField("commune", e.target.value)} placeholder="Ex: Commune de BOUAFLE" />
                </div>
                <div>
                  <Label className="text-xs">Village (gauche)</Label>
                  <Input value={form.village} onChange={(e) => updateField("village", e.target.value)} placeholder="Ex: Village de LOPOUAFLA" />
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

            {/* Logos gauche et droit - for both attribution and cession */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Logos de l'en-tête</Label>
              <p className="text-xs text-muted-foreground">
                Importez les logos qui apparaîtront en haut à gauche et à droite de l'attestation (ex: logo du village, logo du district).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Logo gauche */}
                <div className="space-y-2 border rounded-lg p-3">
                  <Label className="text-xs font-medium">Logo gauche</Label>
                  {form.village_logo_url ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={form.village_logo_url}
                        alt="Logo gauche"
                        className="w-16 h-16 object-contain border rounded-lg"
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
                        Importer
                      </Button>
                    </div>
                  )}
                </div>
                {/* Logo droit */}
                <div className="space-y-2 border rounded-lg p-3">
                  <Label className="text-xs font-medium">Logo droit</Label>
                  {form.right_logo_url ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={form.right_logo_url}
                        alt="Logo droit"
                        className="w-16 h-16 object-contain border rounded-lg"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateField('right_logo_url', null)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={rightLogoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleRightLogoUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rightLogoInputRef.current?.click()}
                        disabled={uploadingRightLogo}
                      >
                        {uploadingRightLogo ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Importer
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Couleurs du bandeau - only for attribution */}
            {!isCession && (
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
            )}

            {/* Couleur des traits - only for cession */}
            {isCession && (() => {
              const isTraitsEnabled = form.header_line_color !== "none" && form.header_line_color !== null;
              const parseColors = (val: string | null): string[] => {
                if (!val || val === "none") return ["#FF8C00"];
                try { const arr = JSON.parse(val); return Array.isArray(arr) ? arr : [val]; } catch { return [val]; }
              };
              const colors = parseColors(form.header_line_color);
              const updateColors = (newColors: string[]) => updateField("header_line_color", JSON.stringify(newColors));
              return (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Traits décoratifs</Label>
                <p className="text-xs text-muted-foreground">
                  Tirets colorés sous l'en-tête du document.
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isTraitsEnabled}
                    onCheckedChange={(v) => updateField("header_line_color", v ? JSON.stringify(["#000000"]) : "none")}
                  />
                  <Label className="text-sm">Activer les traits</Label>
                </div>
                {isTraitsEnabled && (
                  <>
                    <div className="space-y-2">
                      {colors.map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="color"
                            value={c}
                            onChange={(e) => { const nc = [...colors]; nc[i] = e.target.value; updateColors(nc); }}
                            className="w-8 h-8 rounded cursor-pointer border border-border"
                          />
                          <Input
                            value={c}
                            onChange={(e) => { const nc = [...colors]; nc[i] = e.target.value; updateColors(nc); }}
                            className="w-24 font-mono text-xs"
                          />
                          {colors.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const nc = colors.filter((_, j) => j !== i); updateColors(nc); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {colors.length < 4 && (
                        <Button variant="outline" size="sm" onClick={() => updateColors([...colors, "#008000"])}>
                          <Plus className="h-3 w-3 mr-1" />
                          Ajouter une couleur
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Aperçu</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="h-1.5 w-8 rounded"
                            style={{ backgroundColor: colors[i % colors.length] }}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              );
            })()}

            {/* Encadrement du titre */}
            {isCession && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Encadrement du titre</Label>
                <p className="text-xs text-muted-foreground">
                  Ajoutez un cadre coloré autour du titre "ATTESTATION DE CESSION DE TERRAIN N°"
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={!!form.title_border_color}
                    onCheckedChange={(v) => updateField("title_border_color", v ? (form.header_line_color || "#FF8C00") : null)}
                  />
                  <Label className="text-sm">Activer l'encadrement</Label>
                </div>
                {form.title_border_color && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Couleur du cadre</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.title_border_color}
                            onChange={(e) => updateField("title_border_color", e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer border border-border"
                          />
                          <Input
                            value={form.title_border_color}
                            onChange={(e) => updateField("title_border_color", e.target.value)}
                            className="w-28 font-mono text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Couleur de fond du cadre</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.title_bg_color || "#ffffff"}
                            onChange={(e) => updateField("title_bg_color", e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer border border-border"
                          />
                          <Input
                            value={form.title_bg_color || ""}
                            placeholder="Aucun (transparent)"
                            onChange={(e) => updateField("title_bg_color", e.target.value || null)}
                            className="w-32 font-mono text-xs"
                          />
                          {form.title_bg_color && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => updateField("title_bg_color", null)}
                              className="text-xs h-8"
                            >
                              Effacer
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Aperçu</Label>
                      <div
                        className="mt-1 px-4 py-1.5 rounded text-center text-xs font-bold"
                        style={{
                          border: `2px solid ${form.title_border_color}`,
                          backgroundColor: form.title_bg_color || "transparent",
                          color: "#333",
                        }}
                      >
                        ATTESTATION DE CESSION DE TERRAIN N°
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Couleur de fond du document */}

            <Separator />

            {/* Filigrane / Watermark */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Filigrane (Watermark)
              </Label>
              <p className="text-xs text-muted-foreground">
                Ajoutez un filigrane en image/logo ou en texte sur le document. Le filigrane peut être oblique ou horizontal, répété en plusieurs exemplaires.
              </p>

              {/* Type selector */}
              <div className="flex items-center gap-4">
                {["none", "image", "text"].map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="watermark_type"
                      value={type}
                      checked={form.watermark_type === type}
                      onChange={() => updateField("watermark_type", type)}
                      className="accent-primary"
                    />
                    <span className="text-sm">
                      {type === "none" ? "Aucun" : type === "image" ? "Image / Logo" : "Texte"}
                    </span>
                  </label>
                ))}
              </div>

              {form.watermark_type === "image" && (
                <div className="space-y-2">
                  {form.watermark_image_url ? (
                    <div className="flex items-center gap-4">
                      <img src={form.watermark_image_url} alt="Filigrane" className="w-16 h-16 object-contain border rounded-lg opacity-30" />
                      <Button variant="outline" size="sm" onClick={() => updateField('watermark_image_url', null)}>
                        <X className="h-4 w-4 mr-1" /> Supprimer
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input ref={watermarkInputRef} type="file" accept="image/*" onChange={handleWatermarkImageUpload} className="hidden" />
                      <Button variant="outline" size="sm" onClick={() => watermarkInputRef.current?.click()} disabled={uploadingWatermark}>
                        {uploadingWatermark ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        Importer l'image du filigrane
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {form.watermark_type === "text" && (
                <div className="space-y-2">
                  <Label className="text-xs">Texte du filigrane</Label>
                  <Input
                    value={form.watermark_text || ""}
                    onChange={(e) => updateField("watermark_text", e.target.value)}
                    placeholder="Ex: COPIE, CONFIDENTIEL, NOM AGENCE..."
                  />
                </div>
              )}

              {form.watermark_type !== "none" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Opacité ({Math.round((form.watermark_opacity ?? 0.1) * 100)}%)</Label>
                    <input
                      type="range"
                      min="0.02"
                      max="0.4"
                      step="0.02"
                      value={form.watermark_opacity ?? 0.1}
                      onChange={(e) => updateField("watermark_opacity", parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <Switch checked={form.watermark_repeat ?? true} onCheckedChange={(v) => updateField("watermark_repeat", v)} />
                    <Label className="text-sm">Répéter le motif</Label>
                  </div>
                </div>
              )}

              {form.watermark_type !== "none" && (
                <div className="p-4 rounded-lg bg-muted/30 border border-dashed">
                  <WatermarkPositionEditor
                    positionX={form.watermark_position_x ?? 50}
                    positionY={form.watermark_position_y ?? 50}
                    rotation={0}
                    onChange={({ positionX, positionY }) => {
                      updateField("watermark_position_x", positionX);
                      updateField("watermark_position_y", positionY);
                      updateField("watermark_rotation", 0);
                    }}
                    watermarkType={form.watermark_type ?? "none"}
                    watermarkAngle="horizontal"
                    watermarkText={form.watermark_text}
                    watermarkImageUrl={form.watermark_image_url}
                    watermarkRepeat={form.watermark_repeat ?? true}
                    opacity={form.watermark_opacity ?? 0.1}
                    templateType={templateType}
                    pageBorderEnabled={form.page_border_enabled}
                    pageBorderStyle={form.page_border_style}
                  />
                </div>
              )}
            </div>

            <Separator />

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

            {/* Bordure décorative de page */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Bordure décorative de page</Label>
              <p className="text-xs text-muted-foreground">
                Ajoutez une bordure décorative autour de l'ensemble du document (comme sur les attestations officielles).
              </p>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.page_border_enabled}
                  onCheckedChange={(v) => updateField("page_border_enabled", v)}
                />
                <Label className="text-sm">Activer la bordure</Label>
              </div>
              {form.page_border_enabled && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Couleur de la bordure</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.page_border_color || "#8B4513"}
                          onChange={(e) => updateField("page_border_color", e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border border-border"
                        />
                        <Input
                          value={form.page_border_color || "#8B4513"}
                          onChange={(e) => updateField("page_border_color", e.target.value)}
                          className="w-28 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Style de bordure</Label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { value: "geometric", label: "Géométrique", desc: "Cadre double avec motifs carrés" },
                        { value: "dashes", label: "Tirets", desc: "Tirets colorés autour de la page" },
                        { value: "double", label: "Double ligne", desc: "Double cadre simple" },
                        { value: "ornate", label: "Orné", desc: "Cadre avec points et coins décorés" },
                      ].map((style) => (
                        <label key={style.value} className="flex items-start gap-2 cursor-pointer border rounded-lg p-2 hover:bg-accent/50 transition-colors">
                          <input
                            type="radio"
                            name="page_border_style"
                            value={style.value}
                            checked={form.page_border_style === style.value}
                            onChange={() => updateField("page_border_style", style.value)}
                            className="accent-primary mt-0.5"
                          />
                          <div>
                            <span className="text-sm font-medium">{style.label}</span>
                            <p className="text-xs text-muted-foreground">{style.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Motifs thématiques (fruits & plantes)</Label>
                    <p className="text-xs text-muted-foreground">Bordure répétée avec un motif local pour personnaliser l'attestation.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {BORDER_MOTIF_OPTIONS.map((motif) => (
                        <label
                          key={motif.value}
                          className={`flex flex-col items-center gap-1 cursor-pointer border rounded-lg p-2 transition-colors ${
                            form.page_border_style === motif.value ? "border-primary bg-accent/40" : "hover:bg-accent/30"
                          }`}
                        >
                          <input
                            type="radio"
                            name="page_border_style"
                            value={motif.value}
                            checked={form.page_border_style === motif.value}
                            onChange={() => updateField("page_border_style", motif.value)}
                            className="sr-only"
                          />
                          <span className="text-2xl leading-none" aria-hidden>{motif.emoji}</span>
                          <span className="text-xs font-medium text-center">{motif.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Aperçu</Label>
                    {isMotifBorderStyle(form.page_border_style) ? (
                      <div className="mt-1 w-40 h-24 rounded relative bg-background border border-dashed border-border overflow-hidden">
                        {(() => {
                          const motif = BORDER_MOTIF_OPTIONS.find((m) => m.value === form.page_border_style);
                          if (!motif) return null;
                          const emojis = Array.from({ length: 12 }, (_, i) => i);
                          return (
                            <>
                              <div className="absolute top-0 left-0 right-0 flex justify-around text-sm">
                                {emojis.slice(0, 6).map((i) => (
                                  <span key={`t${i}`}>{motif.emoji}</span>
                                ))}
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 flex justify-around text-sm">
                                {emojis.slice(0, 6).map((i) => (
                                  <span key={`b${i}`}>{motif.emoji}</span>
                                ))}
                              </div>
                              <div className="absolute top-0 bottom-0 left-0 flex flex-col justify-around text-sm py-4">
                                {emojis.slice(0, 3).map((i) => (
                                  <span key={`l${i}`}>{motif.emoji}</span>
                                ))}
                              </div>
                              <div className="absolute top-0 bottom-0 right-0 flex flex-col justify-around text-sm py-4">
                                {emojis.slice(0, 3).map((i) => (
                                  <span key={`r${i}`}>{motif.emoji}</span>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div
                        className="mt-1 w-32 h-20 rounded relative"
                        style={{
                          border: form.page_border_style === 'double' || form.page_border_style === 'geometric' || form.page_border_style === 'ornate'
                            ? `2px solid ${form.page_border_color || '#8B4513'}`
                            : `2px dashed ${form.page_border_color || '#8B4513'}`,
                        }}
                      >
                        {(form.page_border_style === 'double' || form.page_border_style === 'geometric' || form.page_border_style === 'ornate') && (
                          <div
                            className="absolute inset-1 rounded"
                            style={{
                              border: `1px solid ${form.page_border_color || '#8B4513'}`,
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
                {variables.map((v) => (
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
                <AttestationPreview
                  content={form.content}
                  templateType={templateType}
                  watermarkType={form.watermark_type}
                  watermarkText={form.watermark_text}
                  watermarkImageUrl={form.watermark_image_url}
                  watermarkAngle={form.watermark_angle}
                  watermarkOpacity={form.watermark_opacity}
                  watermarkRepeat={form.watermark_repeat}
                  watermarkPositionX={form.watermark_position_x}
                  watermarkPositionY={form.watermark_position_y}
                  watermarkRotation={form.watermark_rotation}
                  pageBorderEnabled={form.page_border_enabled}
                  pageBorderStyle={form.page_border_style}
                />
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
