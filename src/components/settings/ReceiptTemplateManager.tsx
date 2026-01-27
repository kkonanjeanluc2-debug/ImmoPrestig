import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Star,
  Copy,
  Loader2,
  Droplets,
  Type,
  ImageIcon,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { ReceiptTemplateImportExport } from "./ReceiptTemplateImportExport";
import { WatermarkThumbnail } from "./WatermarkThumbnail";
import {
  useReceiptTemplates,
  useCreateReceiptTemplate,
  useUpdateReceiptTemplate,
  useDeleteReceiptTemplate,
  useSetDefaultReceiptTemplate,
  type ReceiptTemplate,
  type ReceiptTemplateInsert,
} from "@/hooks/useReceiptTemplates";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import { formatAmountForPDF } from "@/lib/pdfFormat";

const DEFAULT_TEMPLATE_VALUES: ReceiptTemplateInsert = {
  name: "",
  is_default: false,
  title: "QUITTANCE DE LOYER",
  declaration_text: "Je soussigné(e), {bailleur}, propriétaire/gestionnaire du bien désigné ci-dessus, déclare avoir reçu de {locataire} la somme de {montant} au titre du loyer pour la période indiquée, et lui en donne quittance, sous réserve de tous mes droits.",
  footer_text: "Document généré par {agence}",
  signature_text: "Signature du bailleur/gestionnaire",
  show_logo: true,
  show_contacts: true,
  show_amount_in_words: true,
  date_format: "DD/MM/YYYY",
  currency_symbol: "F CFA",
  watermark_enabled: false,
  watermark_type: "text",
  watermark_text: "ORIGINAL",
  watermark_image_url: null,
  watermark_opacity: 15,
  watermark_angle: -45,
  watermark_position: "diagonal",
};

const VARIABLE_HINTS: Record<string, string[]> = {
  declaration_text: ["{bailleur}", "{locataire}", "{montant}", "{periode}", "{bien}"],
  footer_text: ["{agence}", "{telephone}", "{email}", "{adresse}"],
  signature_text: ["{bailleur}"],
};

