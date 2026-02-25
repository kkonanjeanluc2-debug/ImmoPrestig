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
    await updateMutation.mutateAsync({ id: contreOffreId, status: "contre_offre", counter_amount: Number(counterAmount) });
    setContreOffreId(null);
    setCounterAmount("");
  };

  const handleAccept = async (offre: any) => {
    await updateMutation.mutateAsync({ id: offre.id, status: "acceptee" });
    // Auto-create achat from accepted offer
    const finalAmount = offre.counter_amount || offre.offer_amount;
    await createAchatMutation.mutateAsync({
      bien_id: offre.bien_id,
      sale_price: Number(finalAmount),
      payment_type: "comptant",
      vendeur_id: offre.biens_achat?.vendeur_id || undefined,
    });
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
      <Dialog open={!!contreOffreId} onOpenChange={(v) => { if (!v) { setContreOffreId(null); setCounterAmount(""); } }}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setContreOffreId(null); setCounterAmount(""); }}>Annuler</Button>
            <Button onClick={handleContreOffre} disabled={!counterAmount || updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer
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
                      <Button size="sm" variant="outline" onClick={() => handleAccept(offre)} disabled={updateMutation.isPending || createAchatMutation.isPending}>
                        {(updateMutation.isPending || createAchatMutation.isPending) ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
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
