import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Palette, Save, Loader2, RotateCcw } from "lucide-react";

const DEFAULT_COLORS = {
  primary: "#1e3a5f",
  accent: "#2ecc71",
  sidebar: "#1e3a5f",
};

const PRESET_THEMES = [
  { name: "Classique", primary: "#1e3a5f", accent: "#2ecc71", sidebar: "#1e3a5f" },
  { name: "Océan", primary: "#0369a1", accent: "#06b6d4", sidebar: "#0c4a6e" },
  { name: "Forêt", primary: "#166534", accent: "#84cc16", sidebar: "#14532d" },
  { name: "Bordeaux", primary: "#7f1d1d", accent: "#f59e0b", sidebar: "#450a0a" },
  { name: "Violet", primary: "#5b21b6", accent: "#a855f7", sidebar: "#3b0764" },
  { name: "Ardoise", primary: "#334155", accent: "#64748b", sidebar: "#1e293b" },
];

export function BrandingSettings() {
  const { user } = useAuth();
  const { data: agency, isLoading } = useAgency();
  const queryClient = useQueryClient();

  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLORS.primary);
  const [accentColor, setAccentColor] = useState(DEFAULT_COLORS.accent);
  const [sidebarColor, setSidebarColor] = useState(DEFAULT_COLORS.sidebar);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (agency) {
      setPrimaryColor(agency.primary_color || DEFAULT_COLORS.primary);
      setAccentColor(agency.accent_color || DEFAULT_COLORS.accent);
      setSidebarColor(agency.sidebar_color || DEFAULT_COLORS.sidebar);
    }
  }, [agency]);

  const handleColorChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setHasChanges(true);
  };

  const applyPreset = (preset: typeof PRESET_THEMES[0]) => {
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
    setSidebarColor(preset.sidebar);
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    setPrimaryColor(DEFAULT_COLORS.primary);
    setAccentColor(DEFAULT_COLORS.accent);
    setSidebarColor(DEFAULT_COLORS.sidebar);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user?.id || !agency) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('agencies')
        .update({
          primary_color: primaryColor,
          accent_color: accentColor,
          sidebar_color: sidebarColor,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Apply colors immediately
      applyBrandColors(primaryColor, accentColor, sidebarColor);

      queryClient.invalidateQueries({ queryKey: ["agency"] });
      setHasChanges(false);
      toast.success("Couleurs enregistrées avec succès");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
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
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Veuillez d'abord créer votre profil d'agence dans l'onglet "Agence".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Personnalisation des couleurs
        </CardTitle>
        <CardDescription>
          Adaptez l'interface aux couleurs de votre charte graphique
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Themes */}
        <div className="space-y-3">
          <Label>Thèmes prédéfinis</Label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESET_THEMES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg border hover:border-primary transition-colors"
              >
                <div className="flex gap-0.5">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: preset.accent }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Couleur principale</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded-lg border cursor-pointer"
                style={{ backgroundColor: primaryColor }}
                onClick={() => document.getElementById('primary-color')?.click()}
              />
              <Input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => handleColorChange(setPrimaryColor, e.target.value)}
                className="w-full h-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">Boutons, liens, accents</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accent-color">Couleur d'accent</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded-lg border cursor-pointer"
                style={{ backgroundColor: accentColor }}
                onClick={() => document.getElementById('accent-color')?.click()}
              />
              <Input
                id="accent-color"
                type="color"
                value={accentColor}
                onChange={(e) => handleColorChange(setAccentColor, e.target.value)}
                className="w-full h-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">Badges, indicateurs</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sidebar-color">Couleur de la sidebar</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded-lg border cursor-pointer"
                style={{ backgroundColor: sidebarColor }}
                onClick={() => document.getElementById('sidebar-color')?.click()}
              />
              <Input
                id="sidebar-color"
                type="color"
                value={sidebarColor}
                onChange={(e) => handleColorChange(setSidebarColor, e.target.value)}
                className="w-full h-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">Menu latéral</p>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <Label>Aperçu</Label>
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            {/* Sidebar preview */}
            <div
              className="w-16 h-32 rounded-lg flex flex-col items-center justify-center gap-2"
              style={{ backgroundColor: sidebarColor }}
            >
              <div className="w-8 h-8 rounded-full bg-white/20" />
              <div className="w-10 h-1.5 rounded bg-white/30" />
              <div className="w-10 h-1.5 rounded bg-white/20" />
              <div className="w-10 h-1.5 rounded bg-white/20" />
            </div>
            
            {/* Content preview */}
            <div className="flex-1 space-y-3">
              <div className="flex gap-2">
                <div
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: primaryColor }}
                >
                  Bouton principal
                </div>
                <div
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: accentColor }}
                >
                  Accent
                </div>
              </div>
              <div className="flex gap-2">
                <div
                  className="px-2 py-0.5 rounded text-xs text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Badge
                </div>
                <span 
                  className="text-sm font-medium"
                  style={{ color: primaryColor }}
                >
                  Lien de navigation
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={resetToDefaults}
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

// Helper function to apply brand colors to CSS variables
export function applyBrandColors(primary: string, accent: string, sidebar: string) {
  const root = document.documentElement;
  
  // Convert hex to HSL for CSS variables
  const hexToHSL = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  // Apply primary color
  root.style.setProperty('--primary', hexToHSL(primary));
  root.style.setProperty('--navy', hexToHSL(primary));
  
  // Apply accent color  
  root.style.setProperty('--emerald', hexToHSL(accent));
  
  // Apply sidebar color
  root.style.setProperty('--sidebar-background', hexToHSL(sidebar));
  root.style.setProperty('--navy-dark', hexToHSL(sidebar));
}
