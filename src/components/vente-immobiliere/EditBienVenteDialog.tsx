import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useUpdateBienVente, BienVente } from "@/hooks/useBiensVente";
import { toast } from "sonner";
import { Loader2, ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PROPERTY_TYPES = [
  { value: "maison", label: "Maison" },
  { value: "appartement", label: "Appartement" },
  { value: "villa", label: "Villa" },
  { value: "terrain", label: "Terrain" },
  { value: "immeuble", label: "Immeuble" },
  { value: "bureau", label: "Bureau" },
  { value: "local_commercial", label: "Local commercial" },
];

interface EditBienVenteDialogProps {
  bien: BienVente;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBienVenteDialog({ bien, open, onOpenChange }: EditBienVenteDialogProps) {
  const [title, setTitle] = useState(bien.title);
  const [address, setAddress] = useState(bien.address);
  const [city, setCity] = useState(bien.city || "Abidjan");
  const [propertyType, setPropertyType] = useState(bien.property_type);
  const [price, setPrice] = useState(bien.price.toString());
  const [area, setArea] = useState(bien.area?.toString() || "");
  const [bedrooms, setBedrooms] = useState(bien.bedrooms?.toString() || "");
  const [bathrooms, setBathrooms] = useState(bien.bathrooms?.toString() || "");
  const [description, setDescription] = useState(bien.description || "");
  const [imageUrl, setImageUrl] = useState(bien.image_url || "");
  const [imagePreview, setImagePreview] = useState<string | null>(bien.image_url);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateBien = useUpdateBienVente();

  useEffect(() => {
    if (open) {
      setTitle(bien.title);
      setAddress(bien.address);
      setCity(bien.city || "Abidjan");
      setPropertyType(bien.property_type);
      setPrice(bien.price.toString());
      setArea(bien.area?.toString() || "");
      setBedrooms(bien.bedrooms?.toString() || "");
      setBathrooms(bien.bathrooms?.toString() || "");
      setDescription(bien.description || "");
      setImageUrl(bien.image_url || "");
      setImagePreview(bien.image_url);
    }
  }, [open, bien]);

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
      const filePath = `biens-vente/${fileName}`;

      const { error } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      setImageUrl(urlData.publicUrl);
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
    setImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !address || !propertyType || !price) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      await updateBien.mutateAsync({
        id: bien.id,
        title,
        address,
        city,
        property_type: propertyType,
        price: parseFloat(price),
        area: area ? parseFloat(area) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        description: description || null,
        image_url: imageUrl || null,
      });

      toast.success("Bien modifié avec succès");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de la modification du bien");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le bien</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="edit-title">Titre *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Villa 4 pièces avec piscine"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit-address">Adresse *</Label>
              <Input
                id="edit-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Adresse complète"
              />
            </div>

            <div>
              <Label htmlFor="edit-city">Ville</Label>
              <Input
                id="edit-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-propertyType">Type de bien *</Label>
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
              <Label htmlFor="edit-price">Prix de vente (FCFA) *</Label>
              <Input
                id="edit-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="edit-area">Superficie (m²)</Label>
              <Input
                id="edit-area"
                type="number"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="edit-bedrooms">Chambres</Label>
              <Input
                id="edit-bedrooms"
                type="number"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="edit-bathrooms">Salles de bain</Label>
              <Input
                id="edit-bathrooms"
                type="number"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="col-span-2">
              <Label>Photo du bien</Label>
              <div className="space-y-3 mt-2">
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
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Import en cours...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 rounded-full bg-primary/10">
                          <ImageIcon className="h-8 w-8 text-primary" />
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

            <div className="col-span-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du bien..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateBien.isPending || isUploading}>
              {updateBien.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
