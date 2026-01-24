import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Share2, Save, Loader2, RotateCcw, Info } from "lucide-react";

const DEFAULT_TEMPLATE = `🏠 *{transactionType} - {propertyType}*

📍 *{title}*
{address}

💰 Prix: {price}
{features}
{description}
📞 Contactez-nous pour plus d'informations !`;

const AVAILABLE_VARIABLES = [
  { key: "{transactionType}", label: "Type (À louer/À vendre)" },
  { key: "{propertyType}", label: "Type de bien" },
  { key: "{title}", label: "Titre du bien" },
  { key: "{address}", label: "Adresse" },
  { key: "{price}", label: "Prix formaté" },
  { key: "{features}", label: "Caractéristiques" },
  { key: "{description}", label: "Description" },
  { key: "{agencyName}", label: "Nom de l'agence" },
  { key: "{agencyPhone}", label: "Téléphone agence" },
];

export function WhatsAppShareSettings() {
  const { user } = useAuth();
  const { data: agency, isLoading } = useAgency();
  const queryClient = useQueryClient();
  
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (agency?.whatsapp_property_template) {
      setTemplate(agency.whatsapp_property_template);
    }
  }, [agency]);

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    setHasChanges(true);
  };

  const handleReset = () => {
    setTemplate(DEFAULT_TEMPLATE);
    setHasChanges(true);
  };

  const insertVariable = (variable: string) => {
    setTemplate(prev => prev + variable);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user?.id || !agency) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('agencies')
        .update({ whatsapp_property_template: template })
        .eq('user_id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["agency"] });
      setHasChanges(false);
      toast.success("Modèle WhatsApp enregistré");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  // Preview with sample data
  const getPreview = () => {
    return template
      .replace("{transactionType}", "À louer")
      .replace("{propertyType}", "Appartement")
      .replace("{title}", "Bel appartement F3")
      .replace("{address}", "Cocody Riviera, Abidjan")
      .replace("{price}", "150 000 F CFA/mois")
      .replace("{features}", "📐 85 m² | 🛏️ 2 chambres | 🚿 1 salle de bain")
      .replace("{description}", "")
      .replace("{agencyName}", agency?.name || "Mon Agence")
      .replace("{agencyPhone}", agency?.phone || "+225 07 00 00 00 00");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!agency) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Veuillez d'abord créer votre profil d'agence.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Partage WhatsApp
        </CardTitle>
        <CardDescription>
          Personnalisez le message utilisé lors du partage de biens via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Variables disponibles */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Variables disponibles
          </Label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_VARIABLES.map((v) => (
              <Badge
                key={v.key}
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => insertVariable(v.key)}
              >
                {v.key}
                <span className="ml-1 text-xs opacity-70">({v.label})</span>
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Cliquez sur une variable pour l'ajouter au modèle
          </p>
        </div>

        {/* Template Editor */}
        <div className="space-y-2">
          <Label htmlFor="whatsapp-template">Modèle de message</Label>
          <Textarea
            id="whatsapp-template"
            value={template}
            onChange={(e) => handleTemplateChange(e.target.value)}
            placeholder="Entrez votre modèle de message..."
            className="min-h-[200px] font-mono text-sm"
          />
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label>Aperçu</Label>
          <div className="p-4 rounded-lg bg-muted/50 border whitespace-pre-wrap text-sm">
            {getPreview()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}