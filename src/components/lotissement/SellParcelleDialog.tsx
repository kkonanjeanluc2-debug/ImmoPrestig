import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, User, CreditCard, Banknote, Smartphone, Building2 } from "lucide-react";
import { Parcelle } from "@/hooks/useParcelles";
import { useAcquereurs, useCreateAcquereur } from "@/hooks/useAcquereurs";
import { useCreateVenteParcelle, PaymentType } from "@/hooks/useVentesParcelles";
import { useUpdateReservationParcelle } from "@/hooks/useReservationsParcelles";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SellParcelleDialogProps {
  parcelle: Parcelle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId?: string;
  defaultAcquereurId?: string;
  defaultDownPayment?: number;
}

export function SellParcelleDialog({ parcelle, open, onOpenChange, reservationId, defaultAcquereurId, defaultDownPayment }: SellParcelleDialogProps) {
  const { user } = useAuth();
  const { data: acquereurs } = useAcquereurs();
  const { data: assignableUsers } = useAssignableUsers();
  const createAcquereur = useCreateAcquereur();
  const createVente = useCreateVenteParcelle();
  const updateReservation = useUpdateReservationParcelle();

  const [mode, setMode] = useState<"existing" | "new">(defaultAcquereurId ? "existing" : "existing");
  const [acquereurId, setAcquereurId] = useState(defaultAcquereurId || "");
  const [newAcquereur, setNewAcquereur] = useState({
    name: "",
    phone: "",
    email: "",
    cni_number: "",
    address: "",
    birth_date: "",
    birth_place: "",
    profession: "",
  });
  const [paymentType, setPaymentType] = useState<PaymentType>("comptant");
  const [paymentMethod, setPaymentMethod] = useState<string>("especes");
  const [downPayment, setDownPayment] = useState(defaultDownPayment ? defaultDownPayment.toString() : "");
  const [totalInstallments, setTotalInstallments] = useState("12");
  const [salePrice, setSalePrice] = useState(parcelle.price.toString());
  const [soldBy, setSoldBy] = useState<string>((parcelle as any).assigned_to || user?.id || "");

  const monthlyPayment = useMemo(() => {
    if (paymentType !== "echelonne") return 0;
    const total = parseFloat(salePrice) || 0;
    const down = parseFloat(downPayment) || 0;
    const installments = parseInt(totalInstallments) || 1;
    return Math.ceil((total - down) / installments);
  }, [salePrice, downPayment, totalInstallments, paymentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let buyerId = acquereurId;

    // Create new buyer if needed
    if (mode === "new") {
      if (!newAcquereur.name.trim()) {
        toast.error("Le nom de l'acquéreur est obligatoire");
        return;
      }

      // Check for duplicate acquéreur by name + phone or CNI
      const nameTrimmed = newAcquereur.name.trim().toLowerCase();
      const phoneTrimmed = newAcquereur.phone.trim();
      const cniTrimmed = newAcquereur.cni_number.trim();
      
      const duplicate = acquereurs?.find(a => {
        const nameMatch = a.name.toLowerCase() === nameTrimmed;
        const phoneMatch = phoneTrimmed && a.phone && a.phone === phoneTrimmed;
        const cniMatch = cniTrimmed && a.cni_number && a.cni_number.toLowerCase() === cniTrimmed.toLowerCase();
        return nameMatch || phoneMatch || cniMatch;
      });

      if (duplicate) {
        const matchInfo = duplicate.name.toLowerCase() === nameTrimmed 
          ? `nom "${duplicate.name}"` 
          : duplicate.phone === phoneTrimmed 
            ? `téléphone "${duplicate.phone}"`
            : `CNI "${duplicate.cni_number}"`;
        toast.error(`Un acquéreur avec le même ${matchInfo} existe déjà. Veuillez le sélectionner dans la liste.`);
        return;
      }

      try {
        const created = await createAcquereur.mutateAsync({
          name: newAcquereur.name.trim(),
          phone: phoneTrimmed || null,
          email: newAcquereur.email.trim() || null,
          cni_number: cniTrimmed || null,
          address: newAcquereur.address.trim() || null,
          birth_date: newAcquereur.birth_date || null,
          birth_place: newAcquereur.birth_place.trim() || null,
          profession: newAcquereur.profession.trim() || null,
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

    try {
      const vente = await createVente.mutateAsync({
        parcelle_id: parcelle.id,
        acquereur_id: buyerId,
        total_price: parseFloat(salePrice),
        payment_type: paymentType,
        payment_method: paymentMethod,
        down_payment: paymentType === "echelonne" ? parseFloat(downPayment) || 0 : null,
        monthly_payment: paymentType === "echelonne" ? monthlyPayment : null,
        total_installments: paymentType === "echelonne" ? parseInt(totalInstallments) : null,
        sold_by: soldBy || null,
      });

      // Mark reservation as converted if this sale comes from a reservation
      if (reservationId) {
        await updateReservation.mutateAsync({
          id: reservationId,
          status: "converted",
          converted_vente_id: vente.id,
        });
      }

      toast.success("Vente enregistrée avec succès");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de l'enregistrement de la vente");
    }
  };

  const isLoading = createAcquereur.isPending || createVente.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vendre la parcelle {parcelle.plot_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Buyer Selection */}
          <div className="space-y-4">
            <Label>Acquéreur</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "existing" | "new")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="cursor-pointer">
                  Existant
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="cursor-pointer">
                  Nouveau
                </Label>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="name">Nom complet *</Label>
                    <Input
                      id="name"
                      value={newAcquereur.name}
                      onChange={(e) => setNewAcquereur({ ...newAcquereur, name: e.target.value })}
                      placeholder="Kouassi Jean"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={newAcquereur.phone}
                      onChange={(e) => setNewAcquereur({ ...newAcquereur, phone: e.target.value })}
                      placeholder="+2250701020304"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newAcquereur.email}
                      onChange={(e) => setNewAcquereur({ ...newAcquereur, email: e.target.value })}
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cni">N° CNI</Label>
                    <Input
                      id="cni"
                      value={newAcquereur.cni_number}
                      onChange={(e) => setNewAcquereur({ ...newAcquereur, cni_number: e.target.value })}
                      placeholder="CI00123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profession">Profession</Label>
                    <Input
                      id="profession"
                      value={newAcquereur.profession}
                      onChange={(e) => setNewAcquereur({ ...newAcquereur, profession: e.target.value })}
                      placeholder="Commerçant"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Date de naissance</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={newAcquereur.birth_date}
                      onChange={(e) => setNewAcquereur({ ...newAcquereur, birth_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_place">Lieu de naissance</Label>
                    <Input
                      id="birth_place"
                      value={newAcquereur.birth_place}
                      onChange={(e) => setNewAcquereur({ ...newAcquereur, birth_place: e.target.value })}
                      placeholder="Abidjan"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      value={newAcquereur.address}
                      onChange={(e) => setNewAcquereur({ ...newAcquereur, address: e.target.value })}
                      placeholder="Cocody, Abidjan"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sale Price */}
          <div className="space-y-2">
            <Label htmlFor="salePrice">Prix de vente (F CFA)</Label>
            <Input
              id="salePrice"
              type="number"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>

          {/* Payment Type */}
          <div className="space-y-4">
            <Label>Type de paiement</Label>
            <RadioGroup
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as PaymentType)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="comptant" id="comptant" />
                <Label htmlFor="comptant" className="cursor-pointer">
                  Comptant
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="echelonne" id="echelonne" />
                <Label htmlFor="echelonne" className="cursor-pointer">
                  Échelonné
                </Label>
              </div>
            </RadioGroup>

            {paymentType === "echelonne" && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="downPayment">Apport initial (F CFA)</Label>
                  <Input
                    id="downPayment"
                    type="number"
                    min="0"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installments">Nombre de mensualités</Label>
                  <Input
                    id="installments"
                    type="number"
                    min="1"
                    max="60"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                  />
                </div>
                <div className="col-span-2 p-2 bg-primary/10 rounded text-center">
                  <p className="text-sm text-muted-foreground">Mensualité</p>
                  <p className="text-lg font-bold text-primary">
                    {monthlyPayment.toLocaleString("fr-FR")} F CFA
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Moyen de paiement</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un moyen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="especes">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Espèces
                  </div>
                </SelectItem>
                <SelectItem value="virement">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Virement bancaire
                  </div>
                </SelectItem>
                <SelectItem value="mobile_money">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Mobile Money
                  </div>
                </SelectItem>
                <SelectItem value="cheque">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Chèque
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Salesperson Assignment */}
          {assignableUsers && assignableUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Commercial responsable</Label>
              <Select value={soldBy} onValueChange={setSoldBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un commercial" />
                </SelectTrigger>
                <SelectContent>
                  {assignableUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {user.full_name || user.email} ({user.role})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cette vente sera comptabilisée pour ce commercial
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmer la vente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
