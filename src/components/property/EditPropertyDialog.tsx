import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Home, Building, MapPin, X, ImageIcon, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateProperty, Property } from "@/hooks/useProperties";
import { useOwners } from "@/hooks/useOwners";

interface EditPropertyDialogProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditPropertyDialog = ({ property, open, onOpenChange }: EditPropertyDialogProps) => {
  const [formData, setFormData] = useState({
    title: "",
    address: "",
    price: "",
    type: "location",
    property_type: "appartement",
    bedrooms: "",
    bathrooms: "",
    area: "",
    description: "",
    image_url: "",
    status: "disponible",
    owner_id: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateProperty = useUpdateProperty();
  const { data: owners = [] } = useOwners();

  useEffect(() => {
    if (property && open) {
      setFormData({
        title: property.title || "",
        address: property.address || "",
        price: property.price?.toString() || "",
        type: property.type || "location",
        property_type: property.property_type || "appartement",
        bedrooms: property.bedrooms?.toString() || "",
        bathrooms: property.bathrooms?.toString() || "",
        area: property.area?.toString() || "",
        description: property.description || "",
        image_url: property.image_url || "",
        status: property.status || "disponible",
        owner_id: property.owner_id || "",
      });
      setImagePreview(property.image_url || null);
    }
  }, [property, open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image valide");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `properties/${fileName}`;

      const { error } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: urlData.publicUrl });
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
    setFormData({ ...formData, image_url: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.address || !formData.price || !formData.area) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      await updateProperty.mutateAsync({
        id: property.id,
        title: formData.title,
        address: formData.address,
        price: Number(formData.price),
        type: formData.type,
        property_type: formData.property_type,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
        area: Number(formData.area),
        description: formData.description || null,
        image_url: formData.image_url || null,
        status: formData.status,
        owner_id: formData.owner_id || null,
      });

      toast.success("Bien modifié avec succès !");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la modification du bien");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Modifier le bien</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type de transaction *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
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
                value={formData.property_type}
                onValueChange={(value) => setFormData({ ...formData, property_type: value })}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="occupé">Occupé</SelectItem>
                  <SelectItem value="en attente">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Owner Selector */}
          <div className="space-y-2">
            <Label htmlFor="owner">Propriétaire</Label>
            <Select
              value={formData.owner_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, owner_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un propriétaire (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Aucun propriétaire</span>
                </SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {owner.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre du bien *</Label>
            <Input
              id="title"
              placeholder="Ex: Villa Belle Époque"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              placeholder="Ex: 16 Avenue Foch, Paris 16ème"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">
                {formData.type === "location" ? "Loyer mensuel (F CFA) *" : "Prix de vente (F CFA) *"}
              </Label>
              <Input
                id="price"
                type="number"
                placeholder="Ex: 150000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Surface (m²) *</Label>
              <Input
                id="area"
                type="number"
                placeholder="Ex: 120"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              />
            </div>
          </div>

          {formData.property_type !== "terrain" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Chambres</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  placeholder="Ex: 3"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Salles de bain</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  placeholder="Ex: 2"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                />
              </div>
            </div>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Décrivez le bien..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="bg-emerald hover:bg-emerald-dark" 
              disabled={isUploading || updateProperty.isPending}
            >
              {updateProperty.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
