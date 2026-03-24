import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Home, Building, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { GpsPositionInput } from "@/components/shared/GpsPositionInput";
import { supabase } from "@/integrations/supabase/client";
import { useCreateProperty } from "@/hooks/useProperties";
import { useOwners } from "@/hooks/useOwners";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { SubscriptionLimitAlert } from "@/components/subscription/SubscriptionLimitAlert";

interface AddPropertyDialogProps {
  onSuccess?: () => void;
}

export const AddPropertyDialog = ({ onSuccess }: AddPropertyDialogProps) => {
  const [open, setOpen] = useState(false);
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
    owner_id: "",
    latitude: "",
    longitude: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const createProperty = useCreateProperty();
  const { data: owners = [] } = useOwners();
  const limits = useSubscriptionLimits();


  const resetForm = () => {
    setFormData({
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
      owner_id: "",
      latitude: "",
      longitude: "",
    });
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isPriceRequired = formData.property_type !== "maison";
    if (!formData.title || !formData.address || (isPriceRequired && !formData.price)) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      await createProperty.mutateAsync({
        title: formData.title,
        address: formData.address,
        price: formData.price ? Number(formData.price) : 0,
        type: formData.type,
        property_type: formData.property_type,
        rent_type: "mensuel",
        daily_rent_days: null,
        daily_rent_discount: 0,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
        area: formData.area ? Number(formData.area) : null,
        description: formData.description || null,
        image_url: formData.image_url || null,
        owner_id: formData.owner_id || null,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
      });

      toast.success("Bien ajouté avec succès !");
      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'ajout du bien");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button 
          className="bg-emerald hover:bg-emerald-dark text-primary-foreground gap-2 w-full sm:w-auto text-sm" 
          size="sm"
          disabled={!limits.canCreateProperty}
        >
          <Plus className="h-4 w-4" />
          <span className="whitespace-nowrap">Ajouter un bien</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Ajouter un nouveau bien</DialogTitle>
        </DialogHeader>
        {!limits.canCreateProperty && limits.maxProperties !== null && (
          <SubscriptionLimitAlert
            type="property"
            planName={limits.planName}
            current={limits.currentProperties}
            max={limits.maxProperties}
          />
        )}
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
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

          {/* Owner Selector */}
          <div className="space-y-2">
            <Label htmlFor="owner">Propriétaire</Label>
            <Select
              value={formData.owner_id}
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

          <GpsPositionInput
            latitude={formData.latitude}
            longitude={formData.longitude}
            onChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
          />

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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="bg-emerald hover:bg-emerald-dark" 
              disabled={createProperty.isPending}
            >
              {createProperty.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter le bien
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
