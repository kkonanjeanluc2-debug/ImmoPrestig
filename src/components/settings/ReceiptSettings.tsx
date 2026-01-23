import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, RotateCcw, Save, Eye, Info } from "lucide-react";
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

  useEffect(() => {
    setTemplates(getReceiptTemplates());
  }, []);

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
    toast.info("Valeur réinitialisée");
  };

  const handleResetAll = () => {
    setTemplates(DEFAULT_TEMPLATES);
    setHasChanges(true);
    toast.info("Modèle réinitialisé aux valeurs par défaut");
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="layout">Mise en page</TabsTrigger>
            <TabsTrigger value="preview">Aperçu</TabsTrigger>
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
        </Tabs>
      </CardContent>
    </Card>
  );
}
