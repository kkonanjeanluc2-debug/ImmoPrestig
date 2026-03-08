import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Loader2, UserPlus, FileText } from "lucide-react";
import { DocumentsAchatTransactionDialog } from "./DocumentsAchatTransactionDialog";
import { useAchatsImmobiliers, useCreateAchatImmobilier } from "@/hooks/useAchatsImmobiliers";
import { useBiensAchat } from "@/hooks/useBiensAchat";
import { useVendeurs } from "@/hooks/useVendeurs";
import { useAcquereurs, useCreateAcquereur } from "@/hooks/useAcquereurs";
import { useOffresAchat } from "@/hooks/useOffresAchat";
import { useAgency } from "@/hooks/useAgency";
import { usePermissions } from "@/hooks/usePermissions";
import { format, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import type { PeriodValue } from "@/components/dashboard/PeriodFilter";
import type { AchatImmobilier } from "@/hooks/useAchatsImmobiliers";

interface AchatsImmobiliersListProps {
  period?: PeriodValue;
}

export function AchatsImmobiliersList({ period }: AchatsImmobiliersListProps) {
  const { data: achats, isLoading } = useAchatsImmobiliers();
  const { data: biens = [] } = useBiensAchat();
  const { data: vendeurs = [] } = useVendeurs();
  const { data: acquereurs = [] } = useAcquereurs();
  const { data: offres = [] } = useOffresAchat();
  const { data: agency } = useAgency();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("can_create_achats");
  const createMutation = useCreateAchatImmobilier();
  const createAcquereur = useCreateAcquereur();
  const [open, setOpen] = useState(false);
  const [docsAchat, setDocsAchat] = useState<AchatImmobilier | null>(null);
  const [showNewAcquereur, setShowNewAcquereur] = useState(false);
  const [newAcquereur, setNewAcquereur] = useState({ name: "", phone: "", email: "", address: "", cni_number: "", birth_date: "", birth_place: "", profession: "" });
  const [form, setForm] = useState({
    bien_id: "", vendeur_id: "", acquereur_id: "", sale_price: "", payment_type: "comptant",
    total_installments: "", down_payment: "", notary_fees: "", agency_fees: "",
    commission_percentage: "", commission_amount: "", notes: "",
  });

  const handleCommissionChange = (percentage: string) => {
    const pct = Number(percentage) || 0;
    const price = Number(form.sale_price) || 0;
    setForm({
      ...form,
      commission_percentage: percentage,
      commission_amount: price > 0 ? String(Math.round(price * pct / 100)) : "",
    });
  };

  const handlePriceChange = (price: string) => {
    const pct = Number(form.commission_percentage) || 0;
    const p = Number(price) || 0;
    setForm({
      ...form,
      sale_price: price,
      commission_amount: pct > 0 && p > 0 ? String(Math.round(p * pct / 100)) : form.commission_amount,
    });
  };

  const handleSubmit = async () => {
    let acquereurId = form.acquereur_id || undefined;

    // Create new acquéreur if needed
    if (showNewAcquereur && newAcquereur.name.trim()) {
      try {
        const created = await createAcquereur.mutateAsync({
          name: newAcquereur.name.trim(),
          phone: newAcquereur.phone.trim() || null,
          email: newAcquereur.email.trim() || null,
          address: newAcquereur.address.trim() || null,
          cni_number: newAcquereur.cni_number.trim() || null,
          birth_date: newAcquereur.birth_date || null,
          birth_place: newAcquereur.birth_place.trim() || null,
          profession: newAcquereur.profession.trim() || null,
        });
        acquereurId = created.id;
      } catch (e: any) {
        toast.error("Erreur création acquéreur: " + e.message);
        return;
      }
    }

    await createMutation.mutateAsync({
      bien_id: form.bien_id,
      vendeur_id: form.vendeur_id || undefined,
      acquereur_id: acquereurId,
      sale_price: Number(form.sale_price),
      payment_type: form.payment_type,
      total_installments: form.total_installments ? Number(form.total_installments) : undefined,
      down_payment: form.down_payment ? Number(form.down_payment) : undefined,
      notary_fees: form.notary_fees ? Number(form.notary_fees) : undefined,
      agency_fees: form.agency_fees ? Number(form.agency_fees) : undefined,
      commission_percentage: form.commission_percentage ? Number(form.commission_percentage) : undefined,
      commission_amount: form.commission_amount ? Number(form.commission_amount) : undefined,
      notes: form.notes || undefined,
    });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({ bien_id: "", vendeur_id: "", acquereur_id: "", sale_price: "", payment_type: "comptant", total_installments: "", down_payment: "", notary_fees: "", agency_fees: "", commission_percentage: "", commission_amount: "", notes: "" });
    setShowNewAcquereur(false);
    setNewAcquereur({ name: "", phone: "", email: "", address: "", cni_number: "", birth_date: "", birth_place: "", profession: "" });
  };

  const availableBiens = biens.filter(b => b.status !== "achete" && !!b.vendeur_id);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Achats réalisés</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          {canCreate && (
            <DialogTrigger asChild>
              <Button size="sm" disabled={!availableBiens.length}><Plus className="h-4 w-4 mr-2" />Enregistrer un achat</Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enregistrer un achat</DialogTitle>
              <DialogDescription>Un client achète un bien via l'agence</DialogDescription>
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

              {/* Acquéreur (client acheteur) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Acquéreur (client) *</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewAcquereur(!showNewAcquereur)}>
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    {showNewAcquereur ? "Existant" : "Nouveau"}
                  </Button>
                </div>
                {showNewAcquereur ? (
                  <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                    <Input placeholder="Nom complet *" value={newAcquereur.name} onChange={(e) => setNewAcquereur({ ...newAcquereur, name: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Téléphone" value={newAcquereur.phone} onChange={(e) => setNewAcquereur({ ...newAcquereur, phone: e.target.value })} />
                      <Input placeholder="Email" type="email" value={newAcquereur.email} onChange={(e) => setNewAcquereur({ ...newAcquereur, email: e.target.value })} />
                    </div>
                    <Input placeholder="Adresse" value={newAcquereur.address} onChange={(e) => setNewAcquereur({ ...newAcquereur, address: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="N° CNI" value={newAcquereur.cni_number} onChange={(e) => setNewAcquereur({ ...newAcquereur, cni_number: e.target.value })} />
                      <Input placeholder="Profession" value={newAcquereur.profession} onChange={(e) => setNewAcquereur({ ...newAcquereur, profession: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Date de naissance</Label>
                        <Input type="date" value={newAcquereur.birth_date} onChange={(e) => setNewAcquereur({ ...newAcquereur, birth_date: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Lieu de naissance</Label>
                        <Input placeholder="Lieu" value={newAcquereur.birth_place} onChange={(e) => setNewAcquereur({ ...newAcquereur, birth_place: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Select value={form.acquereur_id} onValueChange={(v) => setForm({ ...form, acquereur_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un acquéreur" /></SelectTrigger>
                    <SelectContent>
                      {acquereurs.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
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
                  <Input type="number" value={form.sale_price} onChange={(e) => handlePriceChange(e.target.value)} />
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

              {/* Commission agence */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Commission agence (%)</Label>
                  <Input type="number" placeholder="0" value={form.commission_percentage} onChange={(e) => handleCommissionChange(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Montant commission (FCFA)</Label>
                  <Input type="number" value={form.commission_amount} readOnly className="bg-muted/50" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Frais de notaire</Label>
                <Input type="number" value={form.notary_fees} onChange={(e) => setForm({ ...form, notary_fees: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={!form.bien_id || !form.sale_price || (!form.acquereur_id && !showNewAcquereur) || (showNewAcquereur && !newAcquereur.name.trim()) || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(() => {
        const filtered = period
          ? (achats || []).filter(a => {
              const d = new Date(a.sale_date);
              return isWithinInterval(d, { start: period.from, end: period.to });
            })
          : achats || [];

        if (!filtered.length) {
          return (
            <Card>
              <CardContent className="text-center py-12">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun achat enregistré</p>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-3">
            {filtered.map((achat) => (
            <Card key={achat.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{achat.biens_achat?.title || "Bien"}</p>
                  <p className="text-sm text-muted-foreground">{achat.biens_achat?.address}</p>
                  {achat.acquereurs && <p className="text-sm text-muted-foreground">Acquéreur: {achat.acquereurs.name}</p>}
                  {achat.vendeurs && <p className="text-sm text-muted-foreground">Vendeur: {achat.vendeurs.name}</p>}
                </div>
                <div className="text-right space-y-1">
                  <p className="text-lg font-bold">{Number(achat.sale_price).toLocaleString("fr-FR")} FCFA</p>
                  <div className="flex items-center gap-2 justify-end">
                    <Badge variant="outline">{achat.payment_type === "comptant" ? "Comptant" : "Échelonné"}</Badge>
                    <Button variant="outline" size="sm" onClick={() => setDocsAchat(achat)}>
                      <FileText className="h-4 w-4 mr-1" />
                      Documents
                    </Button>
                  </div>
                  {achat.commission_amount && achat.commission_amount > 0 && (
                    <p className="text-xs text-primary">Commission: {Number(achat.commission_amount).toLocaleString("fr-FR")} FCFA</p>
                  )}
                  <p className="text-xs text-muted-foreground">{format(new Date(achat.sale_date), "dd MMM yyyy", { locale: fr })}</p>
                </div>
              </div>
            </Card>
          ))}
          </div>
        );
      })()}
    </div>
  );
}
