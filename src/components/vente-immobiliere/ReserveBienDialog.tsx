import { useState, useEffect } from "react";
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
import { useUpdateBienVente } from "@/hooks/useBiensVente";
import { useCreateReservationVente } from "@/hooks/useReservationsVente";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import { Loader2, UserPlus, FileText } from "lucide-react";
import { generateContratReservationImmo } from "@/lib/generateVenteImmoPDF";
import type { BienVente } from "@/hooks/useBiensVente";

interface ReserveBienDialogProps {
  bien: BienVente;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReserveBienDialog({ bien, open, onOpenChange }: ReserveBienDialogProps) {
  const [acquereurId, setAcquereurId] = useState("");
  const [showNewAcquereur, setShowNewAcquereur] = useState(false);
  const [newAcquereurName, setNewAcquereurName] = useState("");
  const [newAcquereurPhone, setNewAcquereurPhone] = useState("");
  const [newAcquereurEmail, setNewAcquereurEmail] = useState("");
  const [newAcquereurAddress, setNewAcquereurAddress] = useState("");
  const [newAcquereurProfession, setNewAcquereurProfession] = useState("");
  const [newAcquereurCni, setNewAcquereurCni] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [validityDays, setValidityDays] = useState("30");
  const [notes, setNotes] = useState("");
  const [generateContract, setGenerateContract] = useState(true);

  const { data: acquereurs } = useAcquereurs();
  const { data: agency } = useAgency();
  const createAcquereur = useCreateAcquereur();
  const updateBien = useUpdateBienVente();
  const createReservation = useCreateReservationVente();

  const depositPercentage = agency?.reservation_deposit_percentage || 30;

  // Auto-calculate deposit when dialog opens
  useEffect(() => {
    if (open && !depositAmount) {
      setDepositAmount(Math.round(bien.price * depositPercentage / 100).toString());
    }
  }, [open, bien.price, depositPercentage, depositAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalAcquereurId = acquereurId;
    let acquereurData = acquereurs?.find(a => a.id === acquereurId);

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
        acquereurData = newAcquereur;
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
      const reservationDate = new Date();
      const expiryDate = new Date(reservationDate);
      expiryDate.setDate(expiryDate.getDate() + parseInt(validityDays));

      // Create reservation record
      await createReservation.mutateAsync({
        bien_id: bien.id,
        acquereur_id: finalAcquereurId,
        deposit_amount: parseFloat(depositAmount) || 0,
        payment_method: paymentMethod || null,
        reservation_date: reservationDate.toISOString().split("T")[0],
        validity_days: parseInt(validityDays) || 30,
        expiry_date: expiryDate.toISOString().split("T")[0],
        notes: notes || null,
      });

      // Update bien status to reserved
      await updateBien.mutateAsync({
        id: bien.id,
        status: "reserve" as any,
      });

      toast.success("Bien réservé avec succès");

      // Generate reservation contract PDF if requested
      if (generateContract && agency && acquereurData) {
        const doc = generateContratReservationImmo(
          {
            bien: {
              title: bien.title,
              address: bien.address,
              city: bien.city,
              property_type: bien.property_type,
              area: bien.area,
              price: bien.price,
            },
            acquereur: {
              name: acquereurData.name,
              address: acquereurData.address,
              cni_number: acquereurData.cni_number,
              phone: acquereurData.phone,
              birth_date: acquereurData.birth_date,
              birth_place: acquereurData.birth_place,
              profession: acquereurData.profession,
            },
            deposit_amount: parseFloat(depositAmount) || 0,
            payment_method: paymentMethod || null,
            reservation_date: new Date().toISOString(),
            notes: notes || null,
          },
          {
            name: agency.name,
            address: agency.address,
            phone: agency.phone,
            email: agency.email,
            siret: agency.siret,
            logo_url: agency.logo_url,
          },
          parseInt(validityDays) || 30
        );

        doc.save(`Contrat_Reservation_${bien.title.replace(/\s+/g, "_")}.pdf`);
        toast.success("Contrat de réservation généré");
      }

      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de la réservation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réserver : {bien.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Acquereur Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Acquéreur potentiel</Label>
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

          {/* Reservation Details */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Détails de la réservation</Label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Acompte de réservation (FCFA) *</Label>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder={`${depositPercentage}% du prix`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {depositPercentage}% du prix = {Math.round(bien.price * depositPercentage / 100).toLocaleString()} FCFA
                </p>
              </div>

              <div>
                <Label>Durée de validité</Label>
                <Select value={validityDays} onValueChange={setValidityDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="45">45 jours</SelectItem>
                    <SelectItem value="60">60 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Mode de paiement de l'acompte</Label>
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
            </div>
          </div>

          <div>
            <Label>Notes / Conditions particulières</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes ou conditions particulières..."
              rows={2}
            />
          </div>

          {/* Generate Contract Option */}
          <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
            <input
              type="checkbox"
              id="generateContract"
              checked={generateContract}
              onChange={(e) => setGenerateContract(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="generateContract" className="flex items-center gap-2 text-sm cursor-pointer">
              <FileText className="h-4 w-4" />
              Générer le contrat de réservation PDF
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateBien.isPending || createAcquereur.isPending || createReservation.isPending}>
              {(updateBien.isPending || createAcquereur.isPending || createReservation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Réserver le bien
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
