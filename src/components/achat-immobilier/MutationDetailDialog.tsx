import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { useUpdateMutationAchat, type MutationAchat } from "@/hooks/useMutationsAchats";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUS_STEPS = [
  { key: "offre_creee", label: "Offre créée" },
  { key: "dossier_constitue", label: "Dossier constitué" },
  { key: "acte_signe", label: "Acte signé" },
  { key: "depot_notaire", label: "Dépôt notaire" },
  { key: "mutation_enregistree", label: "Mutation enregistrée" },
];

const DOCUMENTS = [
  { key: "titre_propriete", label: "Titre de propriété (ACD, CMPF, certificat)" },
  { key: "pieces_identite", label: "Pièces d'identité des parties" },
  { key: "certificat_localisation", label: "Certificat de localisation" },
  { key: "etat_foncier", label: "État foncier" },
  { key: "situation_fiscale", label: "Situation fiscale du bien" },
  { key: "quittances_paiement", label: "Quittances de paiement" },
] as const;

interface Props {
  mutation: MutationAchat;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MutationDetailDialog({ mutation: mut, open, onOpenChange }: Props) {
  const updateMutation = useUpdateMutationAchat();

  const [status, setStatus] = useState(mut.status);
  const [notaireName, setNotaireName] = useState(mut.notaire_name || "");
  const [notairePhone, setNotairePhone] = useState(mut.notaire_phone || "");
  const [notaireEmail, setNotaireEmail] = useState(mut.notaire_email || "");
  const [notaireAddress, setNotaireAddress] = useState(mut.notaire_address || "");
  const [notes, setNotes] = useState(mut.notes || "");
  const [sendingEmail, setSendingEmail] = useState(false);

  const [docs, setDocs] = useState({
    titre_propriete: mut.titre_propriete,
    pieces_identite: mut.pieces_identite,
    certificat_localisation: mut.certificat_localisation,
    etat_foncier: mut.etat_foncier,
    situation_fiscale: mut.situation_fiscale,
    quittances_paiement: mut.quittances_paiement,
  });

  // Per-document submission tracking
  const [docsTransmis, setDocsTransmis] = useState<Record<string, string>>(
    (mut as any).documents_transmis || {}
  );

  const [droitsEnregistrement, setDroitsEnregistrement] = useState(mut.droits_enregistrement || 0);
  const [taxePublicite, setTaxePublicite] = useState(mut.taxe_publicite || 0);
  const [fraisFixes, setFraisFixes] = useState(mut.frais_fixes || 0);
  const [fraisNotariaux, setFraisNotariaux] = useState(mut.frais_notariaux || 0);

  const [dateActe, setDateActe] = useState(mut.date_acte_signe?.split("T")[0] || "");
  const [dateDepot, setDateDepot] = useState(mut.date_depot_notaire?.split("T")[0] || "");
  const [dateMutation, setDateMutation] = useState(mut.date_mutation_enregistree?.split("T")[0] || "");

  const totalCosts = droitsEnregistrement + taxePublicite + fraisFixes + fraisNotariaux;

  // Missing documents summary
  const missingDocs = DOCUMENTS.filter((d) => !docs[d.key]);
  const transmittedDocs = DOCUMENTS.filter((d) => docsTransmis[d.key]);

  const toggleTransmis = (key: string) => {
    setDocsTransmis((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = new Date().toISOString().split("T")[0];
      }
      return next;
    });
  };

