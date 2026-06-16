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
import { Loader2, User, CreditCard, Banknote, Smartphone, Building2, CheckCircle2, TrendingUp, Calendar } from "lucide-react";
import { Parcelle } from "@/hooks/useParcelles";
import { ParcelleProspect, useUpdateParcelleProspect } from "@/hooks/useParcelleProspects";
import { useCreateAcquereur, IdType } from "@/hooks/useAcquereurs";
import { useCreateVenteParcelle, PaymentType } from "@/hooks/useVentesParcelles";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ID_TYPE_LABELS: Record<IdType, string> = {
  cni: "Carte Nationale d'Identité",
  passeport: "Passeport",
  permis: "Permis de conduire",
  extrait: "Extrait de naissance",
  carte_consulaire: "Carte consulaire",
};

const ID_TYPE_PLACEHOLDERS: Record<IdType, string> = {
  cni: "CI00123456789",
  passeport: "A12345678",
  permis: "123456789",
  extrait: "EXT-123456",
  carte_consulaire: "CC-123456",
};

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

  const [buyerInfo, setBuyerInfo] = useState({
    name: prospect.name || "",
    phone: prospect.phone || "",
    email: prospect.email || "",
    id_type: "cni" as IdType,
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
  const [nextFollowupDate, setNextFollowupDate] = useState(prospect.next_followup_date?.split("T")[0] || "");

  useEffect(() => {
    setBuyerInfo({
      name: prospect.name || "",
      phone: prospect.phone || "",
      email: prospect.email || "",
      id_type: "cni",
      cni_number: "",
      address: "",
      birth_date: "",
      birth_place: "",
      profession: "",
    });
    setSalePrice(parcelle?.price?.toString() || "0");
    setNextFollowupDate(prospect.next_followup_date?.split("T")[0] || "");
  }, [prospect, parcelle]);

  const monthlyPayment = useMemo(() => {
    if (paymentType !== "echelonne") return 0;
    const total = parseFloat(salePrice) || 0;
    const down = parseFloat(downPayment) || 0;
    const installments = parseInt(totalInstallments) || 1;
    return Math.ceil((total - down) / installments);
  }, [salePrice, downPayment, totalInstallments, paymentType]);

  const hasBudget = prospect.budget_min != null || prospect.budget_max != null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!buyerInfo.name.trim()) {
      toast.error("Le nom de l'acquéreur est obligatoire");
      return;
    }

    try {
      const createdAcquereur = await createAcquereur.mutateAsync({
        name: buyerInfo.name.trim(),
        phone: buyerInfo.phone.trim() || null,
        email: buyerInfo.email.trim() || null,
        id_type: buyerInfo.id_type || null,
        cni_number: buyerInfo.cni_number.trim() || null,
        address: buyerInfo.address.trim() || null,
        birth_date: buyerInfo.birth_date || null,
        birth_place: buyerInfo.birth_place.trim() || null,
        profession: buyerInfo.profession.trim() || null,
      });

      await createVente.mutateAsync({
        parcelle_id: parcelle.id,
        acquereur_id: createdAcquereur.id,
        total_price: parseFloat(salePrice) || 0,
        payment_type: paymentType,
        payment_method: paymentMethod,
        sale_date: new Date().toISOString().split('T')[0],
        down_payment: paymentType === "echelonne" ? (parseFloat(downPayment) || 0) : undefined,
        monthly_payment: paymentType === "echelonne" ? monthlyPayment : undefined,
        total_installments: paymentType === "echelonne" ? (parseInt(totalInstallments) || 1) : undefined,
        sold_by: soldBy || undefined,
      });

      try {
        await updateProspect.mutateAsync({
          id: prospect.id,
          status: "converti" as any,
          next_followup_date: nextFollowupDate || null,
        });
      } catch (statusError) {
        console.warn("Could not update prospect status:", statusError);
      }

      toast.success("Prospect converti en vente avec succès !");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error converting prospect:", error);
      const message = error?.message || error?.error_description || "Erreur inconnue";
      toast.error(`Erreur lors de la conversion : ${message}`);
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
          {/* Budget du prospect */}
          {hasBudget && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <TrendingUp className="h-4 w-4 text-blue-600 shrink-0" />
              <div className="flex gap-4 text-sm">
                {prospect.budget_min != null && (
                  <span>
                    <span className="text-muted-foreground">Budget min : </span>
                    <span className="font-semibold text-blue-700">{prospect.budget_min.toLocaleString("fr-FR")} F</span>
                  </span>
                )}
                {prospect.budget_max != null && (
                  <span>
                    <span className="text-muted-foreground">Budget max : </span>
                    <span className="font-semibold text-blue-700">{prospect.budget_max.toLocaleString("fr-FR")} F</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Buyer Information */}
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

                {/* Type de pièce + Numéro */}
                <div className="col-span-2 space-y-2">
                  <Label>Pièce d'identité</Label>
                  <div className="flex gap-2">
                    <Select
                      value={buyerInfo.id_type}
                      onValueChange={(v) => setBuyerInfo({ ...buyerInfo, id_type: v as IdType })}
                    >
                      <SelectTrigger className="w-[180px] shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ID_TYPE_LABELS) as IdType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {ID_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={buyerInfo.cni_number}
                      onChange={(e) => setBuyerInfo({ ...buyerInfo, cni_number: e.target.value })}
                      placeholder={ID_TYPE_PLACEHOLDERS[buyerInfo.id_type]}
                      className="flex-1"
                    />
                  </div>
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
                <Label htmlFor="comptant" className="cursor-pointer">Comptant</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="echelonne" id="echelonne" />
                <Label htmlFor="echelonne" className="cursor-pointer">Échelonné</Label>
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
                    <Banknote className="h-4 w-4" />Espèces
                  </div>
                </SelectItem>
                <SelectItem value="virement">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />Virement bancaire
                  </div>
                </SelectItem>
                <SelectItem value="mobile_money">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />Mobile Money
                  </div>
                </SelectItem>
                <SelectItem value="cheque">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />Chèque
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
                  {assignableUsers.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {u.full_name || u.email} ({u.role})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Prochain suivi */}
          <div className="space-y-2">
            <Label htmlFor="nextFollowup" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date du prochain suivi
            </Label>
            <Input
              id="nextFollowup"
              type="date"
              value={nextFollowupDate}
              onChange={(e) => setNextFollowupDate(e.target.value)}
            />
          </div>

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
