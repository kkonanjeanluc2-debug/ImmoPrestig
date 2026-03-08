import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Plus, Loader2, Mail, UserPlus } from "lucide-react";
import { useOffresAchat, useCreateOffreAchat, useUpdateOffreAchat } from "@/hooks/useOffresAchat";
import { useBiensAchat } from "@/hooks/useBiensAchat";
import { useCreateAchatImmobilier, useAchatsImmobiliers } from "@/hooks/useAchatsImmobiliers";
import { useAcquereurs, useCreateAcquereur } from "@/hooks/useAcquereurs";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const { data: acquereurs = [] } = useAcquereurs();
  const createAcquereur = useCreateAcquereur();
  const createMutation = useCreateOffreAchat();
  const updateMutation = useUpdateOffreAchat();
  const createAchatMutation = useCreateAchatImmobilier();
  const { data: achatsData } = useAchatsImmobiliers();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreateOffre = hasPermission("can_create_offres_achat");
  const canEditAchats = hasPermission("can_edit_achats");
  const canCreateAchats = hasPermission("can_create_achats");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ bien_id: "", offer_amount: "", conditions: "", acquereur_id: "" });
  const [showNewAcquereur, setShowNewAcquereur] = useState(false);
  const [newAcquereur, setNewAcquereur] = useState({ name: "", phone: "", email: "" });
  const [contreOffreId, setContreOffreId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterConditions, setCounterConditions] = useState("");
  const [acceptOffre, setAcceptOffre] = useState<any | null>(null);
  const [achatForm, setAchatForm] = useState({
    payment_type: "comptant", total_installments: "", down_payment: "", notary_fees: "", agency_fees: "", notes: "",
  });

  const handleSubmit = async () => {
    let acquereurId = form.acquereur_id || undefined;

    // Create new acquéreur if needed
    if (showNewAcquereur && newAcquereur.name.trim()) {
      try {
        const created = await createAcquereur.mutateAsync({
          name: newAcquereur.name.trim(),
          phone: newAcquereur.phone.trim() || null,
          email: newAcquereur.email.trim() || null,
        });
        acquereurId = created.id;
      } catch (e: any) {
        toast.error("Erreur création acquéreur: " + e.message);
        return;
      }
    }

    const result = await createMutation.mutateAsync({
      bien_id: form.bien_id,
      offer_amount: Number(form.offer_amount),
      conditions: form.conditions || undefined,
      acquereur_id: acquereurId,
    });
    setOpen(false);
    setForm({ bien_id: "", offer_amount: "", conditions: "", acquereur_id: "" });
    setShowNewAcquereur(false);
    setNewAcquereur({ name: "", phone: "", email: "" });

    // Auto-send email to vendor
    if (result?.id) {
      try {
        const { data, error } = await supabase.functions.invoke("send-offer-to-vendor", {
          body: { offre_id: result.id },
        });
        if (error) {
          console.error("Email send error:", error);
          toast.info("Offre créée. L'email au vendeur n'a pas pu être envoyé.");
        } else if (data?.success) {
          toast.success("Email envoyé au vendeur avec le lien de consultation");
        } else if (data?.warning) {
          toast.info(data.warning);
        } else {
          toast.info("Offre créée. Vérifiez l'email du vendeur.");
        }
      } catch {
        toast.info("Offre créée mais l'envoi de l'email a échoué.");
      }
    }
  };

  const handleContreOffre = async () => {
    if (!contreOffreId || !counterAmount) return;
    await updateMutation.mutateAsync({ id: contreOffreId, status: "contre_offre", counter_amount: Number(counterAmount), conditions: counterConditions || undefined });
    
    // Re-notify vendor by email
    try {
      const { data, error } = await supabase.functions.invoke("send-offer-to-vendor", {
        body: { offre_id: contreOffreId },
      });
      if (data?.success) {
        toast.success("Contre-offre envoyée et vendeur notifié par email");
      } else {
        toast.info("Contre-offre enregistrée. L'email au vendeur n'a pas pu être envoyé.");
      }
    } catch {
      toast.info("Contre-offre enregistrée mais l'envoi de l'email a échoué.");
    }

    setContreOffreId(null);
    setCounterAmount("");
    setCounterConditions("");
  };

  const handleAcceptConfirm = async () => {
    if (!acceptOffre) return;
    await updateMutation.mutateAsync({ id: acceptOffre.id, status: "acceptee" });
    const finalAmount = Number(acceptOffre.counter_amount || acceptOffre.offer_amount);
    const notaryFeesAmount = achatForm.notary_fees ? Math.round(finalAmount * Number(achatForm.notary_fees) / 100) : undefined;
    const agencyFeesAmount = achatForm.agency_fees ? Math.round(finalAmount * Number(achatForm.agency_fees) / 100) : undefined;
    const achatResult = await createAchatMutation.mutateAsync({
      bien_id: acceptOffre.bien_id,
      sale_price: finalAmount,
      payment_type: achatForm.payment_type,
      total_installments: achatForm.total_installments ? Number(achatForm.total_installments) : undefined,
      down_payment: achatForm.down_payment ? Number(achatForm.down_payment) : undefined,
      notary_fees: notaryFeesAmount,
      agency_fees: agencyFeesAmount,
      notes: achatForm.notes || undefined,
      vendeur_id: acceptOffre.biens_achat?.vendeur_id || undefined,
      acquereur_id: acceptOffre.acquereur_id || undefined,
    });

    // Auto-generate payment installments
    if (achatResult?.id && achatForm.payment_type === "echelonne" && achatForm.total_installments) {
      const totalInstallments = Number(achatForm.total_installments);
      const downPayment = achatForm.down_payment ? Number(achatForm.down_payment) : 0;
      const remaining = finalAmount - downPayment;
      const installmentAmount = Math.round(remaining / totalInstallments);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const echeances = Array.from({ length: totalInstallments }, (_, i) => {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + i + 1);
          dueDate.setDate(10);
          const isLast = i === totalInstallments - 1;
          const amount = isLast ? remaining - installmentAmount * (totalInstallments - 1) : installmentAmount;
          return {
            achat_id: achatResult.id,
            user_id: user.id,
            amount,
            due_date: dueDate.toISOString().split("T")[0],
            status: "en_attente",
          };
        });
        const { error } = await supabase.from("echeances_achats").insert(echeances);
        if (error) {
          console.error("Erreur création échéances:", error);
          toast.error("L'achat a été créé mais les échéances n'ont pas pu être générées.");
        } else {
          toast.success(`${totalInstallments} échéances générées automatiquement`);
        }
      }
    }

    setAcceptOffre(null);
    setAchatForm({ payment_type: "comptant", total_installments: "", down_payment: "", notary_fees: "", agency_fees: "", notes: "" });
    navigate("/achats-immobiliers");
  };

  const availableBiens = biens.filter(b => b.status !== "achete" && b.status !== "abandonne" && !!b.vendeur_id);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Offres d'achat</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          {canCreateOffre && (
            <DialogTrigger asChild>
              <Button size="sm" disabled={!availableBiens.length}><Plus className="h-4 w-4 mr-2" />Nouvelle offre</Button>
            </DialogTrigger>
          )}
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

              {/* Acquéreur */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Acquéreur</Label>
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
                  </div>
                ) : (
                  <Select value={form.acquereur_id} onValueChange={(v) => setForm({ ...form, acquereur_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un acquéreur (optionnel)" /></SelectTrigger>
                    <SelectContent>
                      {acquereurs.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
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
            <p className="text-xs text-destructive font-medium">⚠️ Conformément au droit ivoirien (Décret n°2013-461), les frais de notaire sont fixés entre 7% et 10% du prix de vente. Les frais d'agence ne doivent pas excéder 10%.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frais de notaire (%)</Label>
                <Input type="number" min="0" max="100" step="0.5" value={achatForm.notary_fees} onChange={(e) => setAchatForm({ ...achatForm, notary_fees: e.target.value })} placeholder="Ex: 8" />
                {achatForm.notary_fees && acceptOffre && (
                  <p className="text-xs text-muted-foreground">
                    = {Math.round(Number(acceptOffre.counter_amount || acceptOffre.offer_amount) * Number(achatForm.notary_fees) / 100).toLocaleString("fr-FR")} FCFA
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Frais d'agence (%)</Label>
                <Input type="number" min="0" max="100" step="0.5" value={achatForm.agency_fees} onChange={(e) => setAchatForm({ ...achatForm, agency_fees: e.target.value })} placeholder="Ex: 5" />
                {achatForm.agency_fees && acceptOffre && (
                  <p className="text-xs text-muted-foreground">
                    = {Math.round(Number(acceptOffre.counter_amount || acceptOffre.offer_amount) * Number(achatForm.agency_fees) / 100).toLocaleString("fr-FR")} FCFA
                  </p>
                )}
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
                  {offre.acquereurs && <p className="text-sm text-muted-foreground">Acquéreur: {offre.acquereurs.name}</p>}
                  <p className="text-lg font-bold mt-1">{Number(offre.offer_amount).toLocaleString("fr-FR")} FCFA</p>
                  {offre.status === "contre_offre" && offre.counter_amount && (
                    <p className="text-sm font-semibold text-purple-700">Contre-offre : {Number(offre.counter_amount).toLocaleString("fr-FR")} FCFA</p>
                  )}
                  {offre.vendor_responded_at && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3" />
                      Réponse du vendeur le {format(new Date(offre.vendor_responded_at), "dd MMM yyyy", { locale: fr })}
                      {offre.vendor_response_notes && ` — "${offre.vendor_response_notes}"`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{format(new Date(offre.offer_date), "dd MMM yyyy", { locale: fr })}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={STATUS_COLORS[offre.status] || ""}>{STATUS_LABELS[offre.status] || offre.status}</Badge>
                  {canCreateAchats && offre.status === "acceptee" && !achatsData?.some(a => a.bien_id === offre.bien_id) && (
                    <Button size="sm" onClick={() => setAcceptOffre(offre)}>Finaliser l'achat</Button>
                  )}
                  {canEditAchats && (offre.status === "en_attente" || offre.status === "contre_offre") && (
                    <div className="flex gap-1 flex-wrap">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button size="sm" variant="outline" onClick={() => setAcceptOffre(offre)} disabled={!offre.biens_achat?.vendeur_id}>
                                Accepter
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!offre.biens_achat?.vendeur_id && <TooltipContent>Veuillez d'abord associer un vendeur à ce bien</TooltipContent>}
                        </Tooltip>
                      </TooltipProvider>
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
