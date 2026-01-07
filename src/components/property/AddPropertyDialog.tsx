import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Home, Building, MapPin } from "lucide-react";
import { toast } from "sonner";

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
    setOpen(false);
  };

  const propertyTypeIcon = {
    maison: Home,
    appartement: Building,
    terrain: MapPin,
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

          {/* URL de l'image */}
          <div className="space-y-2">
            <Label htmlFor="image">URL de l'image</Label>
            <Input
              id="image"
              placeholder="https://exemple.com/image.jpg"
              value={formData.image || ""}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            />
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
            <Button type="submit" className="bg-emerald hover:bg-emerald-dark">
              Ajouter le bien
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
