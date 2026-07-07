import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Banknote, CheckCircle2, ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useClientsAcheteurs, type ClientAcheteur } from "@/hooks/useClientsAcheteurs";
import { useCreateReservation, MODE_FINANCEMENT_LABELS, type ModeFinancement } from "@/hooks/useReservationsLots";
import { genererEcheancierVEFA } from "@/hooks/useAppelsDeFonds";
import { ClientFormDialog } from "./ClientFormDialog";
import type { LotProgramme } from "@/hooks/usePromotionsImmobilieres";

const fmt = (n: number) => n.toLocaleString("fr-FR");

function genNumeroContrat(commune: string): string {
  const annee = new Date().getFullYear();
  const mois = String(new Date().getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  const prefix = commune.substring(0, 3).toUpperCase().replace(/\s/g, "");
  return `CR-${prefix}-${annee}${mois}-${rand}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: LotProgramme;
  programmeId: string;
  programmeCommune?: string;
}

type Step = 1 | 2 | 3;

export function ReservationForm({ open, onOpenChange, lot, programmeId, programmeCommune = "" }: Props) {
  const { data: clients = [] } = useClientsAcheteurs();
  const createReservation = useCreateReservation();

  const [step, setStep] = useState<Step>(1);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);

  const [fin, setFin] = useState({
    prix_vente_fcfa: String(lot.prix_fcfa),
    depot_garantie: "",
    mode_financement: "comptant" as ModeFinancement,
    banque_financement: "",
    notaire_nom: "",
    notaire_contact: "",
    observations: "",
    date_reservation: new Date().toISOString().split("T")[0],
  });

  const filteredClients = clients.filter(
    (c) =>
      c.nom.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.prenoms.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.telephone.includes(clientSearch)
  );

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const prixVente = parseInt(fin.prix_vente_fcfa) || 0;
  const depot = parseInt(fin.depot_garantie) || 0;

  const handleClientCreated = (client: ClientAcheteur) => {
    setSelectedClientId(client.id);
  };

  const handleSubmit = async () => {
    try {
      const clientId = selectedClientId;
      if (!clientId) { toast.error("Veuillez sélectionner ou créer un client"); return; }

      const reservation = await createReservation.mutateAsync({
        programme_id: programmeId,
        lot_id: lot.id,
        client_id: clientId,
        statut: "en_cours",
        date_reservation: fin.date_reservation,
        montant_depot_garantie_fcfa: depot,
        date_versement_depot: null,
        depot_verse: false,
        compte_sequestre: null,
        prix_vente_fcfa: prixVente,
        mode_financement: fin.mode_financement,
        banque_financement: fin.banque_financement.trim() || null,
        date_fin_retractation: null,
        date_signature_acte_prevue: null,
        date_signature_acte_effective: null,
        notaire_nom: fin.notaire_nom.trim() || null,
        notaire_contact: fin.notaire_contact.trim() || null,
        numero_contrat_reservation: genNumeroContrat(programmeCommune),
        numero_acte_vente: null,
        observations: fin.observations.trim() || null,
      });

      await genererEcheancierVEFA(reservation.id, prixVente);

      toast.success(`Réservation créée · N° ${reservation.numero_contrat_reservation}`);
      onOpenChange(false);
      setStep(1);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la création");
    }
  };

  const isPending = createReservation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réserver — {lot.reference_lot}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-4">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                s === step ? "bg-primary text-primary-foreground" : s < step ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>{s < step ? "✓" : s}</div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {s === 1 ? "Client" : s === 2 ? "Conditions" : "Validation"}
              </span>
              {s < 3 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Étape 1 — Client */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Rechercher par nom ou téléphone..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowClientForm(true)}>
                <UserPlus className="h-4 w-4 mr-1" /> Nouveau
              </Button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 border rounded-lg p-2">
              {filteredClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun client trouvé · Cliquez "Nouveau" pour en créer un
                </p>
              ) : (
                filteredClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedClientId(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedClientId === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{c.nom} {c.prenoms}</div>
                    <div className="text-xs opacity-70">{c.telephone}{c.email ? ` · ${c.email}` : ""}</div>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!selectedClientId}>
                Suivant <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Étape 2 — Conditions financières */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Prix de vente (F CFA) *</Label>
                <Input type="number" min="0" value={fin.prix_vente_fcfa}
                  onChange={(e) => setFin({ ...fin, prix_vente_fcfa: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Dépôt de garantie (F CFA)</Label>
                <Input type="number" min="0" value={fin.depot_garantie}
                  onChange={(e) => setFin({ ...fin, depot_garantie: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date de réservation</Label>
                <Input type="date" value={fin.date_reservation}
                  onChange={(e) => setFin({ ...fin, date_reservation: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Mode de financement</Label>
                <Select value={fin.mode_financement} onValueChange={(v) => setFin({ ...fin, mode_financement: v as ModeFinancement })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(MODE_FINANCEMENT_LABELS) as [ModeFinancement, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(fin.mode_financement === "credit_bancaire" || fin.mode_financement === "mixte") && (
                <div className="col-span-2 space-y-1.5">
                  <Label>Banque de financement</Label>
                  <Input value={fin.banque_financement} onChange={(e) => setFin({ ...fin, banque_financement: e.target.value })} placeholder="SGBCI, BICICI..." />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Notaire</Label>
                <Input value={fin.notaire_nom} onChange={(e) => setFin({ ...fin, notaire_nom: e.target.value })} placeholder="Me Kouadio..." />
              </div>
              <div className="space-y-1.5">
                <Label>Contact notaire</Label>
                <Input value={fin.notaire_contact} onChange={(e) => setFin({ ...fin, notaire_contact: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Observations</Label>
                <Textarea value={fin.observations} onChange={(e) => setFin({ ...fin, observations: e.target.value })} rows={2} />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button onClick={() => setStep(3)} disabled={!fin.prix_vente_fcfa}>
                Suivant <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Étape 3 — Récapitulatif */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lot</span>
                <span className="font-medium">{lot.reference_lot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">
                  {selectedClient ? `${selectedClient.nom} ${selectedClient.prenoms}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix de vente</span>
                <span className="font-semibold text-primary">{fmt(prixVente)} F CFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dépôt de garantie</span>
                <span>{depot > 0 ? `${fmt(depot)} F CFA` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode de financement</span>
                <span>{MODE_FINANCEMENT_LABELS[fin.mode_financement]}</span>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
              <div className="font-medium text-blue-700 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                Échéancier VEFA généré automatiquement
              </div>
              <p className="text-blue-600 text-xs">5 appels de fonds (5% → 35% → 70% → 95% → 100%) seront créés.</p>
            </div>

            <div className="text-xs text-muted-foreground">
              Un numéro de contrat sera généré automatiquement. Délai de rétractation légal : 10 jours.
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button onClick={handleSubmit} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Banknote className="h-4 w-4 mr-2" />
                Valider la réservation
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      <ClientFormDialog
        open={showClientForm}
        onOpenChange={setShowClientForm}
        onCreated={handleClientCreated}
      />
    </Dialog>
  );
}