export function ReceiptTemplateManager() {
  const { data: templates = [], isLoading } = useReceiptTemplates();
  const { data: agency } = useAgency();
  const createTemplate = useCreateReceiptTemplate();
  const updateTemplate = useUpdateReceiptTemplate();
  const deleteTemplate = useDeleteReceiptTemplate();
  const setDefaultTemplate = useSetDefaultReceiptTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReceiptTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ReceiptTemplate | null>(null);
  const [formData, setFormData] = useState<ReceiptTemplateInsert>(DEFAULT_TEMPLATE_VALUES);
  const [activeTab, setActiveTab] = useState("content");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Generate PDF preview
  const generatePdfPreview = useCallback(async () => {
    setIsGeneratingPdf(true);
    try {
      const jsPDF = (await import("jspdf")).default;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Sample data for preview
      const sampleData = {
        tenantName: "Marie Dupont",
        ownerName: agency?.name || "Propriétaire Exemple",
        propertyTitle: "Appartement T3 - Centre-ville",
        propertyAddress: "123 Rue de la Paix, 75001 Paris",
        amount: 850000,
        period: "Janvier 2024",
        paidDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        method: "Virement bancaire",
        paymentId: "PAY-12345678",
      };

      // Colors
      const primaryColor: [number, number, number] = [26, 54, 93];
      const textColor: [number, number, number] = [51, 51, 51];
      const lightGray: [number, number, number] = [245, 245, 245];

      // Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 55, "F");

      // Agency info
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(agency?.name || "Nom de l'agence", 15, 15);

      if (formData.show_contacts) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        let contactY = 22;
        if (agency?.phone) {
          doc.text(`Tél: ${agency.phone}`, 15, contactY);
          contactY += 5;
        }
        if (agency?.email) {
          doc.text(agency.email, 15, contactY);
          contactY += 5;
        }
        if (agency?.address || agency?.city) {
          const addressParts = [agency.address, agency.city, agency.country].filter(Boolean);
          doc.text(addressParts.join(", "), 15, contactY);
        }
      }

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(formData.title, pageWidth - 15, 18, { align: "right" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`N° ${sampleData.paymentId.substring(0, 8).toUpperCase()}`, pageWidth - 15, 26, { align: "right" });

      doc.setTextColor(...textColor);
      let yPos = 70;

      // Period box
      doc.setFillColor(...lightGray);
      doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Période : ${sampleData.period}`, pageWidth / 2, yPos + 12, { align: "center" });

      yPos += 35;

      // Owner section
      const colWidth = (pageWidth - 40) / 2;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text("BAILLEUR", 15, yPos);
      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");
      doc.text(sampleData.ownerName, 15, yPos + 7);

      // Tenant section
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text("LOCATAIRE", 15 + colWidth + 10, yPos);
      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");
      doc.text(sampleData.tenantName, 15 + colWidth + 10, yPos + 7);

      yPos += 25;

      // Property section
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text("BIEN LOUÉ", 15, yPos);
      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");
      yPos += 7;
      doc.text(sampleData.propertyTitle, 15, yPos);
      yPos += 5;
      doc.setFontSize(9);
      doc.text(sampleData.propertyAddress, 15, yPos);

      yPos += 20;

      // Amount box
      doc.setFillColor(...primaryColor);
      doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Montant du loyer reçu", pageWidth / 2, yPos + 12, { align: "center" });
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      const amountText = `${formatAmountForPDF(sampleData.amount)} ${formData.currency_symbol}`;
      doc.text(amountText, pageWidth / 2, yPos + 26, { align: "center", charSpace: 0.5 });

      yPos += 50;

      // Amount in words
      if (formData.show_amount_in_words) {
        doc.setTextColor(...textColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text("Soit : huit cent cinquante mille francs CFA", 15, yPos);
        yPos += 15;
      }

      // Declaration
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textColor);
      const declarationText = formData.declaration_text
        .replace(/{bailleur}/g, sampleData.ownerName)
        .replace(/{locataire}/g, sampleData.tenantName)
        .replace(/{montant}/g, `${formatAmountForPDF(sampleData.amount)} ${formData.currency_symbol}`)
        .replace(/{periode}/g, sampleData.period)
        .replace(/{bien}/g, sampleData.propertyTitle);
      const splitDeclaration = doc.splitTextToSize(declarationText, pageWidth - 30);
      doc.text(splitDeclaration, 15, yPos, { lineHeightFactor: 1.5 });
      yPos += splitDeclaration.length * 5 + 20;

      // Signature
      const today = new Date().toLocaleDateString("fr-FR", formData.date_format === "long" ? { day: "numeric", month: "long", year: "numeric" } : undefined);
      doc.text(`Fait le ${today}`, pageWidth - 20, yPos, { align: "right" });
      yPos += 15;
      doc.setFont("helvetica", "italic");
      const signatureText = formData.signature_text.replace(/{bailleur}/g, sampleData.ownerName);
      doc.text(signatureText, pageWidth - 20, yPos, { align: "right" });

      // Watermark
      if (formData.watermark_enabled) {
        const opacity = formData.watermark_opacity / 100;
        
        if (formData.watermark_type === "text" && formData.watermark_text) {
          doc.saveGraphicsState();
          const grayValue = Math.round(200 + (55 * (1 - opacity)));
          doc.setTextColor(grayValue, grayValue, grayValue);
          doc.setFontSize(60);
          doc.setFont("helvetica", "bold");

          if (formData.watermark_position === "diagonal") {
            doc.setFontSize(40);
            for (let i = -2; i < 4; i++) {
              for (let j = -2; j < 4; j++) {
                const x = (pageWidth / 3) * i + 30;
                const y = (pageHeight / 4) * j + 60;
                if (x > -50 && x < pageWidth + 50 && y > -50 && y < pageHeight + 50) {
                  doc.text(formData.watermark_text, x, y, { align: "center" });
                }
              }
            }
          } else if (formData.watermark_position === "bottom-right") {
            doc.text(formData.watermark_text, pageWidth - 50, pageHeight - 50, { align: "center" });
          } else {
            doc.text(formData.watermark_text, pageWidth / 2, pageHeight / 2, { align: "center" });
          }
          doc.restoreGraphicsState();
        } else if (formData.watermark_type === "agency_logo" && agency?.logo_url) {
          // Agency logo watermark - load and render
          try {
            const response = await fetch(agency.logo_url);
            const blob = await response.blob();
            const logoBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            const logoSize = 60;
            doc.saveGraphicsState();
            
            if (formData.watermark_position === "diagonal") {
              const smallLogoSize = 40;
              for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 4; j++) {
                  const x = (pageWidth / 3) * i + 20;
                  const y = (pageHeight / 4) * j + 40;
                  if (x > 0 && x < pageWidth - smallLogoSize && y > 0 && y < pageHeight - smallLogoSize) {
                    doc.setGState(new (doc as any).GState({ opacity: opacity }));
                    doc.addImage(logoBase64, 'PNG', x, y, smallLogoSize, smallLogoSize);
                  }
                }
              }
            } else if (formData.watermark_position === "bottom-right") {
              doc.setGState(new (doc as any).GState({ opacity: opacity }));
              doc.addImage(logoBase64, 'PNG', pageWidth - logoSize - 20, pageHeight - logoSize - 40, logoSize, logoSize);
            } else {
              doc.setGState(new (doc as any).GState({ opacity: opacity }));
              doc.addImage(logoBase64, 'PNG', (pageWidth - logoSize) / 2, (pageHeight - logoSize) / 2, logoSize, logoSize);
            }
            doc.restoreGraphicsState();
          } catch (e) {
            console.error("Failed to load agency logo for watermark preview:", e);
          }
        }
      }

      // Footer
      doc.setFillColor(...lightGray);
      doc.rect(0, pageHeight - 25, pageWidth, 25, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128);

      const footerText = formData.footer_text
        .replace(/{agence}/g, agency?.name || "Agence")
        .replace(/{telephone}/g, agency?.phone || "")
        .replace(/{email}/g, agency?.email || "");
      doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: "center" });

      if (formData.show_contacts) {
        const contactLine = [agency?.phone, agency?.email].filter(Boolean).join(" | ");
        if (contactLine) {
          doc.text(contactLine, pageWidth / 2, pageHeight - 8, { align: "center" });
        }
      }

      // Create blob URL
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);

      // Cleanup previous URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      setPdfUrl(url);
    } catch (error) {
      console.error("Error generating PDF preview:", error);
      toast.error("Erreur lors de la génération de l'aperçu");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [formData, agency, pdfUrl]);

  // Generate PDF when switching to preview tab
  useEffect(() => {
    if (activeTab === "preview" && isDialogOpen) {
      generatePdfPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isDialogOpen, formData]);

  // Cleanup PDF URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleDownloadPreview = () => {
    if (!pdfUrl) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `apercu_${formData.name || "modele"}.pdf`;
    link.click();
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({ ...DEFAULT_TEMPLATE_VALUES, is_default: templates.length === 0 });
    setActiveTab("content");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (template: ReceiptTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      is_default: template.is_default,
      title: template.title,
      declaration_text: template.declaration_text,
      footer_text: template.footer_text,
      signature_text: template.signature_text,
      show_logo: template.show_logo,
      show_contacts: template.show_contacts,
      show_amount_in_words: template.show_amount_in_words,
      date_format: template.date_format,
      currency_symbol: template.currency_symbol,
      watermark_enabled: template.watermark_enabled,
      watermark_type: template.watermark_type,
      watermark_text: template.watermark_text,
      watermark_image_url: template.watermark_image_url,
      watermark_opacity: template.watermark_opacity,
      watermark_angle: template.watermark_angle,
      watermark_position: template.watermark_position,
    });
    setActiveTab("content");
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: ReceiptTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (copie)`,
      is_default: false,
      title: template.title,
      declaration_text: template.declaration_text,
      footer_text: template.footer_text,
      signature_text: template.signature_text,
      show_logo: template.show_logo,
      show_contacts: template.show_contacts,
      show_amount_in_words: template.show_amount_in_words,
      date_format: template.date_format,
      currency_symbol: template.currency_symbol,
      watermark_enabled: template.watermark_enabled,
      watermark_type: template.watermark_type,
      watermark_text: template.watermark_text,
      watermark_image_url: template.watermark_image_url,
      watermark_opacity: template.watermark_opacity,
      watermark_angle: template.watermark_angle,
      watermark_position: template.watermark_position,
    });
    setActiveTab("content");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Veuillez saisir un nom pour le modèle");
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({ id: editingTemplate.id, ...formData });
      } else {
        await createTemplate.mutateAsync(formData);
      }
      setIsDialogOpen(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleSetDefault = async (template: ReceiptTemplate) => {
    if (template.is_default) return;
    await setDefaultTemplate.mutateAsync(template.id);
  };

  const renderVariableHints = (field: keyof typeof VARIABLE_HINTS) => {
    const hints = VARIABLE_HINTS[field];
    if (!hints || hints.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        <span className="text-xs text-muted-foreground">Variables :</span>
        {hints.map((hint) => (
          <Badge
            key={hint}
            variant="secondary"
            className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
            onClick={() => {
              navigator.clipboard.writeText(hint);
              toast.info(`${hint} copié !`);
            }}
          >
            {hint}
          </Badge>
        ))}
      </div>
    );
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate">Modèles de quittances</CardTitle>
              <CardDescription className="line-clamp-2">
                Créez et gérez plusieurs modèles personnalisés pour vos quittances
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReceiptTemplateImportExport templates={templates} />
            <Button onClick={handleOpenCreate} size="sm" className="text-xs sm:text-sm">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Nouveau</span> modèle
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Aucun modèle de quittance créé</p>
            <p className="text-sm">Créez votre premier modèle pour personnaliser vos quittances</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="relative group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{template.name}</h3>
                      {template.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Par défaut
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {template.title}
                  </p>

                  {/* Watermark Thumbnail Preview */}
                  <WatermarkThumbnail template={template} agencyLogoUrl={agency?.logo_url} />

                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.show_logo && (
                      <Badge variant="outline" className="text-xs">Logo</Badge>
                    )}
                    {template.watermark_enabled && (
                      <Badge variant="outline" className="text-xs">Filigrane</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{template.currency_symbol}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenEdit(template)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(template)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {!template.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(template)}
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setTemplateToDelete(template);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Modifier le modèle" : "Nouveau modèle de quittance"}
            </DialogTitle>
            <DialogDescription>
              Personnalisez les textes et les options d'affichage de votre quittance
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Template name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nom du modèle *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Quittance standard, Quittance commerciale..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label htmlFor="is_default">Définir comme modèle par défaut</Label>
              </div>

              <Separator />

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="content">Contenu</TabsTrigger>
                  <TabsTrigger value="layout">Mise en page</TabsTrigger>
                  <TabsTrigger value="watermark">Filigrane</TabsTrigger>
                  <TabsTrigger value="preview" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Aperçu
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre du document</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="QUITTANCE DE LOYER"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="declaration">Texte de déclaration</Label>
                    <Textarea
                      id="declaration"
                      value={formData.declaration_text}
                      onChange={(e) => setFormData({ ...formData, declaration_text: e.target.value })}
                      rows={4}
                    />
                    {renderVariableHints("declaration_text")}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signature">Libellé de signature</Label>
                    <Input
                      id="signature"
                      value={formData.signature_text}
                      onChange={(e) => setFormData({ ...formData, signature_text: e.target.value })}
                    />
                    {renderVariableHints("signature_text")}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="footer">Texte de pied de page</Label>
                    <Input
                      id="footer"
                      value={formData.footer_text}
                      onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                    />
                    {renderVariableHints("footer_text")}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Devise</Label>
                    <Select
                      value={formData.currency_symbol}
                      onValueChange={(value) => setFormData({ ...formData, currency_symbol: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="F CFA">F CFA</SelectItem>
                        <SelectItem value="FCFA">FCFA</SelectItem>
                        <SelectItem value="€">Euro (€)</SelectItem>
                        <SelectItem value="$">Dollar ($)</SelectItem>
                        <SelectItem value="XOF">XOF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="layout" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Label htmlFor="show_logo">Afficher le logo</Label>
                      <Switch
                        id="show_logo"
                        checked={formData.show_logo}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_logo: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Label htmlFor="show_contacts">Afficher les coordonnées</Label>
                      <Switch
                        id="show_contacts"
                        checked={formData.show_contacts}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_contacts: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Label htmlFor="show_amount">Montant en lettres</Label>
                      <Switch
                        id="show_amount"
                        checked={formData.show_amount_in_words}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_amount_in_words: checked })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_format">Format de date</Label>
                    <Select
                      value={formData.date_format}
                      onValueChange={(value) => setFormData({ ...formData, date_format: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (01/01/2024)</SelectItem>
                        <SelectItem value="long">Long (1er janvier 2024)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="watermark" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Droplets className="h-5 w-5 text-primary" />
                      <Label htmlFor="watermark_enabled">Activer le filigrane</Label>
                    </div>
                    <Switch
                      id="watermark_enabled"
                      checked={formData.watermark_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, watermark_enabled: checked })}
                    />
                  </div>

                  {formData.watermark_enabled && (
                    <>
                      <div className="space-y-3">
                        <Label>Type de filigrane</Label>
                        <RadioGroup
                          value={formData.watermark_type}
                          onValueChange={(value) => setFormData({ ...formData, watermark_type: value })}
                          className="grid grid-cols-3 gap-2"
                        >
                          <div className="flex items-center space-x-2 p-2 border rounded-lg">
                            <RadioGroupItem value="text" id="wm-text" />
                            <Label htmlFor="wm-text" className="flex items-center gap-2 cursor-pointer text-sm">
                              <Type className="h-4 w-4" />
                              Texte
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 border rounded-lg">
                            <RadioGroupItem value="image" id="wm-image" />
                            <Label htmlFor="wm-image" className="flex items-center gap-2 cursor-pointer text-sm">
                              <ImageIcon className="h-4 w-4" />
                              Image
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 border rounded-lg">
                            <RadioGroupItem value="agency_logo" id="wm-logo" />
                            <Label htmlFor="wm-logo" className="flex items-center gap-2 cursor-pointer text-sm">
                              <Star className="h-4 w-4" />
                              Logo agence
                            </Label>
                          </div>
                        </RadioGroup>
                        {formData.watermark_type === "agency_logo" && !agency?.logo_url && (
                          <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                            ⚠️ Aucun logo d'agence configuré. Veuillez ajouter un logo dans les paramètres d'agence.
                          </p>
                        )}
                      </div>

                      {formData.watermark_type === "text" && (
                        <div className="space-y-2">
                          <Label htmlFor="watermark_text">Texte du filigrane</Label>
                          <Input
                            id="watermark_text"
                            value={formData.watermark_text || ""}
                            onChange={(e) => setFormData({ ...formData, watermark_text: e.target.value })}
                            placeholder="ORIGINAL"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Opacité: {formData.watermark_opacity}%</Label>
                        <Slider
                          value={[formData.watermark_opacity]}
                          onValueChange={(value) => setFormData({ ...formData, watermark_opacity: value[0] })}
                          min={5}
                          max={50}
                          step={5}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Position</Label>
                        <RadioGroup
                          value={formData.watermark_position}
                          onValueChange={(value) => setFormData({ ...formData, watermark_position: value })}
                          className="grid grid-cols-3 gap-2"
                        >
                          <div className="flex items-center space-x-2 p-2 border rounded-lg">
                            <RadioGroupItem value="center" id="pos-center" />
                            <Label htmlFor="pos-center" className="cursor-pointer text-sm">Centre</Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 border rounded-lg">
                            <RadioGroupItem value="diagonal" id="pos-diagonal" />
                            <Label htmlFor="pos-diagonal" className="cursor-pointer text-sm">Diagonal</Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 border rounded-lg">
                            <RadioGroupItem value="bottom-right" id="pos-br" />
                            <Label htmlFor="pos-br" className="cursor-pointer text-sm">Bas droite</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="preview" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Aperçu en temps réel de votre modèle de quittance
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generatePdfPreview}
                          disabled={isGeneratingPdf}
                        >
                          {isGeneratingPdf ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Actualiser
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadPreview}
                          disabled={!pdfUrl || isGeneratingPdf}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg bg-muted/30 overflow-hidden">
                      {isGeneratingPdf ? (
                        <div className="flex flex-col items-center justify-center h-[400px] gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">Génération de l'aperçu...</p>
                        </div>
                      ) : pdfUrl ? (
                        <iframe
                          src={pdfUrl}
                          className="w-full h-[400px]"
                          title="Aperçu du modèle de quittance"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[400px] gap-3 text-muted-foreground">
                          <FileText className="h-12 w-12 opacity-30" />
                          <p className="text-sm">Cliquez sur "Actualiser" pour générer l'aperçu</p>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      L'aperçu utilise des données fictives pour démonstration
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer le modèle "{templateToDelete?.name}". 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
