import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Save, Loader2, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const DEFAULT_PRIMARY = "#1A365D";
const DEFAULT_SECONDARY = "#F5F5F5";
const DEFAULT_TEXT = "#FFFFFF";

export function PDFDocumentSettings() {
  const { user } = useAuth();
  const { data: agency, isLoading } = useAgency();
  const queryClient = useQueryClient();

  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [textColor, setTextColor] = useState(DEFAULT_TEXT);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (agency) {
      setPrimaryColor((agency as any).pdf_primary_color || DEFAULT_PRIMARY);
      setSecondaryColor((agency as any).pdf_secondary_color || DEFAULT_SECONDARY);
      setTextColor((agency as any).pdf_text_color || DEFAULT_TEXT);
    }
  }, [agency]);

  const handleSave = async () => {
    if (!user?.id || !agency) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("agencies")
        .update({
          pdf_primary_color: primaryColor,
          pdf_secondary_color: secondaryColor,
          pdf_text_color: textColor,
        } as any)
        .eq("id", agency.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["agency"] });
      setHasChanges(false);
      toast.success("Paramètres des documents enregistrés");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPrimaryColor(DEFAULT_PRIMARY);
    setSecondaryColor(DEFAULT_SECONDARY);
    setTextColor(DEFAULT_TEXT);
    setHasChanges(true);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Personnalisation des documents PDF
        </CardTitle>
        <CardDescription>
          Configurez les couleurs de l'en-tête et du pied de page de tous vos documents générés (quittances, contrats, rapports, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Aperçu de l'en-tête</Label>
          <div
            className="rounded-lg overflow-hidden shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                {agency?.logo_url && (
                  <img
                    src={agency.logo_url}
                    alt="Logo"
                    className="h-10 w-10 rounded object-cover bg-white"
                  />
                )}
                <div style={{ color: textColor }}>
                  <p className="font-bold text-sm">{agency?.name || "Nom de l'agence"}</p>
                  <p className="text-xs opacity-80">{agency?.phone ? `Tél: ${agency.phone}` : ""}</p>
                  <p className="text-xs opacity-80">{agency?.email || ""}</p>
                </div>
              </div>
              <div style={{ color: textColor }} className="text-right">
                <p className="font-bold text-base">TITRE DU DOCUMENT</p>
                <p className="text-xs opacity-80">Sous-titre</p>
              </div>
            </div>
          </div>
          {/* Footer preview */}
          <div
            className="rounded-lg px-6 py-2 text-center text-xs"
            style={{ backgroundColor: secondaryColor, color: "#808080" }}
          >
            {agency?.name || "Agence"} - Document généré le {new Date().toLocaleDateString("fr-FR")}
          </div>
        </div>

        {/* Color pickers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pdf-primary-color">Couleur principale (en-tête)</Label>
            <div className="flex items-center gap-3">
              <input
                id="pdf-primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => { setPrimaryColor(e.target.value); setHasChanges(true); }}
                className="h-10 w-14 rounded border cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => { setPrimaryColor(e.target.value); setHasChanges(true); }}
                placeholder="#1A365D"
                className="flex-1 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">Fond du bandeau d'en-tête</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdf-text-color">Couleur du texte (en-tête)</Label>
            <div className="flex items-center gap-3">
              <input
                id="pdf-text-color"
                type="color"
                value={textColor}
                onChange={(e) => { setTextColor(e.target.value); setHasChanges(true); }}
                className="h-10 w-14 rounded border cursor-pointer"
              />
              <Input
                value={textColor}
                onChange={(e) => { setTextColor(e.target.value); setHasChanges(true); }}
                placeholder="#FFFFFF"
                className="flex-1 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">Texte sur le bandeau d'en-tête</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdf-secondary-color">Couleur pied de page</Label>
            <div className="flex items-center gap-3">
              <input
                id="pdf-secondary-color"
                type="color"
                value={secondaryColor}
                onChange={(e) => { setSecondaryColor(e.target.value); setHasChanges(true); }}
                className="h-10 w-14 rounded border cursor-pointer"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => { setSecondaryColor(e.target.value); setHasChanges(true); }}
                placeholder="#F5F5F5"
                className="flex-1 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">Fond du pied de page</p>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
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
