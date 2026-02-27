import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save } from "lucide-react";
import { useUpdateMutationAchat, type MutationAchat } from "@/hooks/useMutationsAchats";

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

  const [docs, setDocs] = useState({
    titre_propriete: mut.titre_propriete,
    pieces_identite: mut.pieces_identite,
    certificat_localisation: mut.certificat_localisation,
    etat_foncier: mut.etat_foncier,
    situation_fiscale: mut.situation_fiscale,
    quittances_paiement: mut.quittances_paiement,
  });

  const [droitsEnregistrement, setDroitsEnregistrement] = useState(mut.droits_enregistrement || 0);
  const [taxePublicite, setTaxePublicite] = useState(mut.taxe_publicite || 0);
  const [fraisFixes, setFraisFixes] = useState(mut.frais_fixes || 0);
  const [fraisNotariaux, setFraisNotariaux] = useState(mut.frais_notariaux || 0);

  const [dateActe, setDateActe] = useState(mut.date_acte_signe?.split("T")[0] || "");
  const [dateDepot, setDateDepot] = useState(mut.date_depot_notaire?.split("T")[0] || "");
  const [dateMutation, setDateMutation] = useState(mut.date_mutation_enregistree?.split("T")[0] || "");

  const totalCosts = droitsEnregistrement + taxePublicite + fraisFixes + fraisNotariaux;

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
      },
      { onSuccess: () => onOpenChange(false) }
    );
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

        {/* Documents requis */}
        <div>
          <p className="text-sm font-semibold mb-2">Pièces nécessaires</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DOCUMENTS.map((doc) => (
              <label key={doc.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={docs[doc.key]}
                  onCheckedChange={(v) => setDocs((prev) => ({ ...prev, [doc.key]: !!v }))}
                />
                {doc.label}
              </label>
            ))}
          </div>
        </div>

        <Separator />

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
