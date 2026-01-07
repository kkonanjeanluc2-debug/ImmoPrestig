import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Home, Building, MapPin, Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AddPropertyDialogProps {
  onPropertyAdd?: (property: PropertyFormData) => void;
}

export interface PropertyFormData {
  title: string;
  address: string;
  price: number;
  type: "location" | "vente";
  propertyType: "maison" | "appartement" | "terrain";
  bedrooms?: number;
  bathrooms?: number;
  area: number;
  description?: string;
  image?: string;
}

export const AddPropertyDialog = ({ onPropertyAdd }: AddPropertyDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<PropertyFormData>>({
    type: "location",
    propertyType: "appartement",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image valide");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setIsUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `properties/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image: urlData.publicUrl });
      setImagePreview(urlData.publicUrl);
      toast.success("Image importée avec succès !");
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'import de l'image");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData({ ...formData, image: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.address || !formData.price || !formData.area) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const newProperty: PropertyFormData = {
      title: formData.title,
      address: formData.address,
      price: formData.price,
      type: formData.type || "location",
      propertyType: formData.propertyType || "appartement",
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      area: formData.area,
      description: formData.description,
      image: formData.image || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    };

    onPropertyAdd?.(newProperty);
    toast.success("Bien ajouté avec succès !");
    setFormData({ type: "location", propertyType: "appartement" });
    setImagePreview(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald hover:bg-emerald-dark text-primary-foreground gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un bien
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Ajouter un nouveau bien</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Type de transaction */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type de transaction *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "location" | "vente") => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="vente">Vente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyType">Type de bien *</Label>
              <Select
                value={formData.propertyType}
                onValueChange={(value: "maison" | "appartement" | "terrain") => 
                  setFormData({ ...formData, propertyType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appartement">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Appartement
                    </div>
                  </SelectItem>
                  <SelectItem value="maison">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Maison
                    </div>
                  </SelectItem>
                  <SelectItem value="terrain">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Terrain
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Titre et Adresse */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre du bien *</Label>
            <Input
              id="title"
              placeholder="Ex: Villa Belle Époque"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              placeholder="Ex: 16 Avenue Foch, Paris 16ème"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* Prix et Surface */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">
                {formData.type === "location" ? "Loyer mensuel (F CFA) *" : "Prix de vente (F CFA) *"}
              </Label>
              <Input
                id="price"
                type="number"
                placeholder="Ex: 150000"
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Surface (m²) *</Label>
              <Input
                id="area"
                type="number"
                placeholder="Ex: 120"
                value={formData.area || ""}
                onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Chambres et Salles de bain (sauf terrain) */}
          {formData.propertyType !== "terrain" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Chambres</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  placeholder="Ex: 3"
                  value={formData.bedrooms || ""}
                  onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Salles de bain</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  placeholder="Ex: 2"
                  value={formData.bathrooms || ""}
                  onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Photo du bien</Label>
            <div className="space-y-3">
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img 
                    src={imagePreview} 
                    alt="Aperçu" 
                    className="w-full h-48 object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-emerald/50 hover:bg-emerald/5 transition-colors"
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-10 w-10 text-emerald animate-spin" />
                      <p className="text-sm text-muted-foreground">Import en cours...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 rounded-full bg-emerald/10">
                        <ImageIcon className="h-8 w-8 text-emerald" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Cliquez pour importer une image</p>
                        <p className="text-sm text-muted-foreground">ou glissez-déposez</p>
                      </div>
                      <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (max 5 Mo)</p>
                    </div>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Décrivez le bien..."
              rows={3}
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-emerald hover:bg-emerald-dark" disabled={isUploading}>
              Ajouter le bien
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
