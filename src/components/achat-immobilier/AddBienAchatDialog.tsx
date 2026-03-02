import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { useCreateBienAchat } from "@/hooks/useBiensAchat";
import { useVendeurs } from "@/hooks/useVendeurs";
import { toast } from "sonner";

const PROPERTY_TYPES = [
  { value: "appartement", label: "Appartement" },
  { value: "maison", label: "Maison" },
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
  const [gettingLocation, setGettingLocation] = useState(false);

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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
        setGettingLocation(false);
        toast.success("Position GPS capturée");
      },
      (error) => {
        setGettingLocation(false);
        toast.error("Impossible d'obtenir la position GPS");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
    });
    setOpen(false);
    setForm({ title: "", property_type: "appartement", address: "", city: "", price: "", area: "", bedrooms: "", bathrooms: "", description: "", vendeur_id: "", latitude: "", longitude: "", lotArea: "", floors: "" });
  };

  const isValid = form.title && form.address && form.price;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un bien à acheter</DialogTitle>
          <DialogDescription>Renseignez les informations du bien prospecté</DialogDescription>
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
                <Label>Chambres</Label>
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
                <Label>Chambres</Label>
                <Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SdB</Label>
                <Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
              </div>
            </div>
          )}

          {/* GPS Position */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Position GPS
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="any"
                placeholder="Latitude"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                step="any"
                placeholder="Longitude"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGetLocation}
                disabled={gettingLocation}
                title="Capturer ma position"
              >
                {gettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Cliquez sur le bouton pour capturer votre position actuelle</p>
          </div>

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
