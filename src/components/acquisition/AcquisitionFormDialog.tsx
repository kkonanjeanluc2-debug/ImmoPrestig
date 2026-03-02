import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { useCreateAcquisition, TYPE_ACQUISITION_LABELS } from "@/hooks/useAcquisitions";
import { useBiensAchat } from "@/hooks/useBiensAchat";

export function AcquisitionFormDialog() {
  const [open, setOpen] = useState(false);
  const { data: biens = [] } = useBiensAchat();
  const createAcquisition = useCreateAcquisition();

  const [form, setForm] = useState({
    bien_id: "",
    type_acquisition: "donation",
    date_acquisition: new Date().toISOString().split("T")[0],
    valeur_estimee: "",
    counterpart_name: "",
    counterpart_phone: "",
    counterpart_email: "",
    counterpart_address: "",
    // Heritage
    date_deces: "",
    lien_parente: "",
    numero_succession: "",
    // Donation
    type_donation: "",
    // Apport
    societe_name: "",
    societe_siret: "",
    type_apport: "",
    // Échange
    bien_echange_description: "",
    valeur_bien_echange: "",
    // Notaire
    notaire_name: "",
    notaire_phone: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bien_id || !form.type_acquisition) return;
    await createAcquisition.mutateAsync({
      bien_id: form.bien_id,
      type_acquisition: form.type_acquisition,
      date_acquisition: form.date_acquisition || undefined,
      valeur_estimee: form.valeur_estimee ? Number(form.valeur_estimee) : undefined,
      counterpart_name: form.counterpart_name || undefined,
      counterpart_phone: form.counterpart_phone || undefined,
      counterpart_email: form.counterpart_email || undefined,
      counterpart_address: form.counterpart_address || undefined,
      date_deces: form.date_deces || undefined,
      lien_parente: form.lien_parente || undefined,
      numero_succession: form.numero_succession || undefined,
      type_donation: form.type_donation || undefined,
      societe_name: form.societe_name || undefined,
      societe_siret: form.societe_siret || undefined,
      type_apport: form.type_apport || undefined,
      bien_echange_description: form.bien_echange_description || undefined,
      valeur_bien_echange: form.valeur_bien_echange ? Number(form.valeur_bien_echange) : undefined,
      notaire_name: form.notaire_name || undefined,
      notaire_phone: form.notaire_phone || undefined,
      notes: form.notes || undefined,
    });
    setOpen(false);
    setForm({
      bien_id: "", type_acquisition: "donation", date_acquisition: new Date().toISOString().split("T")[0],
      valeur_estimee: "", counterpart_name: "", counterpart_phone: "", counterpart_email: "", counterpart_address: "",
      date_deces: "", lien_parente: "", numero_succession: "", type_donation: "",
      societe_name: "", societe_siret: "", type_apport: "",
      bien_echange_description: "", valeur_bien_echange: "", notaire_name: "", notaire_phone: "", notes: "",
    });
  };

  const counterpartLabel = {
    donation: "Donateur",
    heritage: "Défunt / Succession",
    apport_societe: "Société",
    echange: "Partie à l'échange",
  }[form.type_acquisition] || "Contrepartie";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Nouvelle acquisition</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enregistrer une acquisition</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Bien concerné *</Label>
              <Select value={form.bien_id} onValueChange={v => setForm(f => ({ ...f, bien_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                <SelectContent>
                  {biens.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.title} - {b.address}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type d'acquisition *</Label>
              <Select value={form.type_acquisition} onValueChange={v => setForm(f => ({ ...f, type_acquisition: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_ACQUISITION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date d'acquisition</Label>
              <Input type="date" value={form.date_acquisition} onChange={e => setForm(f => ({ ...f, date_acquisition: e.target.value }))} />
            </div>
            <div>
              <Label>Valeur estimée (FCFA)</Label>
              <Input type="number" value={form.valeur_estimee} onChange={e => setForm(f => ({ ...f, valeur_estimee: e.target.value }))} />
            </div>
          </div>

          <h3 className="font-semibold text-sm pt-2">{counterpartLabel}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nom</Label>
              <Input value={form.counterpart_name} onChange={e => setForm(f => ({ ...f, counterpart_name: e.target.value }))} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.counterpart_phone} onChange={e => setForm(f => ({ ...f, counterpart_phone: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.counterpart_email} onChange={e => setForm(f => ({ ...f, counterpart_email: e.target.value }))} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={form.counterpart_address} onChange={e => setForm(f => ({ ...f, counterpart_address: e.target.value }))} />
            </div>
          </div>

          {form.type_acquisition === "heritage" && (
            <>
              <h3 className="font-semibold text-sm pt-2">Détails de la succession</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Date de décès</Label>
                  <Input type="date" value={form.date_deces} onChange={e => setForm(f => ({ ...f, date_deces: e.target.value }))} />
                </div>
                <div>
                  <Label>Lien de parenté</Label>
                  <Input value={form.lien_parente} onChange={e => setForm(f => ({ ...f, lien_parente: e.target.value }))} placeholder="Ex: fils, neveu..." />
                </div>
                <div>
                  <Label>N° de succession</Label>
                  <Input value={form.numero_succession} onChange={e => setForm(f => ({ ...f, numero_succession: e.target.value }))} />
                </div>
              </div>
            </>
          )}

          {form.type_acquisition === "donation" && (
            <>
              <h3 className="font-semibold text-sm pt-2">Détails de la donation</h3>
              <div>
                <Label>Type de donation</Label>
                <Select value={form.type_donation} onValueChange={v => setForm(f => ({ ...f, type_donation: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Donation simple</SelectItem>
                    <SelectItem value="partage">Donation-partage</SelectItem>
                    <SelectItem value="entre_epoux">Donation entre époux</SelectItem>
                    <SelectItem value="deguisee">Donation déguisée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {form.type_acquisition === "apport_societe" && (
            <>
              <h3 className="font-semibold text-sm pt-2">Société concernée</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Nom de la société</Label>
                  <Input value={form.societe_name} onChange={e => setForm(f => ({ ...f, societe_name: e.target.value }))} />
                </div>
                <div>
                  <Label>RCCM / SIRET</Label>
                  <Input value={form.societe_siret} onChange={e => setForm(f => ({ ...f, societe_siret: e.target.value }))} />
                </div>
                <div>
                  <Label>Type d'apport</Label>
                  <Select value={form.type_apport} onValueChange={v => setForm(f => ({ ...f, type_apport: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nature">Apport en nature</SelectItem>
                      <SelectItem value="fusion">Fusion / Absorption</SelectItem>
                      <SelectItem value="scission">Scission</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {form.type_acquisition === "echange" && (
            <>
              <h3 className="font-semibold text-sm pt-2">Bien échangé</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Description du bien échangé</Label>
                  <Textarea value={form.bien_echange_description} onChange={e => setForm(f => ({ ...f, bien_echange_description: e.target.value }))} />
                </div>
                <div>
                  <Label>Valeur du bien échangé (FCFA)</Label>
                  <Input type="number" value={form.valeur_bien_echange} onChange={e => setForm(f => ({ ...f, valeur_bien_echange: e.target.value }))} />
                </div>
              </div>
            </>
          )}

          <h3 className="font-semibold text-sm pt-2">Notaire</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nom du notaire</Label>
              <Input value={form.notaire_name} onChange={e => setForm(f => ({ ...f, notaire_name: e.target.value }))} />
            </div>
            <div>
              <Label>Téléphone du notaire</Label>
              <Input value={form.notaire_phone} onChange={e => setForm(f => ({ ...f, notaire_phone: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={createAcquisition.isPending || !form.bien_id}>
              {createAcquisition.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
