import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, RotateCcw, Save, Eye, Info, Download, Loader2, Droplets, ImageIcon, Type } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "receipt_templates";

export interface ReceiptTemplates {
  title: string;
  declarationText: string;
  footerText: string;
  showLogo: boolean;
  showAgencyContact: boolean;
  showOwnerSection: boolean;
  showAmountInWords: boolean;
  showPaymentDetails: boolean;
  dateFormat: "short" | "long";
  currency: string;
  signatureLabel: string;
  // Watermark settings
  watermarkEnabled: boolean;
  watermarkType: "text" | "image";
  watermarkText: string;
  watermarkImageUrl: string | null;
  watermarkOpacity: number;
  watermarkAngle: number;
  watermarkPosition: "center" | "diagonal" | "bottom-right";
}

const DEFAULT_TEMPLATES: ReceiptTemplates = {
  title: "QUITTANCE DE LOYER",
  declarationText: "Je soussigné(e), {bailleur}, propriétaire/gestionnaire du bien désigné ci-dessus, déclare avoir reçu de {locataire} la somme de {montant} au titre du loyer pour la période indiquée, et lui en donne quittance, sous réserve de tous mes droits.",
  footerText: "Document généré par {agence}",
  showLogo: true,
  showAgencyContact: true,
  showOwnerSection: true,
  showAmountInWords: true,
  showPaymentDetails: true,
  dateFormat: "long",
  currency: "F CFA",
  signatureLabel: "Signature du bailleur/gestionnaire",
  // Watermark defaults
  watermarkEnabled: false,
  watermarkType: "text",
  watermarkText: "ORIGINAL",
  watermarkImageUrl: null,
  watermarkOpacity: 15,
  watermarkAngle: -45,
  watermarkPosition: "diagonal",
};

const VARIABLE_HINTS: Record<string, string[]> = {
  declarationText: ["{bailleur}", "{locataire}", "{montant}", "{periode}", "{bien}"],
  footerText: ["{agence}", "{telephone}", "{email}", "{adresse}"],
  title: [],
  signatureLabel: ["{bailleur}"],
};

const SAMPLE_DATA = {
  bailleur: "Immobilier Dakar",
  locataire: "Amadou Diallo",
  montant: "250 000 F CFA",
  periode: "Janvier 2024",
  bien: "Appartement T3 - Almadies",
  agence: "Immobilier Dakar",
  telephone: "+221 77 123 45 67",
  email: "contact@immobilier-dakar.sn",
  adresse: "123 Avenue Cheikh Anta Diop, Dakar",
};

export function getReceiptTemplates(): ReceiptTemplates {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_TEMPLATES, ...parsed };
    }
  } catch {
    console.error("Erreur lors de la lecture des templates de quittance");
  }
  return DEFAULT_TEMPLATES;
}

export function saveReceiptTemplates(templates: ReceiptTemplates): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    console.error("Erreur lors de la sauvegarde des templates de quittance");
  }
}

function replaceVariablesForPreview(template: string): string {
  let result = template;
  Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  });
  return result;
}

