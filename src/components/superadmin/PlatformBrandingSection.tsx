import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImagePlus, Trash2, Type, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlatformBrandingSectionProps {
  logoUrl: string;
  appName: string;
  onLogoChange: (url: string) => void;
  onAppNameChange: (name: string) => void;
  onChanged: () => void;
}

export function PlatformBrandingSection({
  logoUrl,
  appName,
  onLogoChange,
  onAppNameChange,
  onChanged,
}: PlatformBrandingSectionProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner un fichier image");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `platform-logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("agency-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("agency-logos")
        .getPublicUrl(fileName);

      onLogoChange(urlData.publicUrl);
      onChanged();
      toast.success("Logo uploadé avec succès");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    onLogoChange("");
    onChanged();
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <Label className="flex items-center gap-2 text-base font-semibold">
        <ImagePlus className="h-5 w-5 text-primary" />
        Branding de l'application
      </Label>

      {/* App Name */}
      <div className="space-y-2">
        <Label htmlFor="app-name" className="flex items-center gap-2">
          <Type className="h-4 w-4 text-primary" />
          Nom de l'application
        </Label>
        <Input
          id="app-name"
          placeholder="ImmoPrestige"
          value={appName}
          onChange={(e) => { onAppNameChange(e.target.value); onChanged(); }}
        />
        <p className="text-xs text-muted-foreground">
          Ce nom sera affiché dans la barre latérale, l'écran de connexion, et les pages publiques
        </p>
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-primary" />
          Logo de l'application
        </Label>

        <div className="flex items-center gap-4">
          {logoUrl ? (
            <div className="relative group">
              <img
                src={logoUrl}
                alt="Logo de l'application"
                className="h-16 w-16 object-contain rounded-lg border bg-background p-1"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleRemoveLogo}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="h-16 w-16 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ImagePlus className="h-4 w-4 mr-2" />
              )}
              {logoUrl ? "Changer le logo" : "Uploader un logo"}
            </Button>
            <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Max 2 Mo.</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Ce logo remplacera le logo par défaut dans la barre latérale, l'écran de chargement, les pages de connexion et d'inscription
        </p>
      </div>
    </div>
  );
}
