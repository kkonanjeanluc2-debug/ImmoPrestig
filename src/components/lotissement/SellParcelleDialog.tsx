import { useState, useMemo, useEffect } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Plus, User, CreditCard, Banknote, Smartphone, Building2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Parcelle } from "@/hooks/useParcelles";
import { useAcquereurs, useCreateAcquereur } from "@/hooks/useAcquereurs";
import { useCreateVenteParcelle, PaymentType } from "@/hooks/useVentesParcelles";
import { useUpdateReservationParcelle } from "@/hooks/useReservationsParcelles";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { usePrefinanceurs, useCreatePrefinanceur } from "@/hooks/usePrefinanceurs";
import { useLotissement, useUpdateLotissement } from "@/hooks/useLotissements";
import { useBeneficiairesLots, useUpdateBeneficiaireLot } from "@/hooks/useBeneficiairesLots";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ID_DOC_RULES, sanitizeIdNumber, validateIdNumber } from "@/lib/idDocumentValidation";

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
  const queryClient = useQueryClient();
  const { data: acquereurs } = useAcquereurs();
  const { data: assignableUsers } = useAssignableUsers();
  const { data: prefinanceurs } = usePrefinanceurs();
  const createAcquereur = useCreateAcquereur();
  const createPrefinanceur = useCreatePrefinanceur();
  const createVente = useCreateVenteParcelle();
  const updateReservation = useUpdateReservationParcelle();
  const { data: lotissement } = useLotissement(parcelle.lotissement_id);
  const updateLotissement = useUpdateLotissement();
  const { data: beneficiairesLots } = useBeneficiairesLots(parcelle.lotissement_id);
  const updateBeneficiaireLot = useUpdateBeneficiaireLot();

  const [transactionType, setTransactionType] = useState<"vente" | "prefinancement">("vente");
  const [mode, setMode] = useState<"existing" | "new">(defaultAcquereurId ? "existing" : "existing");
  const [acquereurId, setAcquereurId] = useState(defaultAcquereurId || "");
  const [newAcquereur, setNewAcquereur] = useState({
    name: "",
    phone: "",
    email: "",
    id_type: "cni" as "cni" | "passeport" | "permis" | "extrait" | "carte_consulaire",
    cni_number: "",
    address: "",
    birth_date: "",
    birth_place: "",
    profession: "",
  });

  // Prefinanceur state
  const [prefMode, setPrefMode] = useState<"existing" | "new">("existing");
  const [prefinanceurId, setPrefinanceurId] = useState("");
  const [newPrefinanceur, setNewPrefinanceur] = useState({
    name: "",
    phone: "",
    email: "",
    id_type: "cni" as "cni" | "passeport" | "permis" | "extrait" | "carte_consulaire",
    cni_number: "",
    rccm: "",
    representant: "",
    address: "",
    type: "individu",
    notes: "",
  });
  const [submittingPref, setSubmittingPref] = useState(false);
  const [acquereurOpen, setAcquereurOpen] = useState(false);
  const [prefinanceurOpen, setPrefinanceurOpen] = useState(false);

  const [paymentType, setPaymentType] = useState<PaymentType>("comptant");
  const [paymentMethod, setPaymentMethod] = useState<string>("especes");
  const [downPayment, setDownPayment] = useState(defaultDownPayment ? defaultDownPayment.toString() : "");
  const [totalInstallments, setTotalInstallments] = useState("12");
  const [salePrice, setSalePrice] = useState(parcelle.price.toString());
  const [soldBy, setSoldBy] = useState<string>((parcelle as any).assigned_to || user?.id || "");

  // Cédant (propriétaire terrien) — auto pre-filled from whichever source the attestation
  // de cession will actually read: the family member (bénéficiaire) this specific lot was
  // attributed to if any, otherwise the lotissement's generic propriétaire terrien.
  // Editable here so it can be corrected or filled in on the spot if missing.
  const [cedantName, setCedantName] = useState("");
  const [cedantPhone, setCedantPhone] = useState("");
  const [cedantCni, setCedantCni] = useState("");
  const [cedantAddress, setCedantAddress] = useState("");
  const [cedantLoaded, setCedantLoaded] = useState(false);
  const [cedantBeneficiaireId, setCedantBeneficiaireId] = useState<string | null>(null);

  useEffect(() => {
    if (cedantLoaded) return;

    if (parcelle.beneficiaire_id) {
      // Wait for the beneficiaires list to load before deciding
      if (beneficiairesLots === undefined) return;
      const linked = beneficiairesLots.find((b) => b.id === parcelle.beneficiaire_id);
      if (linked) {
        setCedantName(linked.nom || "");
        setCedantPhone(linked.telephone || "");
        setCedantCni(linked.cni_number || "");
        setCedantAddress(linked.adresse || "");
        setCedantBeneficiaireId(linked.id);
        setCedantLoaded(true);
        return;
      }
    }

    if (lotissement) {
      setCedantName(lotissement.proprietaire_name || "");
      setCedantPhone(lotissement.proprietaire_telephone || "");
      setCedantCni(lotissement.proprietaire_cni || "");
      setCedantAddress(lotissement.proprietaire_adresse || "");
      setCedantBeneficiaireId(null);
      setCedantLoaded(true);
    }
  }, [parcelle.beneficiaire_id, beneficiairesLots, lotissement, cedantLoaded]);

  const monthlyPayment = useMemo(() => {
    if (paymentType !== "echelonne") return 0;
    const total = parseFloat(salePrice) || 0;
    const down = parseFloat(downPayment) || 0;
    const installments = parseInt(totalInstallments) || 1;
    return Math.ceil((total - down) / installments);
  }, [salePrice, downPayment, totalInstallments, paymentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prefinancement flow
    if (transactionType === "prefinancement") {
      let prefId = prefinanceurId;
      try {
        setSubmittingPref(true);
        if (prefMode === "new") {
          if (!newPrefinanceur.name.trim()) {
            toast.error("Le nom du préfinanceur est obligatoire");
            setSubmittingPref(false);
            return;
          }
          const created = await createPrefinanceur.mutateAsync({
            name: newPrefinanceur.name.trim(),
            phone: newPrefinanceur.phone.trim() || null,
            email: newPrefinanceur.email.trim() || null,
            cni_number: newPrefinanceur.cni_number.trim() || null,
            rccm: newPrefinanceur.rccm.trim() || null,
            representant: newPrefinanceur.representant.trim() || null,
            address: newPrefinanceur.address.trim() || null,
            type: newPrefinanceur.type,
            notes: newPrefinanceur.notes.trim() || null,
          });
          prefId = created.id;
        }
        if (!prefId) {
          toast.error("Veuillez sélectionner ou créer un préfinanceur");
          setSubmittingPref(false);
          return;
        }
        const { error } = await supabase.rpc("enregistrer_prefinancement", {
          _parcelle_id: parcelle.id,
          _prefinanceur_id: prefId,
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["parcelles"] });
        toast.success("Préfinancement enregistré avec succès");
        onOpenChange(false);
      } catch (err: any) {
        toast.error(err?.message || "Erreur lors de l'enregistrement du préfinancement");
      } finally {
        setSubmittingPref(false);
      }
      return;
    }

    let buyerId = acquereurId;

    // Create new buyer if needed
    if (mode === "new") {
      if (!newAcquereur.name.trim()) {
        toast.error("Le nom de l'acquéreur est obligatoire");
        return;
      }

      // Validate id number format if provided
      const cniTrimmedRaw = newAcquereur.cni_number.trim();
      if (cniTrimmedRaw) {
        const idErr = validateIdNumber(newAcquereur.id_type, cniTrimmedRaw);
        if (idErr) {
          toast.error(idErr);
          return;
        }
      }

      // Check for duplicate acquéreur by name + phone or CNI
      const nameTrimmed = newAcquereur.name.trim().toLowerCase();
      const phoneTrimmed = newAcquereur.phone.trim();
      const cniTrimmed = cniTrimmedRaw;
      
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
          id_type: newAcquereur.id_type,
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

      // Persist cédant info if it was added or corrected here, so the attestation de
      // cession picks it up later — on the linked bénéficiaire if this lot has one,
      // otherwise on the lotissement's generic propriétaire terrien.
      {
        const trimmedName = cedantName.trim();
        const trimmedPhone = cedantPhone.trim();
        const trimmedCni = cedantCni.trim();
        const trimmedAddress = cedantAddress.trim();

        if (cedantBeneficiaireId) {
          const linked = beneficiairesLots?.find((b) => b.id === cedantBeneficiaireId);
          const cedantChanged =
            trimmedPhone !== (linked?.telephone || "") ||
            trimmedCni !== (linked?.cni_number || "") ||
            trimmedAddress !== (linked?.adresse || "") ||
            (!!trimmedName && trimmedName !== (linked?.nom || ""));

          if (cedantChanged) {
            try {
              await updateBeneficiaireLot.mutateAsync({
                id: cedantBeneficiaireId,
                ...(trimmedName ? { nom: trimmedName } : {}),
                telephone: trimmedPhone || null,
                cni_number: trimmedCni || null,
                adresse: trimmedAddress || null,
              });
            } catch {
              toast.error("Vente enregistrée, mais erreur lors de la mise à jour du cédant");
            }
          }
        } else if (parcelle.lotissement_id) {
          const cedantChanged =
            trimmedName !== (lotissement?.proprietaire_name || "") ||
            trimmedPhone !== (lotissement?.proprietaire_telephone || "") ||
            trimmedCni !== (lotissement?.proprietaire_cni || "") ||
            trimmedAddress !== (lotissement?.proprietaire_adresse || "");

          if (cedantChanged) {
            try {
              await updateLotissement.mutateAsync({
                id: parcelle.lotissement_id,
                proprietaire_name: trimmedName || null,
                proprietaire_telephone: trimmedPhone || null,
                proprietaire_cni: trimmedCni || null,
                proprietaire_adresse: trimmedAddress || null,
              });
            } catch {
              toast.error("Vente enregistrée, mais erreur lors de la mise à jour du cédant");
            }
          }
        }
      }

      toast.success("Vente enregistrée avec succès");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de l'enregistrement de la vente");
    }
  };

  const isLoading = createAcquereur.isPending || createVente.isPending || submittingPref || createPrefinanceur.isPending || updateLotissement.isPending || updateBeneficiaireLot.isPending;
  const isPref = transactionType === "prefinancement";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isPref ? "Préfinancement" : "Vendre"} la parcelle {parcelle.plot_number}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type */}
          <div className="space-y-3">
            <Label>Type d'opération</Label>
            <RadioGroup
              value={transactionType}
              onValueChange={(v) => setTransactionType(v as "vente" | "prefinancement")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="vente" id="tt-vente" />
                <Label htmlFor="tt-vente" className="cursor-pointer">Vente</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="prefinancement" id="tt-pref" />
                <Label htmlFor="tt-pref" className="cursor-pointer">Préfinancement</Label>
              </div>
            </RadioGroup>
          </div>

          {isPref && (
            <div className="space-y-4">
              <Label>Préfinanceur</Label>
              <RadioGroup
                value={prefMode}
                onValueChange={(v) => setPrefMode(v as "existing" | "new")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="existing" id="pref-existing" />
                  <Label htmlFor="pref-existing" className="cursor-pointer">Existant</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="new" id="pref-new" />
                  <Label htmlFor="pref-new" className="cursor-pointer">Nouveau</Label>
                </div>
              </RadioGroup>

              {prefMode === "existing" ? (
                <Popover open={prefinanceurOpen} onOpenChange={setPrefinanceurOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={prefinanceurOpen}
                      className="w-full justify-between font-normal"
                    >
                      {prefinanceurId
                        ? prefinanceurs?.find(p => p.id === prefinanceurId)?.name ?? "Sélectionner un préfinanceur"
                        : "Sélectionner un préfinanceur"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher un préfinanceur..." />
                      <CommandList>
                        <CommandEmpty>Aucun préfinanceur trouvé.</CommandEmpty>
                        <CommandGroup>
                          {prefinanceurs?.map(p => (
                            <CommandItem
                              key={p.id}
                              value={`${p.name} ${p.phone ?? ""}`}
                              onSelect={() => {
                                setPrefinanceurId(p.id);
                                setPrefinanceurOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", prefinanceurId === p.id ? "opacity-100" : "opacity-0")} />
                              <User className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>{p.name}</span>
                              {p.phone && <span className="ml-1 text-muted-foreground text-sm">({p.phone})</span>}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="grid gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={newPrefinanceur.type}
                        onValueChange={(v) => setNewPrefinanceur({ ...newPrefinanceur, type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individu">Individu</SelectItem>
                          <SelectItem value="societe">Société</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="pref-name">
                        {newPrefinanceur.type === "societe" ? "Raison sociale *" : "Nom complet *"}
                      </Label>
                      <Input
                        id="pref-name"
                        value={newPrefinanceur.name}
                        onChange={(e) => setNewPrefinanceur({ ...newPrefinanceur, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pref-phone">Téléphone</Label>
                      <Input
                        id="pref-phone"
                        value={newPrefinanceur.phone}
                        onChange={(e) => setNewPrefinanceur({ ...newPrefinanceur, phone: e.target.value })}
                        placeholder="+2250701020304"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pref-email">Email</Label>
                      <Input
                        id="pref-email"
                        type="email"
                        value={newPrefinanceur.email}
                        onChange={(e) => setNewPrefinanceur({ ...newPrefinanceur, email: e.target.value })}
                      />
                    </div>
                    {newPrefinanceur.type === "societe" ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="pref-rccm">RCCM</Label>
                          <Input
                            id="pref-rccm"
                            value={newPrefinanceur.rccm}
                            onChange={(e) => setNewPrefinanceur({ ...newPrefinanceur, rccm: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pref-rep">Représentant</Label>
                          <Input
                            id="pref-rep"
                            value={newPrefinanceur.representant}
                            onChange={(e) => setNewPrefinanceur({ ...newPrefinanceur, representant: e.target.value })}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="pref-id-type">Type de pièce</Label>
                          <Select
                            value={newPrefinanceur.id_type}
                            onValueChange={(v) => setNewPrefinanceur({ ...newPrefinanceur, id_type: v as any, cni_number: "" })}
                          >
                            <SelectTrigger id="pref-id-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cni">CNI</SelectItem>
                              <SelectItem value="passeport">Passeport</SelectItem>
                              <SelectItem value="permis">Permis de conduire</SelectItem>
                              <SelectItem value="extrait">Extrait de naissance</SelectItem>
                              <SelectItem value="carte_consulaire">Carte consulaire</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pref-cni">{ID_DOC_RULES[newPrefinanceur.id_type].label}</Label>
                          <Input
                            id="pref-cni"
                            value={newPrefinanceur.cni_number}
                            maxLength={ID_DOC_RULES[newPrefinanceur.id_type].maxLength}
                            onChange={(e) => setNewPrefinanceur({
                              ...newPrefinanceur,
                              cni_number: sanitizeIdNumber(newPrefinanceur.id_type, e.target.value),
                            })}
                            placeholder={
                              newPrefinanceur.id_type === "cni" ? "CI00123456789" :
                              newPrefinanceur.id_type === "passeport" ? "23AA12345" :
                              newPrefinanceur.id_type === "permis" ? "PC0123456" :
                              newPrefinanceur.id_type === "carte_consulaire" ? "N° carte consulaire" :
                              "N° d'extrait"
                            }
                          />
                          {(() => {
                            const err = validateIdNumber(newPrefinanceur.id_type, newPrefinanceur.cni_number);
                            return err ? (
                              <p className="text-xs text-destructive">{err}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">{ID_DOC_RULES[newPrefinanceur.id_type].hint}</p>
                            );
                          })()}
                        </div>
                      </>
                    )}
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="pref-address">Adresse</Label>
                      <Input
                        id="pref-address"
                        value={newPrefinanceur.address}
                        onChange={(e) => setNewPrefinanceur({ ...newPrefinanceur, address: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="pref-notes">Notes</Label>
                      <Input
                        id="pref-notes"
                        value={newPrefinanceur.notes}
                        onChange={(e) => setNewPrefinanceur({ ...newPrefinanceur, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isPref && (
          <>
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
              <Popover open={acquereurOpen} onOpenChange={setAcquereurOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={acquereurOpen}
                    className="w-full justify-between font-normal"
                  >
                    {acquereurId
                      ? acquereurs?.find(a => a.id === acquereurId)?.name ?? "Sélectionner un acquéreur"
                      : "Sélectionner un acquéreur"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un acquéreur..." />
                    <CommandList>
                      <CommandEmpty>Aucun acquéreur trouvé.</CommandEmpty>
                      <CommandGroup>
                        {acquereurs?.map(a => (
                          <CommandItem
                            key={a.id}
                            value={`${a.name} ${a.phone ?? ""}`}
                            onSelect={() => {
                              setAcquereurId(a.id);
                              setAcquereurOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", acquereurId === a.id ? "opacity-100" : "opacity-0")} />
                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{a.name}</span>
                            {a.phone && <span className="ml-1 text-muted-foreground text-sm">({a.phone})</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                    <Label htmlFor="id_type">Type de pièce</Label>
                    <Select
                      value={newAcquereur.id_type}
                      onValueChange={(v) => setNewAcquereur({ ...newAcquereur, id_type: v as any, cni_number: "" })}
                    >
                      <SelectTrigger id="id_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cni">CNI</SelectItem>
                        <SelectItem value="passeport">Passeport</SelectItem>
                        <SelectItem value="permis">Permis de conduire</SelectItem>
                        <SelectItem value="extrait">Extrait de naissance</SelectItem>
                        <SelectItem value="carte_consulaire">Carte consulaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cni">
                      {ID_DOC_RULES[newAcquereur.id_type].label}
                    </Label>
                    <Input
                      id="cni"
                      value={newAcquereur.cni_number}
                      maxLength={ID_DOC_RULES[newAcquereur.id_type].maxLength}
                      onChange={(e) => setNewAcquereur({
                        ...newAcquereur,
                        cni_number: sanitizeIdNumber(newAcquereur.id_type, e.target.value),
                      })}
                      placeholder={
                        newAcquereur.id_type === "cni" ? "CI00123456789" :
                        newAcquereur.id_type === "passeport" ? "23AA12345" :
                        newAcquereur.id_type === "permis" ? "PC0123456" :
                        newAcquereur.id_type === "carte_consulaire" ? "N° carte consulaire" :
                        "N° d'extrait"
                      }
                    />
                    {(() => {
                      const err = validateIdNumber(newAcquereur.id_type, newAcquereur.cni_number);
                      return err ? (
                        <p className="text-xs text-destructive">{err}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{ID_DOC_RULES[newAcquereur.id_type].hint}</p>
                      );
                    })()}
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

          {/* Cédant (propriétaire terrien) */}
          <div className="space-y-3">
            <div>
              <Label>Cédant (Propriétaire terrien)</Label>
              <p className="text-xs text-muted-foreground">
                {cedantBeneficiaireId
                  ? "Ce lot est attribué à un membre de la famille du propriétaire — ses informations sont préremplies. Modifiez-les si besoin."
                  : "Utilisé pour l'attestation de cession. Préremplies si déjà connues, modifiez-les ou renseignez-les si absentes."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="cedantName">Nom complet</Label>
                <Input
                  id="cedantName"
                  value={cedantName}
                  onChange={(e) => setCedantName(e.target.value)}
                  placeholder="Nom du propriétaire terrien"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cedantPhone">Téléphone</Label>
                <Input
                  id="cedantPhone"
                  value={cedantPhone}
                  onChange={(e) => setCedantPhone(e.target.value)}
                  placeholder="+2250701020304"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cedantCni">CNI / Pièce d'identité</Label>
                <Input
                  id="cedantCni"
                  value={cedantCni}
                  onChange={(e) => setCedantCni(e.target.value)}
                  placeholder="CI00123456789"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="cedantAddress">Domicile</Label>
                <Input
                  id="cedantAddress"
                  value={cedantAddress}
                  onChange={(e) => setCedantAddress(e.target.value)}
                  placeholder="Ex: Cocody, Abidjan"
                />
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
              <p className="text-xs text-muted-foreground">
                Cette vente sera comptabilisée pour ce commercial
              </p>
            </div>
          )}
          </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isPref ? "Confirmer le préfinancement" : "Confirmer la vente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
