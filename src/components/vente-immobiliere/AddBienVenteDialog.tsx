import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateBienVente } from "@/hooks/useBiensVente";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

const PROPERTY_TYPES = [
  { value: "maison", label: "Maison" },
  { value: "appartement", label: "Appartement" },
  { value: "villa", label: "Villa" },
  { value: "terrain", label: "Terrain" },
  { value: "immeuble", label: "Immeuble" },
  { value: "bureau", label: "Bureau" },
  { value: "local_commercial", label: "Local commercial" },
];

interface AddBienVenteDialogProps {
  children?: React.ReactNode;
}

export function AddBienVenteDialog({ children }: AddBienVenteDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Abidjan");
  const [propertyType, setPropertyType] = useState("");
  const [price, setPrice] = useState("");
  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [description, setDescription] = useState("");

  const createBien = useCreateBienVente();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !address || !propertyType || !price) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      await createBien.mutateAsync({
        title,
        address,
        city,
        property_type: propertyType,
        price: parseFloat(price),
        area: area ? parseFloat(area) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        description: description || null,
      });

      toast.success("Bien ajouté avec succès");
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de l'ajout du bien");
    }
  };

  const resetForm = () => {
    setTitle("");
    setAddress("");
    setCity("Abidjan");
    setPropertyType("");
    setPrice("");
    setArea("");
    setBedrooms("");
    setBathrooms("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un bien
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un bien à vendre</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Villa 4 pièces avec piscine"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Adresse complète"
              />
            </div>

            <div>
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="propertyType">Type de bien *</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price">Prix de vente (FCFA) *</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="area">Superficie (m²)</Label>
              <Input
                id="area"
                type="number"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="bedrooms">Chambres</Label>
              <Input
                id="bedrooms"
                type="number"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="bathrooms">Salles de bain</Label>
              <Input
                id="bathrooms"
                type="number"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du bien..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createBien.isPending}>
              {createBien.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
