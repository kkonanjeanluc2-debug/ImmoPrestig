import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Loader2, User, CreditCard, Banknote, Smartphone, Building2, CheckCircle2 } from "lucide-react";
import { Parcelle } from "@/hooks/useParcelles";
import { ParcelleProspect, useUpdateParcelleProspect } from "@/hooks/useParcelleProspects";
import { useCreateAcquereur } from "@/hooks/useAcquereurs";
import { useCreateVenteParcelle, PaymentType } from "@/hooks/useVentesParcelles";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ConvertProspectDialogProps {
  prospect: ParcelleProspect;
  parcelle: Parcelle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConvertProspectDialog({ prospect, parcelle, open, onOpenChange }: ConvertProspectDialogProps) {
  const { user } = useAuth();
  const { data: assignableUsers } = useAssignableUsers();
  const createAcquereur = useCreateAcquereur();
  const createVente = useCreateVenteParcelle();
  const updateProspect = useUpdateParcelleProspect();

  // Pre-fill buyer info from prospect
  const [buyerInfo, setBuyerInfo] = useState({
    name: prospect.name || "",
    phone: prospect.phone || "",
    email: prospect.email || "",
    cni_number: "",
    address: "",
    birth_date: "",
    birth_place: "",
    profession: "",
  });

  const [paymentType, setPaymentType] = useState<PaymentType>("comptant");
  const [paymentMethod, setPaymentMethod] = useState<string>("especes");
  const [downPayment, setDownPayment] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("12");
  const [salePrice, setSalePrice] = useState(parcelle?.price?.toString() || "0");
  const [soldBy, setSoldBy] = useState<string>((parcelle as any)?.assigned_to || user?.id || "");

  // Reset form when prospect changes
  useEffect(() => {
    setBuyerInfo({
      name: prospect.name || "",
      phone: prospect.phone || "",
      email: prospect.email || "",
      cni_number: "",
      address: "",
      birth_date: "",
      birth_place: "",
      profession: "",
    });
    setSalePrice(parcelle?.price?.toString() || "0");
  }, [prospect, parcelle]);

  const monthlyPayment = useMemo(() => {
    if (paymentType !== "echelonne") return 0;
    const total = parseFloat(salePrice) || 0;
    const down = parseFloat(downPayment) || 0;
    const installments = parseInt(totalInstallments) || 1;
    return Math.ceil((total - down) / installments);
  }, [salePrice, downPayment, totalInstallments, paymentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!buyerInfo.name.trim()) {
      toast.error("Le nom de l'acquéreur est obligatoire");
      return;
    }

    try {
      // 1. Create the acquéreur from prospect data
      const createdAcquereur = await createAcquereur.mutateAsync({
        name: buyerInfo.name.trim(),
        phone: buyerInfo.phone.trim() || null,
        email: buyerInfo.email.trim() || null,
        cni_number: buyerInfo.cni_number.trim() || null,
        address: buyerInfo.address.trim() || null,
        birth_date: buyerInfo.birth_date || null,
        birth_place: buyerInfo.birth_place.trim() || null,
        profession: buyerInfo.profession.trim() || null,
      });

      // 2. Create the sale
      await createVente.mutateAsync({
        parcelle_id: parcelle.id,
        acquereur_id: createdAcquereur.id,
        total_price: parseFloat(salePrice),
        payment_type: paymentType,
        payment_method: paymentMethod,
        down_payment: paymentType === "echelonne" ? parseFloat(downPayment) || 0 : null,
        monthly_payment: paymentType === "echelonne" ? monthlyPayment : null,
        total_installments: paymentType === "echelonne" ? parseInt(totalInstallments) : null,
        sold_by: soldBy || null,
      });

      // 3. Update prospect status to "converti"
      await updateProspect.mutateAsync({
        id: prospect.id,
        status: "converti",
      });

      toast.success("Prospect converti en vente avec succès !");
      onOpenChange(false);
    } catch (error) {
      console.error("Error converting prospect:", error);
      toast.error("Erreur lors de la conversion du prospect");
    }
  };

  const isLoading = createAcquereur.isPending || createVente.isPending || updateProspect.isPending;

  if (!parcelle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Convertir le prospect en vente
          </DialogTitle>
          <DialogDescription>
            Parcelle {parcelle.plot_number} • {prospect.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Buyer Information (pre-filled from prospect) */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Informations acquéreur</Label>
            <div className="grid gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Nom complet *</Label>
                  <Input
                    id="name"
                    value={buyerInfo.name}
                    onChange={(e) => setBuyerInfo({ ...buyerInfo, name: e.target.value })}
                    placeholder="Kouassi Jean"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={buyerInfo.phone}
                    onChange={(e) => setBuyerInfo({ ...buyerInfo, phone: e.target.value })}
                    placeholder="+2250701020304"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={buyerInfo.email}
                    onChange={(e) => setBuyerInfo({ ...buyerInfo, email: e.target.value })}
                    placeholder="email@exemple.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cni">N° CNI</Label>
                  <Input
                    id="cni"
                    value={buyerInfo.cni_number}
                    onChange={(e) => setBuyerInfo({ ...buyerInfo, cni_number: e.target.value })}
                    placeholder="CI00123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    value={buyerInfo.profession}
                    onChange={(e) => setBuyerInfo({ ...buyerInfo, profession: e.target.value })}
                    placeholder="Commerçant"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Date de naissance</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={buyerInfo.birth_date}
                    onChange={(e) => setBuyerInfo({ ...buyerInfo, birth_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_place">Lieu de naissance</Label>
                  <Input
                    id="birth_place"
                    value={buyerInfo.birth_place}
                    onChange={(e) => setBuyerInfo({ ...buyerInfo, birth_place: e.target.value })}
                    placeholder="Abidjan"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={buyerInfo.address}
                    onChange={(e) => setBuyerInfo({ ...buyerInfo, address: e.target.value })}
                    placeholder="Cocody, Abidjan"
                  />
                </div>
              </div>
            </div>
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
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Valider la vente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
