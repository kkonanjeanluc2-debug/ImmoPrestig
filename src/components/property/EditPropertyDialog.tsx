import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Home, Building, X, ImageIcon, Loader2, User } from "lucide-react";
import { GpsPositionInput } from "@/components/shared/GpsPositionInput";
import { CommuneSelector } from "@/components/shared/CommuneSelector";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateProperty, Property } from "@/hooks/useProperties";
import { useOwners } from "@/hooks/useOwners";
import { AssignUserSelect } from "@/components/assignment/AssignUserSelect";
import { useIsAgencyOwner } from "@/hooks/useAssignableUsers";

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
    rent_type: "mensuel",
    daily_rent_days: "",
    daily_rent_discount: "",
    bedrooms: "",
    bathrooms: "",
    area: "",
    description: "",
    image_url: "",
    status: "disponible",
    owner_id: "",
    assigned_to: null as string | null,
    latitude: "",
    longitude: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateProperty = useUpdateProperty();
  const { data: owners = [] } = useOwners();
  const { isOwner: isAgencyOwner } = useIsAgencyOwner();

  useEffect(() => {
    if (property && open) {
      setFormData({
        title: property.title || "",
        address: property.address || "",
        price: property.price?.toString() || "",
        type: property.type || "location",
        property_type: property.property_type || "appartement",
        rent_type: (property as any).rent_type || "mensuel",
        daily_rent_days: (property as any).daily_rent_days?.toString() || "",
        daily_rent_discount: (property as any).daily_rent_discount?.toString() || "0",
        bedrooms: property.bedrooms?.toString() || "",
        bathrooms: property.bathrooms?.toString() || "",
        area: property.area?.toString() || "",
        description: property.description || "",
        image_url: property.image_url || "",
        status: property.status || "disponible",
        owner_id: property.owner_id || "",
        assigned_to: (property as any).assigned_to || null,
        latitude: (property as any).latitude?.toString() || "",
        longitude: (property as any).longitude?.toString() || "",
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
    
    const isPriceRequired = formData.property_type !== "maison";
    if (!formData.title || !formData.address || (isPriceRequired && !formData.price)) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      await updateProperty.mutateAsync({
        id: property.id,
        title: formData.title,
        address: formData.address,
        price: formData.price ? Number(formData.price) : 0,
        type: formData.type,
        property_type: formData.property_type,
        rent_type: formData.property_type === "meuble" ? formData.rent_type : "mensuel",
        daily_rent_days: formData.rent_type === "journalier" && formData.daily_rent_days ? Number(formData.daily_rent_days) : null,
        daily_rent_discount: formData.rent_type === "journalier" && formData.daily_rent_discount ? Number(formData.daily_rent_discount) : 0,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
        area: formData.area ? Number(formData.area) : null,
        description: formData.description || null,
        image_url: formData.image_url || null,
        status: formData.status,
        owner_id: formData.owner_id || null,
        assigned_to: formData.assigned_to,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
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
                      Maison à porte multiple
                    </div>
                  </SelectItem>
                  <SelectItem value="villa">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Villa
                    </div>
                  </SelectItem>
                  <SelectItem value="bureau">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Bureau
                    </div>
                  </SelectItem>
                  <SelectItem value="commerce">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Commerce
                    </div>
                  </SelectItem>
                  <SelectItem value="immeuble">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Immeuble
                    </div>
                  </SelectItem>
                  <SelectItem value="meuble">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Location meublée
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
                  <SelectItem value="loué">Loué</SelectItem>
                  <SelectItem value="vendu">Vendu</SelectItem>
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

          {/* Assignment Selector - Only visible to agency owner/admin */}
          {isAgencyOwner && (
            <div className="space-y-2">
              <Label>Gestionnaire assigné</Label>
              <AssignUserSelect
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              />
              <p className="text-xs text-muted-foreground">
                Si assigné, seul ce gestionnaire pourra voir ce bien
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titre du bien *</Label>
            <Input
              id="title"
              placeholder="Ex: Villa Les Palmiers"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              placeholder="Ex: Cocody Riviera 3, Abidjan"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">
                {(formData.property_type === "maison" || formData.property_type === "immeuble") ? "Revenu mensuel (F CFA)" : "Loyer mensuel (F CFA) *"}
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
              <Label htmlFor="area">Surface (m²)</Label>
              <Input
                id="area"
                type="number"
                placeholder="Ex: 120"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              />
            </div>
          </div>

          {formData.property_type !== "terrain" && formData.property_type !== "maison" && formData.property_type !== "immeuble" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Pièces</Label>
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

          <GpsPositionInput
            latitude={formData.latitude}
            longitude={formData.longitude}
            onChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
          />


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