  const handleSave = () => {
    updateMutation.mutate(
      {
        id: mut.id,
        status,
        notaire_name: notaireName || undefined,
        notaire_phone: notairePhone || undefined,
        notaire_email: notaireEmail || undefined,
        notaire_address: notaireAddress || undefined,
        notes: notes || undefined,
        ...docs,
        droits_enregistrement: droitsEnregistrement,
        taxe_publicite: taxePublicite,
        frais_fixes: fraisFixes,
        frais_notariaux: fraisNotariaux,
        date_acte_signe: dateActe || undefined,
        date_depot_notaire: dateDepot || undefined,
        date_mutation_enregistree: dateMutation || undefined,
        documents_transmis: docsTransmis,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handleSendChecklist = async () => {
    if (!notaireEmail) {
      toast.error("Veuillez renseigner l'email du notaire");
      return;
    }
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-notaire-checklist", {
        body: { mutation_id: mut.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Checklist envoyée au notaire");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setSendingEmail(false);
    }
  };

  const currentStep = STATUS_STEPS.findIndex((s) => s.key === status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dossier de mutation — {mut.biens_achat?.title || "Bien"}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STATUS_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => setStatus(step.key)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  i <= currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-current">
                  {i + 1}
                </span>
                {step.label}
              </button>
              {i < STATUS_STEPS.length - 1 && <div className={`w-4 h-0.5 ${i < currentStep ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <Separator />

        {/* Documents requis + suivi transmission */}
        <div>
          <p className="text-sm font-semibold mb-2">Pièces nécessaires</p>
          <div className="grid grid-cols-1 gap-2">
            {DOCUMENTS.map((doc) => (
              <div key={doc.key} className="flex items-center justify-between gap-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <Checkbox
                    checked={docs[doc.key]}
                    onCheckedChange={(v) => setDocs((prev) => ({ ...prev, [doc.key]: !!v }))}
                  />
                  {doc.label}
                </label>
                {docs[doc.key] && (
                  <button
                    type="button"
                    onClick={() => toggleTransmis(doc.key)}
                    className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${
                      docsTransmis[doc.key]
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {docsTransmis[doc.key]
                      ? `Transmis le ${docsTransmis[doc.key]}`
                      : "Marquer transmis"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Résumé automatique */}
        {(missingDocs.length > 0 || transmittedDocs.length > 0) && (
          <>
            <div className="space-y-2">
              {missingDocs.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-destructive">
                      {missingDocs.length} pièce{missingDocs.length > 1 ? "s" : ""} manquante{missingDocs.length > 1 ? "s" : ""}
                    </p>
                    <ul className="text-xs text-destructive/80 mt-1 list-disc list-inside">
                      {missingDocs.map((d) => (
                        <li key={d.key}>{d.label}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {transmittedDocs.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      {transmittedDocs.length}/{DOCUMENTS.length} pièce{transmittedDocs.length > 1 ? "s" : ""} transmise{transmittedDocs.length > 1 ? "s" : ""} au notaire
                    </p>
                  </div>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Notaire */}
        <div>
          <p className="text-sm font-semibold mb-2">Informations du notaire</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nom</Label>
              <Input value={notaireName} onChange={(e) => setNotaireName(e.target.value)} placeholder="Me Kouassi" />
            </div>
            <div>
              <Label className="text-xs">Téléphone</Label>
              <Input value={notairePhone} onChange={(e) => setNotairePhone(e.target.value)} placeholder="+225..." />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={notaireEmail} onChange={(e) => setNotaireEmail(e.target.value)} type="email" />
            </div>
            <div>
              <Label className="text-xs">Adresse</Label>
              <Input value={notaireAddress} onChange={(e) => setNotaireAddress(e.target.value)} />
            </div>
          </div>
          {notaireEmail && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleSendChecklist}
              disabled={sendingEmail}
            >
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Envoyer la checklist au notaire
            </Button>
          )}
        </div>

        <Separator />

        {/* Coûts */}
        <div>
          <p className="text-sm font-semibold mb-2">Coûts et frais</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Droits d'enregistrement (7%)</Label>
              <Input type="number" value={droitsEnregistrement} onChange={(e) => setDroitsEnregistrement(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Taxe de publicité (1,2%)</Label>
              <Input type="number" value={taxePublicite} onChange={(e) => setTaxePublicite(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Frais fixes</Label>
              <Input type="number" value={fraisFixes} onChange={(e) => setFraisFixes(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Frais notariaux</Label>
              <Input type="number" value={fraisNotariaux} onChange={(e) => setFraisNotariaux(Number(e.target.value))} />
            </div>
          </div>
          <p className="text-sm font-medium mt-2">Total : {totalCosts.toLocaleString("fr-FR")} FCFA</p>
        </div>

        <Separator />

        {/* Dates clés */}
        <div>
          <p className="text-sm font-semibold mb-2">Dates clés</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Acte signé</Label>
              <Input type="date" value={dateActe} onChange={(e) => setDateActe(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Dépôt notaire</Label>
              <Input type="date" value={dateDepot} onChange={(e) => setDateDepot(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Mutation enregistrée</Label>
              <Input type="date" value={dateMutation} onChange={(e) => setDateMutation(e.target.value)} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Notes */}
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <Button onClick={handleSave} className="w-full" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer les modifications
        </Button>
      </DialogContent>
    </Dialog>
  );
}
