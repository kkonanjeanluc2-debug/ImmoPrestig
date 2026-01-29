import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcquereurs, useCreateAcquereur } from "@/hooks/useAcquereurs";
import { useCreateVenteImmobiliere } from "@/hooks/useVentesImmobilieres";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import type { BienVente } from "@/hooks/useBiensVente";

interface SellBienDialogProps {
  bien: BienVente;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SellBienDialog({ bien, open, onOpenChange }: SellBienDialogProps) {
  const [acquereurId, setAcquereurId] = useState("");
  const [showNewAcquereur, setShowNewAcquereur] = useState(false);
  const [newAcquereurName, setNewAcquereurName] = useState("");
  const [newAcquereurPhone, setNewAcquereurPhone] = useState("");
  const [newAcquereurEmail, setNewAcquereurEmail] = useState("");
  const [newAcquereurAddress, setNewAcquereurAddress] = useState("");
  const [newAcquereurProfession, setNewAcquereurProfession] = useState("");
  const [newAcquereurCni, setNewAcquereurCni] = useState("");
  const [totalPrice, setTotalPrice] = useState(bien.price.toString());
  const [paymentType, setPaymentType] = useState<"comptant" | "echelonne">("comptant");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("");
  const [notes, setNotes] = useState("");

  const { data: acquereurs } = useAcquereurs();
  const { data: agency } = useAgency();
  const createAcquereur = useCreateAcquereur();
  const createVente = useCreateVenteImmobiliere();

  const depositPercentage = agency?.reservation_deposit_percentage || 30;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalAcquereurId = acquereurId;

    // Create new acquereur if needed
    if (showNewAcquereur) {
      if (!newAcquereurName) {
        toast.error("Le nom de l'acquéreur est obligatoire");
        return;
      }
      try {
        const newAcquereur = await createAcquereur.mutateAsync({
          name: newAcquereurName,
          phone: newAcquereurPhone || null,
          email: newAcquereurEmail || null,
          address: newAcquereurAddress || null,
          profession: newAcquereurProfession || null,
          cni_number: newAcquereurCni || null,
        });
        finalAcquereurId = newAcquereur.id;
      } catch (error) {
        toast.error("Erreur lors de la création de l'acquéreur");
        return;
      }
    }

    if (!finalAcquereurId) {
      toast.error("Veuillez sélectionner ou créer un acquéreur");
      return;
    }

    try {
      await createVente.mutateAsync({
        bien_id: bien.id,
        acquereur_id: finalAcquereurId,
        total_price: parseFloat(totalPrice),
        payment_type: paymentType,
        payment_method: paymentMethod || null,
        down_payment: downPayment ? parseFloat(downPayment) : null,
        monthly_payment: paymentType === "echelonne" && monthlyPayment ? parseFloat(monthlyPayment) : null,
        total_installments: paymentType === "echelonne" && totalInstallments ? parseInt(totalInstallments) : null,
        notes: notes || null,
      });

      toast.success("Vente enregistrée avec succès");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement de la vente");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vendre : {bien.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Acquereur Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Acquéreur</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewAcquereur(!showNewAcquereur)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {showNewAcquereur ? "Sélectionner existant" : "Nouvel acquéreur"}
              </Button>
            </div>

            {showNewAcquereur ? (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="col-span-2">
                  <Label>Nom complet *</Label>
                  <Input
                    value={newAcquereurName}
                    onChange={(e) => setNewAcquereurName(e.target.value)}
                    placeholder="Nom de l'acquéreur"
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={newAcquereurPhone}
                    onChange={(e) => setNewAcquereurPhone(e.target.value)}
                    placeholder="+225..."
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newAcquereurEmail}
                    onChange={(e) => setNewAcquereurEmail(e.target.value)}
                    placeholder="email@exemple.com"
                  />
                </div>
                <div>
                  <Label>N° CNI</Label>
                  <Input
                    value={newAcquereurCni}
                    onChange={(e) => setNewAcquereurCni(e.target.value)}
                    placeholder="Numéro CNI"
                  />
                </div>
                <div>
                  <Label>Profession</Label>
                  <Input
                    value={newAcquereurProfession}
                    onChange={(e) => setNewAcquereurProfession(e.target.value)}
                    placeholder="Profession"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Adresse</Label>
                  <Input
                    value={newAcquereurAddress}
                    onChange={(e) => setNewAcquereurAddress(e.target.value)}
                    placeholder="Adresse complète"
                  />
                </div>
              </div>
            ) : (
              <Select value={acquereurId} onValueChange={setAcquereurId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un acquéreur" />
                </SelectTrigger>
                <SelectContent>
                  {acquereurs?.map((acq) => (
                    <SelectItem key={acq.id} value={acq.id}>
                      {acq.name} {acq.phone && `- ${acq.phone}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Payment Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Modalités de paiement</Label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prix total (FCFA) *</Label>
                <Input
                  type="number"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                />
              </div>

              <div>
                <Label>Type de paiement</Label>
                <Select value={paymentType} onValueChange={(v) => setPaymentType(v as "comptant" | "echelonne")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comptant">Comptant</SelectItem>
                    <SelectItem value="echelonne">Échelonné</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mode de paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="virement">Virement bancaire</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentType === "echelonne" && (
                <>
                  <div>
                    <Label>Acompte (FCFA)</Label>
                    <Input
                      type="number"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      placeholder={`${depositPercentage}% = ${Math.round(parseFloat(totalPrice || "0") * depositPercentage / 100)}`}
                    />
                  </div>

                  <div>
                    <Label>Mensualité (FCFA)</Label>
                    <Input
                      type="number"
                      value={monthlyPayment}
                      onChange={(e) => setMonthlyPayment(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Nombre d'échéances</Label>
                    <Input
                      type="number"
                      value={totalInstallments}
                      onChange={(e) => setTotalInstallments(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes additionnelles..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createVente.isPending || createAcquereur.isPending}>
              {(createVente.isPending || createAcquereur.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Enregistrer la vente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
