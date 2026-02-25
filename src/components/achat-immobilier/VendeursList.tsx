import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, Plus, Loader2, Phone, Mail, Building2, ChevronDown, MapPin } from "lucide-react";
import { useVendeurs, useCreateVendeur } from "@/hooks/useVendeurs";
import { useBiensAchat } from "@/hooks/useBiensAchat";

const STATUS_LABELS: Record<string, string> = {
  prospection: "Prospection",
  en_negociation: "En négociation",
  offre_faite: "Offre faite",
  sous_compromis: "Sous compromis",
  achete: "Acheté",
  abandonne: "Abandonné",
};

export function VendeursList() {
  const { data: vendeurs, isLoading } = useVendeurs();
  const { data: biens = [] } = useBiensAchat();
  const createMutation = useCreateVendeur();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });

  const handleSubmit = async () => {
    await createMutation.mutateAsync({
      name: form.name,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
    });
    setOpen(false);
    setForm({ name: "", phone: "", email: "", address: "" });
  };

  const getBiensForVendeur = (vendeurId: string) =>
    biens.filter((b) => b.vendeur_id === vendeurId);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Vendeurs</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter un vendeur</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau vendeur</DialogTitle>
              <DialogDescription>Ajoutez les coordonnées du vendeur</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom complet *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={!form.name || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!vendeurs?.length ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun vendeur enregistré</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendeurs.map((v) => {
            const vendeurBiens = getBiensForVendeur(v.id);
            return (
              <Card key={v.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{v.name}</p>
                    {v.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />{v.phone}
                      </p>
                    )}
                    {v.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />{v.email}
                      </p>
                    )}
                  </div>
                </div>

                {vendeurBiens.length > 0 && (
                  <Collapsible className="mt-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {vendeurBiens.length} bien{vendeurBiens.length > 1 ? "s" : ""} associé{vendeurBiens.length > 1 ? "s" : ""}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {vendeurBiens.map((bien) => (
                        <div key={bien.id} className="rounded-md border p-2 text-sm">
                          <p className="font-medium truncate">{bien.title}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{bien.address}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs font-semibold text-primary">
                              {Number(bien.price).toLocaleString("fr-FR")} FCFA
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {STATUS_LABELS[bien.status] || bien.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {vendeurBiens.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-3 italic">Aucun bien associé</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
