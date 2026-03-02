import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useUpdateAcquisition, TYPE_ACQUISITION_LABELS, ACQUISITION_STATUS_LABELS, type Acquisition } from "@/hooks/useAcquisitions";

interface Props {
  acquisition: Acquisition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AcquisitionEditDialog({ acquisition, open, onOpenChange }: Props) {
  const updateAcquisition = useUpdateAcquisition();
  const [form, setForm] = useState({
    status: acquisition.status,
    valeur_estimee: String(acquisition.valeur_estimee || ""),
    counterpart_name: acquisition.counterpart_name || "",
    counterpart_phone: acquisition.counterpart_phone || "",
    counterpart_email: acquisition.counterpart_email || "",
    counterpart_address: acquisition.counterpart_address || "",
    date_deces: acquisition.date_deces || "",
    lien_parente: acquisition.lien_parente || "",
    numero_succession: acquisition.numero_succession || "",
    type_donation: acquisition.type_donation || "",
    societe_name: acquisition.societe_name || "",
    societe_siret: acquisition.societe_siret || "",
    type_apport: acquisition.type_apport || "",
    bien_echange_description: acquisition.bien_echange_description || "",
    valeur_bien_echange: String(acquisition.valeur_bien_echange || ""),
    notaire_name: acquisition.notaire_name || "",
    notaire_phone: acquisition.notaire_phone || "",
    notaire_email: acquisition.notaire_email || "",
    notaire_address: acquisition.notaire_address || "",
    titre_propriete: acquisition.titre_propriete,
    pieces_identite: acquisition.pieces_identite,
    certificat_localisation: acquisition.certificat_localisation,
    acte_notarie: acquisition.acte_notarie,
    attestation_fiscale: acquisition.attestation_fiscale,
    date_acte_signe: acquisition.date_acte_signe || "",
    date_enregistrement: acquisition.date_enregistrement || "",
    notes: acquisition.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAcquisition.mutateAsync({
      id: acquisition.id,
      status: form.status,
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
      notaire_email: form.notaire_email || undefined,
      notaire_address: form.notaire_address || undefined,
      titre_propriete: form.titre_propriete,
      pieces_identite: form.pieces_identite,
      certificat_localisation: form.certificat_localisation,
      acte_notarie: form.acte_notarie,
      attestation_fiscale: form.attestation_fiscale,
      date_acte_signe: form.date_acte_signe || undefined,
      date_enregistrement: form.date_enregistrement || undefined,
      notes: form.notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'acquisition - {TYPE_ACQUISITION_LABELS[acquisition.type_acquisition]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACQUISITION_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valeur estimée (FCFA)</Label>
              <Input type="number" value={form.valeur_estimee} onChange={e => setForm(f => ({ ...f, valeur_estimee: e.target.value }))} />
            </div>
          </div>

          <h3 className="font-semibold text-sm pt-2">Contrepartie</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Nom</Label><Input value={form.counterpart_name} onChange={e => setForm(f => ({ ...f, counterpart_name: e.target.value }))} /></div>
            <div><Label>Téléphone</Label><Input value={form.counterpart_phone} onChange={e => setForm(f => ({ ...f, counterpart_phone: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={form.counterpart_email} onChange={e => setForm(f => ({ ...f, counterpart_email: e.target.value }))} /></div>
            <div><Label>Adresse</Label><Input value={form.counterpart_address} onChange={e => setForm(f => ({ ...f, counterpart_address: e.target.value }))} /></div>
          </div>

          {acquisition.type_acquisition === "heritage" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Date de décès</Label><Input type="date" value={form.date_deces} onChange={e => setForm(f => ({ ...f, date_deces: e.target.value }))} /></div>
              <div><Label>Lien de parenté</Label><Input value={form.lien_parente} onChange={e => setForm(f => ({ ...f, lien_parente: e.target.value }))} /></div>
              <div><Label>N° de succession</Label><Input value={form.numero_succession} onChange={e => setForm(f => ({ ...f, numero_succession: e.target.value }))} /></div>
            </div>
          )}

          {acquisition.type_acquisition === "apport_societe" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Société</Label><Input value={form.societe_name} onChange={e => setForm(f => ({ ...f, societe_name: e.target.value }))} /></div>
              <div><Label>RCCM / SIRET</Label><Input value={form.societe_siret} onChange={e => setForm(f => ({ ...f, societe_siret: e.target.value }))} /></div>
              <div><Label>Type d'apport</Label><Input value={form.type_apport} onChange={e => setForm(f => ({ ...f, type_apport: e.target.value }))} /></div>
            </div>
          )}

          {acquisition.type_acquisition === "echange" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Bien échangé</Label><Textarea value={form.bien_echange_description} onChange={e => setForm(f => ({ ...f, bien_echange_description: e.target.value }))} /></div>
              <div><Label>Valeur du bien échangé</Label><Input type="number" value={form.valeur_bien_echange} onChange={e => setForm(f => ({ ...f, valeur_bien_echange: e.target.value }))} /></div>
            </div>
          )}

          <h3 className="font-semibold text-sm pt-2">Notaire</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Nom</Label><Input value={form.notaire_name} onChange={e => setForm(f => ({ ...f, notaire_name: e.target.value }))} /></div>
            <div><Label>Téléphone</Label><Input value={form.notaire_phone} onChange={e => setForm(f => ({ ...f, notaire_phone: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={form.notaire_email} onChange={e => setForm(f => ({ ...f, notaire_email: e.target.value }))} /></div>
            <div><Label>Adresse</Label><Input value={form.notaire_address} onChange={e => setForm(f => ({ ...f, notaire_address: e.target.value }))} /></div>
          </div>

          <h3 className="font-semibold text-sm pt-2">Documents</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: "titre_propriete", label: "Titre de propriété" },
              { key: "pieces_identite", label: "Pièces d'identité" },
              { key: "certificat_localisation", label: "Certificat de localisation" },
              { key: "acte_notarie", label: "Acte notarié" },
              { key: "attestation_fiscale", label: "Attestation fiscale" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  checked={form[key as keyof typeof form] as boolean}
                  onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))}
                />
                <Label className="text-sm">{label}</Label>
              </div>
            ))}
          </div>

          <h3 className="font-semibold text-sm pt-2">Dates clés</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Date acte signé</Label><Input type="date" value={form.date_acte_signe} onChange={e => setForm(f => ({ ...f, date_acte_signe: e.target.value }))} /></div>
            <div><Label>Date enregistrement</Label><Input type="date" value={form.date_enregistrement} onChange={e => setForm(f => ({ ...f, date_enregistrement: e.target.value }))} /></div>
          </div>

          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={updateAcquisition.isPending}>
              {updateAcquisition.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
