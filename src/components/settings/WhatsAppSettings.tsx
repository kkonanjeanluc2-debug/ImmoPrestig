import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageCircle, RotateCcw, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface WhatsAppTemplates {
  receipt: string;
  reminder: string;
  lateReminder: string;
  document: string;
  signature: string;
}

const DEFAULT_TEMPLATES: WhatsAppTemplates = {
  receipt: `📄 *QUITTANCE DE LOYER*

Bonjour {tenantName},

Votre quittance de loyer est disponible :

🏠 *Bien :* {propertyTitle}
📅 *Période :* {period}
💰 *Montant :* {amount} F CFA
✅ *Payé le :* {paidDate}

Merci pour votre paiement.`,
  reminder: `📋 *RAPPEL - ÉCHÉANCE DE LOYER*

Bonjour {tenantName},

Ceci est un rappel pour votre prochain paiement de loyer :

🏠 *Bien :* {propertyTitle}
📅 *Échéance :* {dueDate}
💰 *Montant :* {amount} F CFA

Merci de prévoir le règlement avant cette date.`,
  lateReminder: `⚠️ *RAPPEL URGENT - LOYER EN RETARD*

Bonjour {tenantName},

Nous vous rappelons que votre loyer est en retard :

🏠 *Bien :* {propertyTitle}
📅 *Échéance :* {dueDate}
💰 *Montant dû :* {amount} F CFA

Merci de régulariser votre situation dans les plus brefs délais.`,
  document: `📎 *DOCUMENT PARTAGÉ*

Bonjour {tenantName},

Veuillez trouver ci-dessous le document suivant :

📄 *Document :* {documentName}

🔗 *Lien :* {documentUrl}`,
  signature: `Cordialement,
L'équipe de gestion immobilière`,
};

const STORAGE_KEY = "whatsappTemplates";

export function getWhatsAppTemplates(): WhatsAppTemplates {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_TEMPLATES, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Error loading WhatsApp templates:", e);
  }
  return DEFAULT_TEMPLATES;
}

export function saveWhatsAppTemplates(templates: WhatsAppTemplates): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

const VARIABLE_HINTS: Record<keyof Omit<WhatsAppTemplates, 'signature'>, string[]> = {
  receipt: ["{tenantName}", "{propertyTitle}", "{period}", "{amount}", "{paidDate}"],
  reminder: ["{tenantName}", "{propertyTitle}", "{dueDate}", "{amount}"],
  lateReminder: ["{tenantName}", "{propertyTitle}", "{dueDate}", "{amount}"],
  document: ["{tenantName}", "{documentName}", "{documentUrl}"],
};

export function WhatsAppSettings() {
  const [templates, setTemplates] = useState<WhatsAppTemplates>(DEFAULT_TEMPLATES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTemplates(getWhatsAppTemplates());
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      saveWhatsAppTemplates(templates);
      toast.success("Modèles WhatsApp enregistrés");
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = (templateKey: keyof WhatsAppTemplates) => {
    setTemplates(prev => ({
      ...prev,
      [templateKey]: DEFAULT_TEMPLATES[templateKey],
    }));
    toast.info("Modèle réinitialisé");
  };

  const handleResetAll = () => {
    setTemplates(DEFAULT_TEMPLATES);
    toast.info("Tous les modèles ont été réinitialisés");
  };

  const updateTemplate = (key: keyof WhatsAppTemplates, value: string) => {
    setTemplates(prev => ({ ...prev, [key]: value }));
  };

  const renderVariableHints = (templateKey: keyof Omit<WhatsAppTemplates, 'signature'>) => (
    <div className="flex flex-wrap gap-1 mt-2">
      <span className="text-xs text-muted-foreground">Variables :</span>
      {VARIABLE_HINTS[templateKey].map(variable => (
        <code key={variable} className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {variable}
        </code>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          Messages WhatsApp
        </CardTitle>
        <CardDescription>
          Personnalisez les modèles de messages envoyés via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="receipt" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-1">
            <TabsTrigger value="receipt" className="text-xs">Quittance</TabsTrigger>
            <TabsTrigger value="reminder" className="text-xs">Rappel</TabsTrigger>
            <TabsTrigger value="lateReminder" className="text-xs">Retard</TabsTrigger>
            <TabsTrigger value="document" className="text-xs">Document</TabsTrigger>
            <TabsTrigger value="signature" className="text-xs">Signature</TabsTrigger>
          </TabsList>

          <TabsContent value="receipt" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message pour les quittances de loyer</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset("receipt")}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Réinitialiser
                </Button>
              </div>
              <Textarea
                value={templates.receipt}
                onChange={(e) => updateTemplate("receipt", e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              {renderVariableHints("receipt")}
            </div>
          </TabsContent>

          <TabsContent value="reminder" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message de rappel avant échéance</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset("reminder")}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Réinitialiser
                </Button>
              </div>
              <Textarea
                value={templates.reminder}
                onChange={(e) => updateTemplate("reminder", e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              {renderVariableHints("reminder")}
            </div>
          </TabsContent>

          <TabsContent value="lateReminder" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message de rappel pour loyer en retard</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset("lateReminder")}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Réinitialiser
                </Button>
              </div>
              <Textarea
                value={templates.lateReminder}
                onChange={(e) => updateTemplate("lateReminder", e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              {renderVariableHints("lateReminder")}
            </div>
          </TabsContent>

          <TabsContent value="document" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message pour partage de document</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset("document")}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Réinitialiser
                </Button>
              </div>
              <Textarea
                value={templates.document}
                onChange={(e) => updateTemplate("document", e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              {renderVariableHints("document")}
            </div>
          </TabsContent>

          <TabsContent value="signature" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Signature (ajoutée à tous les messages)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset("signature")}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Réinitialiser
                </Button>
              </div>
              <Textarea
                value={templates.signature}
                onChange={(e) => updateTemplate("signature", e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleResetAll}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Tout réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
