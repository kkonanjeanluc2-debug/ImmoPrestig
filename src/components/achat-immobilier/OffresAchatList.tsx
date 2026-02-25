import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Loader2 } from "lucide-react";
import { useOffresAchat, useCreateOffreAchat, useUpdateOffreAchat } from "@/hooks/useOffresAchat";
import { useBiensAchat } from "@/hooks/useBiensAchat";
import { useCreateAchatImmobilier } from "@/hooks/useAchatsImmobiliers";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  en_attente: "bg-amber-100 text-amber-800",
  acceptee: "bg-emerald-100 text-emerald-800",
  refusee: "bg-red-100 text-red-800",
  contre_offre: "bg-purple-100 text-purple-800",
  expiree: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  refusee: "Refusée",
  contre_offre: "Contre-offre",
  expiree: "Expirée",
};

export function OffresAchatList() {
  const { data: offres, isLoading } = useOffresAchat();
  const { data: biens = [] } = useBiensAchat();
  const createMutation = useCreateOffreAchat();
  const updateMutation = useUpdateOffreAchat();
  const createAchatMutation = useCreateAchatImmobilier();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ bien_id: "", offer_amount: "", conditions: "" });
  const [contreOffreId, setContreOffreId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterConditions, setCounterConditions] = useState("");
  const [acceptOffre, setAcceptOffre] = useState<any | null>(null);
  const [achatForm, setAchatForm] = useState({
    payment_type: "comptant", total_installments: "", down_payment: "", notary_fees: "", agency_fees: "", notes: "",
  });

  const handleSubmit = async () => {
    await createMutation.mutateAsync({
      bien_id: form.bien_id,
      offer_amount: Number(form.offer_amount),
      conditions: form.conditions || undefined,
    });
    setOpen(false);
    setForm({ bien_id: "", offer_amount: "", conditions: "" });
  };

  const handleContreOffre = async () => {
    if (!contreOffreId || !counterAmount) return;
    await updateMutation.mutateAsync({ id: contreOffreId, status: "contre_offre", counter_amount: Number(counterAmount), conditions: counterConditions || undefined });
    setContreOffreId(null);
    setCounterAmount("");
    setCounterConditions("");
  };

  const handleAcceptConfirm = async () => {
    if (!acceptOffre) return;
    await updateMutation.mutateAsync({ id: acceptOffre.id, status: "acceptee" });
    const finalAmount = acceptOffre.counter_amount || acceptOffre.offer_amount;
    await createAchatMutation.mutateAsync({
      bien_id: acceptOffre.bien_id,
      sale_price: Number(finalAmount),
      payment_type: achatForm.payment_type,
      total_installments: achatForm.total_installments ? Number(achatForm.total_installments) : undefined,
      down_payment: achatForm.down_payment ? Number(achatForm.down_payment) : undefined,
      notary_fees: achatForm.notary_fees ? Number(achatForm.notary_fees) : undefined,
      agency_fees: achatForm.agency_fees ? Number(achatForm.agency_fees) : undefined,
      notes: achatForm.notes || undefined,
      vendeur_id: acceptOffre.biens_achat?.vendeur_id || undefined,
    });
    setAcceptOffre(null);
    setAchatForm({ payment_type: "comptant", total_installments: "", down_payment: "", notary_fees: "", agency_fees: "", notes: "" });
  };

  const availableBiens = biens.filter(b => b.status !== "achete" && b.status !== "abandonne");

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Offres d'achat</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!availableBiens.length}><Plus className="h-4 w-4 mr-2" />Nouvelle offre</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle offre d'achat</DialogTitle>
              <DialogDescription>Faites une offre sur un bien prospecté</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Bien *</Label>
                <Select value={form.bien_id} onValueChange={(v) => setForm({ ...form, bien_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                  <SelectContent>
                    {availableBiens.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.title} - {Number(b.price).toLocaleString("fr-FR")} FCFA</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Montant de l'offre (FCFA) *</Label>
                <Input type="number" value={form.offer_amount} onChange={(e) => setForm({ ...form, offer_amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Conditions</Label>
                <Textarea value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} rows={3} placeholder="Ex: Sous réserve d'obtention de financement, inspection satisfaisante..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={!form.bien_id || !form.offer_amount || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Soumettre
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog contre-offre */}
      <Dialog open={!!contreOffreId} onOpenChange={(v) => { if (!v) { setContreOffreId(null); setCounterAmount(""); setCounterConditions(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Faire une contre-offre</DialogTitle>
            <DialogDescription>Indiquez le montant de votre contre-proposition</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Montant de la contre-offre (FCFA) *</Label>
              <Input type="number" value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} placeholder="Ex: 100 000 000" />
            </div>
            <div className="space-y-2">
              <Label>Conditions</Label>
              <Textarea value={counterConditions} onChange={(e) => setCounterConditions(e.target.value)} rows={3} placeholder="Ex: Sous réserve d'obtention de financement..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setContreOffreId(null); setCounterAmount(""); setCounterConditions(""); }}>Annuler</Button>
            <Button onClick={handleContreOffre} disabled={!counterAmount || updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog accepter offre - choix paiement */}
      <Dialog open={!!acceptOffre} onOpenChange={(v) => { if (!v) { setAcceptOffre(null); setAchatForm({ payment_type: "comptant", total_installments: "", down_payment: "", notary_fees: "", agency_fees: "", notes: "" }); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Valider l'achat</DialogTitle>
            <DialogDescription>
              {acceptOffre && <>Bien : <strong>{acceptOffre.biens_achat?.title}</strong> — Montant : <strong>{Number(acceptOffre.counter_amount || acceptOffre.offer_amount).toLocaleString("fr-FR")} FCFA</strong></>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type de paiement *</Label>
              <Select value={achatForm.payment_type} onValueChange={(v) => setAchatForm({ ...achatForm, payment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comptant">Comptant</SelectItem>
                  <SelectItem value="echelonne">Échelonné</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {achatForm.payment_type === "echelonne" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre d'échéances</Label>
                  <Input type="number" value={achatForm.total_installments} onChange={(e) => setAchatForm({ ...achatForm, total_installments: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Apport initial (FCFA)</Label>
                  <Input type="number" value={achatForm.down_payment} onChange={(e) => setAchatForm({ ...achatForm, down_payment: e.target.value })} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frais de notaire</Label>
                <Input type="number" value={achatForm.notary_fees} onChange={(e) => setAchatForm({ ...achatForm, notary_fees: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Frais d'agence</Label>
                <Input type="number" value={achatForm.agency_fees} onChange={(e) => setAchatForm({ ...achatForm, agency_fees: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={achatForm.notes} onChange={(e) => setAchatForm({ ...achatForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAcceptOffre(null); setAchatForm({ payment_type: "comptant", total_installments: "", down_payment: "", notary_fees: "", agency_fees: "", notes: "" }); }}>Annuler</Button>
            <Button onClick={handleAcceptConfirm} disabled={updateMutation.isPending || createAchatMutation.isPending}>
              {(updateMutation.isPending || createAchatMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Valider l'achat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!offres?.length ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune offre d'achat</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {offres.map((offre) => (
            <Card key={offre.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{offre.biens_achat?.title || "Bien inconnu"}</p>
                  <p className="text-sm text-muted-foreground">{offre.biens_achat?.address}</p>
                  <p className="text-lg font-bold mt-1">{Number(offre.offer_amount).toLocaleString("fr-FR")} FCFA</p>
                  {offre.status === "contre_offre" && offre.counter_amount && (
                    <p className="text-sm font-semibold text-purple-700">Contre-offre : {Number(offre.counter_amount).toLocaleString("fr-FR")} FCFA</p>
                  )}
                  <p className="text-xs text-muted-foreground">{format(new Date(offre.offer_date), "dd MMM yyyy", { locale: fr })}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={STATUS_COLORS[offre.status] || ""}>{STATUS_LABELS[offre.status] || offre.status}</Badge>
                  {(offre.status === "en_attente" || offre.status === "contre_offre") && (
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setAcceptOffre(offre)}>
                        Accepter
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setContreOffreId(offre.id)}>Contre-offre</Button>
                      <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: offre.id, status: "refusee" })}>Refuser</Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
