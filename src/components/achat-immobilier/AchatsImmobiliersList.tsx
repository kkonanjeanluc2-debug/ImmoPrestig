import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Loader2 } from "lucide-react";
import { useAchatsImmobiliers, useCreateAchatImmobilier } from "@/hooks/useAchatsImmobiliers";
import { useBiensAchat } from "@/hooks/useBiensAchat";
import { useVendeurs } from "@/hooks/useVendeurs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function AchatsImmobiliersList() {
  const { data: achats, isLoading } = useAchatsImmobiliers();
  const { data: biens = [] } = useBiensAchat();
  const { data: vendeurs = [] } = useVendeurs();
  const createMutation = useCreateAchatImmobilier();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    bien_id: "", vendeur_id: "", sale_price: "", payment_type: "comptant",
    total_installments: "", down_payment: "", notary_fees: "", agency_fees: "", notes: "",
  });

  const handleSubmit = async () => {
    await createMutation.mutateAsync({
      bien_id: form.bien_id,
      vendeur_id: form.vendeur_id || undefined,
      sale_price: Number(form.sale_price),
      payment_type: form.payment_type,
      total_installments: form.total_installments ? Number(form.total_installments) : undefined,
      down_payment: form.down_payment ? Number(form.down_payment) : undefined,
      notary_fees: form.notary_fees ? Number(form.notary_fees) : undefined,
      agency_fees: form.agency_fees ? Number(form.agency_fees) : undefined,
      notes: form.notes || undefined,
    });
    setOpen(false);
    setForm({ bien_id: "", vendeur_id: "", sale_price: "", payment_type: "comptant", total_installments: "", down_payment: "", notary_fees: "", agency_fees: "", notes: "" });
  };

  const availableBiens = biens.filter(b => b.status !== "achete" && !!b.vendeur_id);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Achats réalisés</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!availableBiens.length}><Plus className="h-4 w-4 mr-2" />Enregistrer un achat</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enregistrer un achat</DialogTitle>
              <DialogDescription>Enregistrez un achat immobilier</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Bien *</Label>
                <Select value={form.bien_id} onValueChange={(v) => {
                  const bien = biens.find(b => b.id === v);
                  setForm({ ...form, bien_id: v, sale_price: bien ? String(bien.price) : form.sale_price, vendeur_id: bien?.vendeur_id || "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                  <SelectContent>
                    {availableBiens.map((b) => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {vendeurs.length > 0 && (
                <div className="space-y-2">
                  <Label>Vendeur</Label>
                  <Select value={form.vendeur_id} onValueChange={(v) => setForm({ ...form, vendeur_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {vendeurs.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prix d'achat (FCFA) *</Label>
                  <Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Type de paiement</Label>
                  <Select value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comptant">Comptant</SelectItem>
                      <SelectItem value="echelonne">Échelonné</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.payment_type === "echelonne" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre d'échéances</Label>
                    <Input type="number" value={form.total_installments} onChange={(e) => setForm({ ...form, total_installments: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Apport initial (FCFA)</Label>
                    <Input type="number" value={form.down_payment} onChange={(e) => setForm({ ...form, down_payment: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frais de notaire</Label>
                  <Input type="number" value={form.notary_fees} onChange={(e) => setForm({ ...form, notary_fees: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Frais d'agence</Label>
                  <Input type="number" value={form.agency_fees} onChange={(e) => setForm({ ...form, agency_fees: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={!form.bien_id || !form.sale_price || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!achats?.length ? (
        <Card>
          <CardContent className="text-center py-12">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun achat enregistré</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {achats.map((achat) => (
            <Card key={achat.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{achat.biens_achat?.title || "Bien"}</p>
                  <p className="text-sm text-muted-foreground">{achat.biens_achat?.address}</p>
                  {achat.vendeurs && <p className="text-sm text-muted-foreground">Vendeur: {achat.vendeurs.name}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{Number(achat.sale_price).toLocaleString("fr-FR")} FCFA</p>
                  <Badge variant="outline">{achat.payment_type === "comptant" ? "Comptant" : "Échelonné"}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(achat.sale_date), "dd MMM yyyy", { locale: fr })}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
