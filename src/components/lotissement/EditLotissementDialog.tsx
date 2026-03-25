import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, Upload, X, Stamp } from "lucide-react";
import { useUpdateLotissement, Lotissement } from "@/hooks/useLotissements";
import { useAttestationTemplates } from "@/hooks/useAttestationTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditLotissementDialogProps {
  lotissement: Lotissement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLotissementDialog({ lotissement, open, onOpenChange }: EditLotissementDialogProps) {
  const updateLotissement = useUpdateLotissement();
  const { data: attestationTemplates = [] } = useAttestationTemplates();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    city: "",
    total_area: "",
    description: "",
    attestation_template_id: "" as string,
    chef_village_name: "",
    chef_village_titre: "",
    chef_stamp_url: null as string | null,
  });

  useEffect(() => {
    if (lotissement) {
      setFormData({
        name: lotissement.name,
        location: lotissement.location,
        city: lotissement.city || "Abidjan",
        total_area: lotissement.total_area?.toString() || "",
        description: lotissement.description || "",
        attestation_template_id: (lotissement as any).attestation_template_id || "",
        chef_village_name: lotissement.chef_village_name || "",
        chef_village_titre: lotissement.chef_village_titre || "",
        chef_stamp_url: lotissement.chef_stamp_url || null,
        chef_signature_url: lotissement.chef_signature_url || null,
      });
    }
  }, [lotissement]);

  const handleUploadImage = async (file: File, type: "stamp" | "signature") => {
    if (!user?.id) {
      toast.error("Vous devez être connecté");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image valide");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${user.id}/chef-${type}/${Date.now()}_${type}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("agency-logos")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("agency-logos")
        .getPublicUrl(uploadData.path);
      const field = type === "stamp" ? "chef_stamp_url" : "chef_signature_url";
      setFormData((prev) => ({ ...prev, [field]: urlData.publicUrl }));
      toast.success("Image importée");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Erreur lors de l'importation");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.location.trim()) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    try {
      await updateLotissement.mutateAsync({
        id: lotissement.id,
        name: formData.name.trim(),
        location: formData.location.trim(),
        city: formData.city.trim() || "Abidjan",
        total_area: formData.total_area ? parseFloat(formData.total_area) : null,
        description: formData.description.trim() || null,
        attestation_template_id: formData.attestation_template_id || null,
        chef_village_name: formData.chef_village_name.trim() || null,
        chef_village_titre: formData.chef_village_titre.trim() || null,
        chef_stamp_url: formData.chef_stamp_url || null,
        chef_signature_url: formData.chef_signature_url || null,
      } as any);

      toast.success("Lotissement modifié avec succès");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  const renderImageUpload = (
    label: string,
    url: string | null,
    type: "stamp" | "signature"
  ) => {
    const field = type === "stamp" ? "chef_stamp_url" : "chef_signature_url";
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs">
          <Stamp className="h-3.5 w-3.5" />
          {label}
        </Label>
        {url ? (
          <div className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30">
            <img
              src={url}
              alt={label}
              className="h-14 w-auto object-contain bg-background rounded border p-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormData((prev) => ({ ...prev, [field]: null }))}
            >
              <X className="h-3 w-3 mr-1" />
              Supprimer
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-3 text-center">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.currentTarget.value = "";
                  if (file) handleUploadImage(file, type);
                }}
              />
              <Button type="button" variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer
                </span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground mt-1">PNG/JPEG, max 2 Mo</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le lotissement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du lotissement *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: Résidence Les Palmiers"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Localisation *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="ex: Cocody Angré"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Abidjan"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_area">Superficie totale (m²)</Label>
            <Input
              id="total_area"
              type="number"
              min="0"
              value={formData.total_area}
              onChange={(e) => setFormData({ ...formData, total_area: e.target.value })}
              placeholder="ex: 50000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description du projet de lotissement..."
              rows={3}
            />
          </div>

          <Separator className="my-2" />

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Chef du Village</Label>
            <p className="text-xs text-muted-foreground">
              Ces informations seront utilisées automatiquement lors de la génération des attestations
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="chef_village_name" className="text-xs">Nom du Chef du Village</Label>
                <Input
                  id="chef_village_name"
                  value={formData.chef_village_name}
                  onChange={(e) => setFormData({ ...formData, chef_village_name: e.target.value })}
                  placeholder="Ex: AKRE AMOUSSO SIMEON"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="chef_village_titre" className="text-xs">Titre / Arrêté de nomination</Label>
                <Input
                  id="chef_village_titre"
                  value={formData.chef_village_titre}
                  onChange={(e) => setFormData({ ...formData, chef_village_titre: e.target.value })}
                  placeholder="Ex: nommé par arrêté N°1953/AT/DGAT..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {renderImageUpload("Cachet du Chef", formData.chef_stamp_url, "stamp")}
              {renderImageUpload("Signature du Chef", formData.chef_signature_url, "signature")}
            </div>
          </div>

          <Separator className="my-2" />

          {attestationTemplates.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Modèle d'attestation villageoise
              </Label>
              <Select
                value={formData.attestation_template_id || "none"}
                onValueChange={(v) => setFormData({ ...formData, attestation_template_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un modèle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun modèle</SelectItem>
                  {attestationTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.is_default ? "⭐" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ce modèle sera utilisé pour générer les attestations d'attribution de ce lotissement
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateLotissement.isPending}>
              {updateLotissement.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
