import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { GpsPositionInput } from "@/components/shared/GpsPositionInput";
import { useUpdateBienAchat, type BienAchat } from "@/hooks/useBiensAchat";
import { useVendeurs } from "@/hooks/useVendeurs";
import { toast } from "sonner";

const PROPERTY_TYPES = [
  { value: "appartement", label: "Appartement" },
  { value: "maison", label: "Maison à porte multiple" },
  { value: "villa", label: "Villa" },
  { value: "terrain", label: "Terrain" },
  { value: "bureau", label: "Bureau" },
  { value: "commerce", label: "Commerce" },
  { value: "immeuble", label: "Immeuble" },
  { value: "autre", label: "Autre" },
];

const STATUS_OPTIONS = [
  { value: "prospection", label: "Prospection" },
  { value: "en_negociation", label: "En négociation" },
  { value: "offre_faite", label: "Offre faite" },
  { value: "sous_compromis", label: "Sous compromis" },
  { value: "achete", label: "Acheté" },
  { value: "abandonne", label: "Abandonné" },
];

interface Props {
  bien: BienAchat;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBienAchatDialog({ bien, open, onOpenChange }: Props) {
  const updateMutation = useUpdateBienAchat();
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
    status: "prospection",
    latitude: "",
    longitude: "",
  });

  useEffect(() => {
    if (bien && open) {
      setForm({
        title: bien.title,
        property_type: bien.property_type,
        address: bien.address,
        city: bien.city || "",
        price: String(bien.price),
        area: bien.area ? String(bien.area) : "",
        bedrooms: bien.bedrooms ? String(bien.bedrooms) : "",
        bathrooms: bien.bathrooms ? String(bien.bathrooms) : "",
        description: bien.description || "",
        vendeur_id: bien.vendeur_id || "",
        status: bien.status,
        latitude: bien.latitude ? String(bien.latitude) : "",
        longitude: bien.longitude ? String(bien.longitude) : "",
      });
    }
  }, [bien, open]);




  const handleSubmit = async () => {
    await updateMutation.mutateAsync({
      id: bien.id,
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
      status: form.status,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
    });
    onOpenChange(false);
  };

  const isValid = form.title && form.address && form.price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le bien</DialogTitle>
          <DialogDescription>Modifiez les informations du bien</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
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

          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <GpsPositionInput
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
          />

          <div className="space-y-2">
            <Label>Vendeur</Label>
            <Select value={form.vendeur_id || "__none__"} onValueChange={(v) => setForm({ ...form, vendeur_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un vendeur" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__"><span className="text-muted-foreground">Aucun vendeur</span></SelectItem>
                {vendeurs.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!isValid || updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
