import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, User, Banknote, Building2, Smartphone, CreditCard } from "lucide-react";
import { Parcelle } from "@/hooks/useParcelles";
import { useAcquereurs, useCreateAcquereur } from "@/hooks/useAcquereurs";
import { useCreateReservationParcelle } from "@/hooks/useReservationsParcelles";
import { toast } from "sonner";

interface ReserveParcelleDialogProps {
  parcelle: Parcelle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReserveParcelleDialog({ parcelle, open, onOpenChange }: ReserveParcelleDialogProps) {
  const { data: acquereurs } = useAcquereurs();
  const createAcquereur = useCreateAcquereur();
  const createReservation = useCreateReservationParcelle();

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [acquereurId, setAcquereurId] = useState("");
  const [newAcquereur, setNewAcquereur] = useState({ name: "", phone: "", email: "" });
  const [depositAmount, setDepositAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [validityDays, setValidityDays] = useState("30");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let buyerId = acquereurId;

    if (mode === "new") {
      if (!newAcquereur.name.trim()) {
        toast.error("Le nom est obligatoire");
        return;
      }
      try {
        const created = await createAcquereur.mutateAsync({
          name: newAcquereur.name.trim(),
          phone: newAcquereur.phone.trim() || null,
          email: newAcquereur.email.trim() || null,
        });
        buyerId = created.id;
      } catch {
        toast.error("Erreur lors de la création de l'acquéreur");
        return;
      }
    }

    if (!buyerId) {
      toast.error("Veuillez sélectionner ou créer un acquéreur");
      return;
    }

    const days = parseInt(validityDays) || 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    try {
      await createReservation.mutateAsync({
        parcelle_id: parcelle.id,
        acquereur_id: buyerId,
        deposit_amount: parseFloat(depositAmount) || 0,
        payment_method: paymentMethod,
        validity_days: days,
        expiry_date: expiryDate.toISOString().split("T")[0],
        notes: notes.trim() || null,
      });
      toast.success("Réservation enregistrée avec succès");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la réservation");
    }
  };

  const isLoading = createAcquereur.isPending || createReservation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réserver la parcelle {parcelle.plot_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Acquéreur */}
          <div className="space-y-3">
            <Label>Acquéreur</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "existing" | "new")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="existing" id="res-existing" />
                <Label htmlFor="res-existing" className="cursor-pointer">Existant</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="new" id="res-new" />
                <Label htmlFor="res-new" className="cursor-pointer">Nouveau</Label>
              </div>
            </RadioGroup>

            {mode === "existing" ? (
              <Select value={acquereurId} onValueChange={setAcquereurId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un acquéreur" />
                </SelectTrigger>
                <SelectContent>
                  {acquereurs?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {a.name} {a.phone && `(${a.phone})`}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label>Nom complet *</Label>
                  <Input
                    value={newAcquereur.name}
                    onChange={(e) => setNewAcquereur({ ...newAcquereur, name: e.target.value })}
                    placeholder="Kouassi Jean"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input
                      value={newAcquereur.phone}
                      onChange={(e) => setNewAcquereur({ ...newAcquereur, phone: e.target.value })}
                      placeholder="+2250701020304"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newAcquereur.email}
                      onChange={(e) => setNewAcquereur({ ...newAcquereur, email: e.target.value })}
                      placeholder="email@exemple.com"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Montant de l'acompte */}
          <div className="space-y-2">
            <Label>Acompte de réservation (F CFA)</Label>
            <Input
              type="number"
              min="0"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Moyen de paiement */}
          <div className="space-y-2">
            <Label>Moyen de paiement</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="especes">
                  <div className="flex items-center gap-2"><Banknote className="h-4 w-4" />Espèces</div>
                </SelectItem>
                <SelectItem value="virement">
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />Virement</div>
                </SelectItem>
                <SelectItem value="mobile_money">
                  <div className="flex items-center gap-2"><Smartphone className="h-4 w-4" />Mobile Money</div>
                </SelectItem>
                <SelectItem value="cheque">
                  <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Chèque</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Durée de validité */}
          <div className="space-y-2">
            <Label>Durée de validité (jours)</Label>
            <Input
              type="number"
              min="1"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations complémentaires..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmer la réservation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