export function ReceiptSettings() {
  const [templates, setTemplates] = useState<ReceiptTemplates>(getReceiptTemplates);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    setTemplates(getReceiptTemplates());
  }, []);

  // Generate PDF preview when switching to preview tab or when templates change
  const generatePdfPreview = useCallback(async () => {
    setIsGeneratingPdf(true);
    
    try {
      // Dynamic import to avoid loading jsPDF until needed
      const { default: jsPDF } = await import("jspdf");
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Colors
      const primaryColor: [number, number, number] = [26, 54, 93];
      const textColor: [number, number, number] = [51, 51, 51];
      const lightGray: [number, number, number] = [245, 245, 245];
      
      // Header background
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 55, "F");
      
      // Agency name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      
      if (templates.showLogo) {
        // Placeholder for logo
        doc.setFillColor(255, 255, 255, 0.2);
        doc.roundedRect(15, 8, 20, 20, 2, 2, "F");
        doc.text(SAMPLE_DATA.agence, 40, 15);
      } else {
        doc.text(SAMPLE_DATA.agence, 15, 15);
      }
      
      // Agency contact info
      if (templates.showAgencyContact) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        let contactY = 22;
        doc.text(`Tél: ${SAMPLE_DATA.telephone}`, templates.showLogo ? 40 : 15, contactY);
        contactY += 5;
        doc.text(SAMPLE_DATA.email, templates.showLogo ? 40 : 15, contactY);
        contactY += 5;
        doc.text(SAMPLE_DATA.adresse, templates.showLogo ? 40 : 15, contactY);
      }
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(templates.title, pageWidth - 15, 18, { align: "right" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("N° ABC12345", pageWidth - 15, 26, { align: "right" });
      
      // Reset text color
      doc.setTextColor(...textColor);
      
      let yPos = 70;
      
      // Period box
      doc.setFillColor(...lightGray);
      doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Période : ${SAMPLE_DATA.periode}`, pageWidth / 2, yPos + 12, { align: "center" });
      
      yPos += 35;
      
      const colWidth = (pageWidth - 40) / 2;
      
      // Owner section
      if (templates.showOwnerSection) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text("BAILLEUR", 15, yPos);
        doc.setTextColor(...textColor);
        doc.setFont("helvetica", "normal");
        doc.text(SAMPLE_DATA.bailleur, 15, yPos + 7);
      }
      
      // Tenant section
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text("LOCATAIRE", templates.showOwnerSection ? 15 + colWidth + 10 : 15, yPos);
      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");
      doc.text(SAMPLE_DATA.locataire, templates.showOwnerSection ? 15 + colWidth + 10 : 15, yPos + 7);
      doc.setFontSize(9);
      doc.text("amadou.diallo@email.com", templates.showOwnerSection ? 15 + colWidth + 10 : 15, yPos + 12);
      
      yPos += 25;
      
      // Property section
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text("BIEN LOUÉ", 15, yPos);
      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");
      yPos += 7;
      doc.text(SAMPLE_DATA.bien, 15, yPos);
      yPos += 5;
      doc.setFontSize(9);
      doc.text("Route des Almadies, Dakar", 15, yPos);
      
      yPos += 20;
      
      // Amount box
      doc.setFillColor(...primaryColor);
      doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Montant du loyer reçu", pageWidth / 2, yPos + 12, { align: "center" });
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(`250 000 ${templates.currency}`, pageWidth / 2, yPos + 26, { align: "center" });
      
      yPos += 50;
      
      // Amount in words
      if (templates.showAmountInWords) {
        doc.setTextColor(...textColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text("Soit : deux cent cinquante mille francs CFA", 15, yPos);
        yPos += 15;
      }
      
      // Payment details table
      if (templates.showPaymentDetails) {
        doc.setFillColor(...lightGray);
        doc.rect(15, yPos, pageWidth - 30, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...textColor);
        doc.text("DÉTAILS DU PAIEMENT", 20, yPos + 5.5);
        
        yPos += 12;
        doc.setFont("helvetica", "normal");
        
        const formatDate = (date: string) => {
          if (templates.dateFormat === "long") {
            return date;
          }
          return "01/01/2024";
        };
        
        const details = [
          ["Date d'échéance", formatDate("1 janvier 2024")],
          ["Date de paiement", formatDate("5 janvier 2024")],
          ["Mode de paiement", "Virement"],
        ];
        
        details.forEach(([label, value]) => {
          doc.text(label, 20, yPos);
          doc.text(value, pageWidth - 20, yPos, { align: "right" });
          yPos += 7;
        });
        
        yPos += 15;
      } else {
        yPos += 10;
      }
      
      // Declaration text
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textColor);
      const declarationText = replaceVariablesForPreview(templates.declarationText);
      
      const splitDeclaration = doc.splitTextToSize(declarationText, pageWidth - 30);
      doc.text(splitDeclaration, 15, yPos);
      
      yPos += splitDeclaration.length * 5 + 20;
      
      // Date and signature
      const today = templates.dateFormat === "long" 
        ? "23 janvier 2026"
        : "23/01/2026";
      
      doc.setFont("helvetica", "normal");
      doc.text(`Fait le ${today}`, pageWidth - 20, yPos, { align: "right" });
      
      yPos += 15;
      doc.setFont("helvetica", "italic");
      const signatureLabel = replaceVariablesForPreview(templates.signatureLabel);
      doc.text(signatureLabel, pageWidth - 20, yPos, { align: "right" });
      
      // Watermark (rendered before footer so it's behind content)
      if (templates.watermarkEnabled && templates.watermarkType === "text" && templates.watermarkText) {
        const pageHeight = doc.internal.pageSize.getHeight();
        const opacity = templates.watermarkOpacity / 100;
        
        // Save current graphics state
        doc.saveGraphicsState();
        
        // Set watermark color with opacity (light gray)
        const grayValue = Math.round(200 + (55 * (1 - opacity)));
        doc.setTextColor(grayValue, grayValue, grayValue);
        doc.setFontSize(60);
        doc.setFont("helvetica", "bold");
        
        // Calculate position based on setting
        let wmX = pageWidth / 2;
        let wmY = pageHeight / 2;
        
        if (templates.watermarkPosition === "bottom-right") {
          wmX = pageWidth - 50;
          wmY = pageHeight - 50;
        }
        
        // For diagonal, we need to use a workaround since jsPDF doesn't support rotation easily
        // We'll render multiple smaller texts for the diagonal effect
        if (templates.watermarkPosition === "diagonal") {
          doc.setFontSize(40);
          // Render text multiple times across the page diagonally
          for (let i = -2; i < 4; i++) {
            for (let j = -2; j < 4; j++) {
              const x = (pageWidth / 3) * i + 30;
              const y = (pageHeight / 4) * j + 60;
              if (x > -50 && x < pageWidth + 50 && y > -50 && y < pageHeight + 50) {
                doc.text(templates.watermarkText, x, y, { align: "center" });
              }
            }
          }
        } else {
          doc.text(templates.watermarkText, wmX, wmY, { align: "center" });
        }
        
        doc.restoreGraphicsState();
      }
      
      // Footer
      doc.setFillColor(...lightGray);
      doc.rect(0, doc.internal.pageSize.getHeight() - 25, pageWidth, 25, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128);
      
      const footerText = replaceVariablesForPreview(templates.footerText);
      doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: "center" });
      
      if (templates.showAgencyContact) {
        doc.text(
          `${SAMPLE_DATA.telephone} | ${SAMPLE_DATA.email}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }
      
      // Generate blob URL for preview
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      
      // Clean up previous URL
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
  }, [templates, pdfUrl]);

  // Generate PDF when switching to preview tab
  useEffect(() => {
    if (activeTab === "preview-pdf") {
      generatePdfPreview();
    }
  }, [activeTab, generatePdfPreview]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleChange = <K extends keyof ReceiptTemplates>(
    field: K,
    value: ReceiptTemplates[K]
  ) => {
    setTemplates((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveReceiptTemplates(templates);
    setHasChanges(false);
    toast.success("Modèle de quittance enregistré");
  };

  const handleReset = (field: keyof ReceiptTemplates) => {
    setTemplates((prev) => ({ ...prev, [field]: DEFAULT_TEMPLATES[field] }));
    setHasChanges(true);
  };

  const handleResetAll = () => {
    setTemplates(DEFAULT_TEMPLATES);
    setHasChanges(true);
    toast.info("Modèle réinitialisé aux valeurs par défaut");
  };

  const handleDownloadPreview = () => {
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = "apercu_quittance.pdf";
      link.click();
      toast.success("Aperçu téléchargé");
    }
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Modèle de quittance</CardTitle>
              <CardDescription>
                Personnalisez le texte et la mise en page de vos quittances de loyer
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleResetAll}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser tout
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="layout">Mise en page</TabsTrigger>
            <TabsTrigger value="watermark">Filigrane</TabsTrigger>
            <TabsTrigger value="preview">Aperçu texte</TabsTrigger>
            <TabsTrigger value="preview-pdf">Aperçu PDF</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6 mt-6">
            {/* Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Titre du document</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset("title")}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Réinitialiser
                </Button>
              </div>
              <Input
                id="title"
                value={templates.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="QUITTANCE DE LOYER"
              />
            </div>

            <Separator />

            {/* Declaration text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="declaration">Texte de déclaration</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset("declarationText")}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Réinitialiser
                </Button>
              </div>
              <Textarea
                id="declaration"
                value={templates.declarationText}
                onChange={(e) => handleChange("declarationText", e.target.value)}
                rows={4}
                placeholder="Texte de déclaration..."
              />
              {renderVariableHints("declarationText")}
            </div>

            <Separator />

            {/* Signature label */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="signature">Libellé de signature</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset("signatureLabel")}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Réinitialiser
                </Button>
              </div>
              <Input
                id="signature"
                value={templates.signatureLabel}
                onChange={(e) => handleChange("signatureLabel", e.target.value)}
                placeholder="Signature du bailleur/gestionnaire"
              />
              {renderVariableHints("signatureLabel")}
            </div>

            <Separator />

            {/* Footer text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="footer">Texte de pied de page</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset("footerText")}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Réinitialiser
                </Button>
              </div>
              <Input
                id="footer"
                value={templates.footerText}
                onChange={(e) => handleChange("footerText", e.target.value)}
                placeholder="Document généré par {agence}"
              />
              {renderVariableHints("footerText")}
            </div>

            <Separator />

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Select
                value={templates.currency}
                onValueChange={(value) => handleChange("currency", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une devise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="F CFA">F CFA (Franc CFA)</SelectItem>
                  <SelectItem value="€">€ (Euro)</SelectItem>
                  <SelectItem value="$">$ (Dollar)</SelectItem>
                  <SelectItem value="FCFA">FCFA</SelectItem>
                  <SelectItem value="XOF">XOF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-6 mt-6">
            {/* Toggle options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="showLogo">Afficher le logo</Label>
                  <p className="text-sm text-muted-foreground">
                    Le logo de l'agence sera affiché dans l'en-tête
                  </p>
                </div>
                <Switch
                  id="showLogo"
                  checked={templates.showLogo}
                  onCheckedChange={(checked) => handleChange("showLogo", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="showAgencyContact">
                    Afficher les coordonnées de l'agence
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Téléphone, email et adresse dans l'en-tête et le pied de page
                  </p>
                </div>
                <Switch
                  id="showAgencyContact"
                  checked={templates.showAgencyContact}
                  onCheckedChange={(checked) =>
                    handleChange("showAgencyContact", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="showOwnerSection">
                    Afficher la section bailleur
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Nom et informations du propriétaire du bien
                  </p>
                </div>
                <Switch
                  id="showOwnerSection"
                  checked={templates.showOwnerSection}
                  onCheckedChange={(checked) =>
                    handleChange("showOwnerSection", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="showAmountInWords">
                    Afficher le montant en lettres
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Le montant sera également écrit en toutes lettres
                  </p>
                </div>
                <Switch
                  id="showAmountInWords"
                  checked={templates.showAmountInWords}
                  onCheckedChange={(checked) =>
                    handleChange("showAmountInWords", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="showPaymentDetails">
                    Afficher les détails du paiement
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Date d'échéance, date de paiement et mode de paiement
                  </p>
                </div>
                <Switch
                  id="showPaymentDetails"
                  checked={templates.showPaymentDetails}
                  onCheckedChange={(checked) =>
                    handleChange("showPaymentDetails", checked)
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Date format */}
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Format de date</Label>
              <Select
                value={templates.dateFormat}
                onValueChange={(value) =>
                  handleChange("dateFormat", value as "short" | "long")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">
                    Long (15 janvier 2024)
                  </SelectItem>
                  <SelectItem value="short">Court (15/01/2024)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="watermark" className="space-y-6 mt-6">
            {/* Watermark enable toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Droplets className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="watermarkEnabled">Activer le filigrane</Label>
                  <p className="text-sm text-muted-foreground">
                    Ajouter un filigrane sur toutes les quittances générées
                  </p>
                </div>
              </div>
              <Switch
                id="watermarkEnabled"
                checked={templates.watermarkEnabled}
                onCheckedChange={(checked) => handleChange("watermarkEnabled", checked)}
              />
            </div>

            {templates.watermarkEnabled && (
              <>
                <Separator />

                {/* Watermark type */}
                <div className="space-y-3">
                  <Label>Type de filigrane</Label>
                  <RadioGroup
                    value={templates.watermarkType}
                    onValueChange={(value) => handleChange("watermarkType", value as "text" | "image")}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="text" id="watermark-text" />
                      <Label htmlFor="watermark-text" className="flex items-center gap-2 cursor-pointer">
                        <Type className="h-4 w-4" />
                        Texte
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="image" id="watermark-image" />
                      <Label htmlFor="watermark-image" className="flex items-center gap-2 cursor-pointer">
                        <ImageIcon className="h-4 w-4" />
                        Image
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                {/* Text watermark settings */}
                {templates.watermarkType === "text" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="watermarkText">Texte du filigrane</Label>
                      <Input
                        id="watermarkText"
                        value={templates.watermarkText}
                        onChange={(e) => handleChange("watermarkText", e.target.value)}
                        placeholder="ORIGINAL"
                      />
                      <p className="text-xs text-muted-foreground">
                        Suggestions : ORIGINAL, COPIE, PAYÉ, CONFIDENTIEL
                      </p>
                    </div>
                  </div>
                )}

                {/* Image watermark settings */}
                {templates.watermarkType === "image" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Image du filigrane</Label>
                      {templates.watermarkImageUrl ? (
                        <div className="flex items-center gap-4">
                          <img
                            src={templates.watermarkImageUrl}
                            alt="Watermark preview"
                            className="h-16 w-auto object-contain bg-muted rounded p-2"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChange("watermarkImageUrl", null)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                          <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Aucune image sélectionnée
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Uploadez votre logo dans les paramètres d'agence pour l'utiliser comme filigrane
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Opacity slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Opacité</Label>
                    <span className="text-sm text-muted-foreground">
                      {templates.watermarkOpacity}%
                    </span>
                  </div>
                  <Slider
                    value={[templates.watermarkOpacity]}
                    onValueChange={(value) => handleChange("watermarkOpacity", value[0])}
                    min={5}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Une opacité plus faible rend le filigrane plus discret
                  </p>
                </div>

                <Separator />

                {/* Position */}
                <div className="space-y-3">
                  <Label>Position du filigrane</Label>
                  <RadioGroup
                    value={templates.watermarkPosition}
                    onValueChange={(value) => handleChange("watermarkPosition", value as "center" | "diagonal" | "bottom-right")}
                    className="grid grid-cols-3 gap-4"
                  >
                    <div className="flex flex-col items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="center" id="pos-center" className="sr-only" />
                      <Label htmlFor="pos-center" className="cursor-pointer text-center">
                        <div className={`w-16 h-20 border-2 rounded flex items-center justify-center mb-2 ${templates.watermarkPosition === "center" ? "border-primary bg-primary/10" : "border-muted"}`}>
                          <span className="text-xs text-muted-foreground">ABC</span>
                        </div>
                        Centre
                      </Label>
                    </div>
                    <div className="flex flex-col items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="diagonal" id="pos-diagonal" className="sr-only" />
                      <Label htmlFor="pos-diagonal" className="cursor-pointer text-center">
                        <div className={`w-16 h-20 border-2 rounded flex items-center justify-center mb-2 ${templates.watermarkPosition === "diagonal" ? "border-primary bg-primary/10" : "border-muted"}`}>
                          <span className="text-xs text-muted-foreground rotate-[-45deg]">ABC</span>
                        </div>
                        Diagonale
                      </Label>
                    </div>
                    <div className="flex flex-col items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="bottom-right" id="pos-bottom-right" className="sr-only" />
                      <Label htmlFor="pos-bottom-right" className="cursor-pointer text-center">
                        <div className={`w-16 h-20 border-2 rounded flex items-end justify-end p-1 mb-2 ${templates.watermarkPosition === "bottom-right" ? "border-primary bg-primary/10" : "border-muted"}`}>
                          <span className="text-xs text-muted-foreground">ABC</span>
                        </div>
                        Bas-droite
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Aperçu du texte</span>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>

              <ScrollArea className="h-[400px] rounded-lg border bg-background p-6">
                {/* Preview Header */}
                <div className="bg-primary text-primary-foreground p-4 rounded-t-lg -mt-6 -mx-6 mb-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {templates.showLogo && (
                        <div className="w-12 h-12 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold">{SAMPLE_DATA.agence}</p>
                        {templates.showAgencyContact && (
                          <p className="text-xs opacity-80">
                            {SAMPLE_DATA.telephone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{templates.title}</p>
                      <p className="text-xs opacity-80">N° ABC12345</p>
                    </div>
                  </div>
                </div>

                {/* Period */}
                <div className="bg-muted p-3 rounded-lg text-center mb-4">
                  <span className="font-medium">
                    Période : {SAMPLE_DATA.periode}
                  </span>
                </div>

                {/* Owner/Tenant columns */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {templates.showOwnerSection && (
                    <div>
                      <p className="text-xs font-bold text-primary">BAILLEUR</p>
                      <p className="text-sm">{SAMPLE_DATA.bailleur}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-primary">LOCATAIRE</p>
                    <p className="text-sm">{SAMPLE_DATA.locataire}</p>
                  </div>
                </div>

                {/* Property */}
                <div className="mb-4">
                  <p className="text-xs font-bold text-primary">BIEN LOUÉ</p>
                  <p className="text-sm">{SAMPLE_DATA.bien}</p>
                </div>

                {/* Amount */}
                <div className="bg-primary text-primary-foreground p-4 rounded-lg text-center mb-4">
                  <p className="text-sm">Montant du loyer reçu</p>
                  <p className="text-xl font-bold">
                    250 000 {templates.currency}
                  </p>
                </div>

                {/* Amount in words */}
                {templates.showAmountInWords && (
                  <p className="text-xs italic text-muted-foreground mb-4">
                    Soit : deux cent cinquante mille francs CFA
                  </p>
                )}

                {/* Payment details */}
                {templates.showPaymentDetails && (
                  <div className="bg-muted/50 rounded-lg p-3 mb-4">
                    <p className="text-xs font-bold mb-2">
                      DÉTAILS DU PAIEMENT
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Date d'échéance</span>
                        <span>
                          {templates.dateFormat === "long"
                            ? "1 janvier 2024"
                            : "01/01/2024"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date de paiement</span>
                        <span>
                          {templates.dateFormat === "long"
                            ? "5 janvier 2024"
                            : "05/01/2024"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mode de paiement</span>
                        <span>Virement</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Declaration */}
                <p className="text-sm mb-4">
                  {replaceVariablesForPreview(templates.declarationText)}
                </p>

                {/* Date and signature */}
                <div className="text-right">
                  <p className="text-sm">
                    Fait le{" "}
                    {templates.dateFormat === "long"
                      ? "23 janvier 2026"
                      : "23/01/2026"}
                  </p>
                  <p className="text-sm italic mt-2">
                    {replaceVariablesForPreview(templates.signatureLabel)}
                  </p>
                </div>

                {/* Footer */}
                <div className="bg-muted/50 text-center p-3 mt-6 -mx-6 -mb-6 rounded-b-lg">
                  <p className="text-xs text-muted-foreground">
                    {replaceVariablesForPreview(templates.footerText)}
                  </p>
                  {templates.showAgencyContact && (
                    <p className="text-xs text-muted-foreground">
                      {SAMPLE_DATA.telephone} | {SAMPLE_DATA.email}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="preview-pdf" className="mt-6">
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Aperçu PDF en temps réel</span>
                </div>
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
                      <RotateCcw className="h-4 w-4 mr-2" />
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

              <div className="rounded-lg border bg-background overflow-hidden" style={{ height: "600px" }}>
                {isGeneratingPdf ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                      <p className="text-sm text-muted-foreground">Génération du PDF...</p>
                    </div>
                  </div>
                ) : pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full"
                    title="Aperçu de la quittance"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        Cliquez sur "Actualiser" pour générer l'aperçu
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-3 text-center">
                L'aperçu utilise des données fictives. Les vraies quittances utiliseront les informations de votre agence et de vos locataires.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
