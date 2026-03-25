import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ImageIcon, X } from "lucide-react";
import { GpsPositionInput } from "@/components/shared/GpsPositionInput";
import { useCreateBienAchat } from "@/hooks/useBiensAchat";
import { useVendeurs } from "@/hooks/useVendeurs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PROPERTY_TYPES = [
  { value: "appartement", label: "Appartement" },
  { value: "villa", label: "Villa" },
  { value: "terrain", label: "Terrain" },
  { value: "bureau", label: "Bureau" },
  { value: "commerce", label: "Commerce" },
  { value: "immeuble", label: "Immeuble" },
  { value: "autre", label: "Autre" },
];

interface Props {
  children: React.ReactNode;
}

export function AddBienAchatDialog({ children }: Props) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateBienAchat();
  const { data: vendeurs = [] } = useVendeurs();
  const [form, setForm] = useState({
    title: "",
    property_type: "appartement",
    address: "",
    city: "",
    price: "",
    area: "",
    bedrooms: "",
    bathrooms: "",
    description: "",
    vendeur_id: "",
    latitude: "",
    longitude: "",
    lotArea: "",
    floors: "",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const filePath = `biens-achat/${fileName}`;

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


  const handleSubmit = async () => {
    const features: Record<string, unknown> = {};
    if (form.lotArea) features.lot_area = Number(form.lotArea);
    if (form.floors) features.floors = Number(form.floors);

    await createMutation.mutateAsync({
      title: form.title,
      property_type: form.property_type,
      address: form.address,
      city: form.city || undefined,
      price: Number(form.price),
      area: form.area ? Number(form.area) : undefined,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
      description: form.description || undefined,
      vendeur_id: form.vendeur_id || undefined,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      features: Object.keys(features).length > 0 ? features : undefined,
      image_url: imageUrl || undefined,
    });
    setOpen(false);
    setForm({ title: "", property_type: "appartement", address: "", city: "", price: "", area: "", bedrooms: "", bathrooms: "", description: "", vendeur_id: "", latitude: "", longitude: "", lotArea: "", floors: "" });
    setImageUrl("");
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isValid = form.title && form.address && form.price;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un bien à acheter</DialogTitle>
          <DialogDescription>Renseignez les informations du bien</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Villa Cocotiers" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prix (FCFA) *</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Adresse *</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          {/* Champs adaptatifs selon le type */}
          {form.property_type === "terrain" ? (
            <div className="space-y-2">
              <Label>Superficie (m²)</Label>
              <Input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ex: 500" />
            </div>
          ) : form.property_type === "immeuble" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Surface (m²)</Label>
                <Input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nombre d'étages</Label>
                <Input type="number" value={form.floors} onChange={(e) => setForm({ ...form, floors: e.target.value })} placeholder="Ex: 3" />
              </div>
              <div className="space-y-2">
                <Label>Pièces</Label>
                <Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SdB</Label>
                <Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
              </div>
            </div>
          ) : form.property_type === "bureau" || form.property_type === "commerce" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Surface (m²)</Label>
                <Input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SdB</Label>
                <Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Surface (m²)</Label>
                <Input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Pièces</Label>
                <Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SdB</Label>
                <Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
              </div>
            </div>
          )}

          <GpsPositionInput
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
          />

          <div className="space-y-2">
            <Label>Vendeur</Label>
            <Select value={form.vendeur_id} onValueChange={(v) => setForm({ ...form, vendeur_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un vendeur" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">Aucun vendeur</span>
                </SelectItem>
                {vendeurs.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {vendeurs.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucun vendeur enregistré. Ajoutez-en depuis l'onglet Vendeurs.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Photo du bien</Label>
            <div className="space-y-3">
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={imagePreview} alt="Aperçu" className="w-full h-48 object-cover" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={removeImage}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">Import en cours...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-2 rounded-full bg-primary/10">
                        <ImageIcon className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Cliquez pour importer une image</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (max 5 Mo)</p>
                    </div>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!isValid || createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
