import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePayments } from "@/hooks/usePayments";
import { getTenantCollectedAmountForPeriod } from "@/lib/monthlyPaymentTotals";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import {
  ArrowDownToLine,
  Plus,
  Trash2,
  User,
  Calendar,
  CreditCard,
  Loader2,
  Download,
  Upload,
  FileCheck,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOwnerPayouts,
  useCreateOwnerPayout,
  useDeleteOwnerPayout,
} from "@/hooks/useOwnerPayouts";
import { useOwners, OwnerWithManagementType } from "@/hooks/useOwners";
import { PAYMENT_OPERATORS } from "@/hooks/useAgency";
import { useProperties } from "@/hooks/useProperties";
import { usePropertyInterventions } from "@/hooks/usePropertyInterventions";
import { useTenants } from "@/hooks/useTenants";
import { useAgency } from "@/hooks/useAgency";
import { generatePayoutReceiptPDF } from "@/lib/generatePayoutReceiptPDF";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("fr-FR") + " F CFA";
}

interface OwnerPayoutsSectionProps {
  fromDate: string;
  toDate: string;
  totalReversements: number;
  canCreate?: boolean;
}

const FRENCH_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function OwnerPayoutsSection({
  fromDate,
  toDate,
  totalReversements,
  canCreate = true,
}: OwnerPayoutsSectionProps) {
  const { data: payouts = [], isLoading } = useOwnerPayouts(fromDate, toDate);
  const { data: owners = [] } = useOwners();
  const { data: properties = [] } = useProperties();
  const { data: allInterventions = [] } = usePropertyInterventions();
  const { data: tenants = [] } = useTenants();
  const { data: payments = [] } = usePayments();
  const createPayout = useCreateOwnerPayout();
  const deletePayout = useDeleteOwnerPayout();
  const { data: agency } = useAgency();

  const [open, setOpen] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const [form, setForm] = useState({
    owner_id: "",
    amount: "",
    payout_date: now.toISOString().split("T")[0],
    payment_method: "especes",
    recipient_phone: "",
    notes: "",
    payout_month: now.getMonth() + 1,
    payout_year: now.getFullYear(),
  });

  // Check if a payout already exists for this owner/month/year
  const isDuplicate = payouts.some(
    (p) =>
      p.owner_id === form.owner_id &&
      p.payout_month === form.payout_month &&
      p.payout_year === form.payout_year
  );

  // Compute net amount for a given owner and month/year
  const computeNetAmount = (ownerId: string, month: number, year: number): string => {
    const owner = owners.find((o) => o.id === ownerId) as OwnerWithManagementType | undefined;
    if (!owner) return "";

    const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const periodEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const ownerProps = properties.filter((p) => p.owner_id === ownerId);
    const ownerPropIds = ownerProps.map((p) => p.id);
    const ownerTenants = tenants.filter((t) => t.property_id && ownerPropIds.includes(t.property_id));

    const totalPaid = ownerTenants.reduce((sum, tenant) => {
      return sum + getTenantCollectedAmountForPeriod(payments as any, tenant.id, periodStart, periodEnd);
    }, 0);

    const commissionPercentage = owner.management_type?.percentage || 0;
    const commissionAmount = Math.round((totalPaid * commissionPercentage) / 100);

    const interventionsCost = allInterventions
      .filter((i) => {
        if (!ownerPropIds.includes(i.property_id)) return false;
        const startDate = i.start_date?.substring(0, 10);
        return startDate && startDate >= periodStart && startDate <= periodEnd;
      })
      .reduce((sum, i) => sum + (i.cost || 0), 0);

    const totalCautions = ownerTenants
      .filter((t) => {
        const createdAt = t.created_at?.substring(0, 10);
        return createdAt && createdAt >= periodStart && createdAt <= periodEnd;
      })
      .reduce((sum, t) => {
        const deposit = (t as any).contracts?.find((c: any) => c.status === "active")?.deposit || 0;
        return sum + Number(deposit);
      }, 0);

    const netAmount = totalPaid - commissionAmount - interventionsCost + totalCautions;
    return netAmount > 0 ? String(netAmount) : "";
  };

  const handleOwnerChange = (ownerId: string) => {
    const amount = computeNetAmount(ownerId, form.payout_month, form.payout_year);
    setForm({ ...form, owner_id: ownerId, amount });
  };

  const handleMonthChange = (month: number) => {
    const amount = form.owner_id ? computeNetAmount(form.owner_id, month, form.payout_year) : form.amount;
    setForm({ ...form, payout_month: month, amount });
  };

  const handleYearChange = (year: number) => {
    const amount = form.owner_id ? computeNetAmount(form.owner_id, form.payout_month, year) : form.amount;
    setForm({ ...form, payout_year: year, amount });
  };

  const isCashPayment = form.payment_method === "especes";
  const needsProof = !isCashPayment;

  // Get selected owner's email
  const selectedOwner = owners.find((o) => o.id === form.owner_id);
  const ownerEmail = selectedOwner?.email;

  const handleSubmit = async () => {
    if (!form.owner_id || !form.amount || Number(form.amount) <= 0) return;
    if (needsProof && !proofFile) return;

    setUploading(true);
    let proofUrl: string | undefined;

    try {
      if (proofFile) {
        const fileExt = proofFile.name.split(".").pop();
        const filePath = `payout-proofs/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("agency-logos")
          .upload(filePath, proofFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("agency-logos").getPublicUrl(filePath);
        proofUrl = urlData.publicUrl;
      }
    } catch (err: any) {
      toast.error("Erreur lors de l'upload de la preuve: " + (err.message || ""));
      setUploading(false);
      return;
    }

    setUploading(false);
    createPayout.mutate(
      {
        owner_id: form.owner_id,
        amount: Number(form.amount),
        payout_date: form.payout_date,
        payment_method: form.payment_method,
        payout_month: form.payout_month,
        payout_year: form.payout_year,
        recipient_phone: form.recipient_phone || undefined,
        notes: form.notes || undefined,
        payment_proof_url: proofUrl,
      },
      {
        onSuccess: async () => {
          setOpen(false);
          setProofFile(null);
          setOtpSent(false);
          setOtpCode("");
          setOtpVerified(false);
          const now = new Date();
          setForm({
            owner_id: "",
            amount: "",
            payout_date: now.toISOString().split("T")[0],
            payment_method: "especes",
            recipient_phone: "",
            notes: "",
            payout_month: now.getMonth() + 1,
            payout_year: now.getFullYear(),
          });
        },
      }
    );
  };

  const handleSendOtp = async () => {
    if (!ownerEmail || !selectedOwner) {
      toast.error("Ce propriétaire n'a pas d'adresse email configurée");
      return;
    }

    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-payout-otp", {
        body: {
          ownerName: selectedOwner.name,
          ownerEmail: ownerEmail,
          amount: Number(form.amount),
          payoutMonth: FRENCH_MONTHS[form.payout_month - 1],
          payoutYear: form.payout_year,
          paymentMethod: "Espèces",
          agencyName: agency?.name || "L'agence",
          agencyEmail: agency?.email,
        },
      });
      if (error) throw error;
      if (data?.success) {
        setOtpSent(true);
        toast.success("Code OTP envoyé par email au propriétaire");
      } else {
        throw new Error(data?.error || "Erreur d'envoi");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi du code OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!ownerEmail || !otpCode) return;

    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-payout-otp", {
        body: { ownerEmail, otpCode },
      });
      if (error) throw error;
      if (data?.success) {
        setOtpVerified(true);
        toast.success("Code vérifié avec succès !");
      } else {
        toast.error(data?.error || "Code invalide ou expiré");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de vérification");
    } finally {
      setOtpVerifying(false);
    }
  };

  const getOperatorLabel = (value: string): string => {
    const op = PAYMENT_OPERATORS.find((o) => o.value === value);
    return op?.label || value;
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total reversé</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(totalReversements)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <ArrowDownToLine className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Nb reversements</p>
                <p className="text-lg font-bold text-foreground">
                  {payouts.length}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add button + Dialog */}
      {canCreate && (
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Nouveau reversement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enregistrer un reversement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Propriétaire *</Label>
                <Select
                  value={form.owner_id}
                  onValueChange={handleOwnerChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un propriétaire" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isDuplicate && form.owner_id && (
                  <p className="text-xs text-destructive font-medium">
                    ⚠️ Un reversement existe déjà pour {FRENCH_MONTHS[form.payout_month - 1]} {form.payout_year}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mois *</Label>
                  <Select
                    value={String(form.payout_month)}
                    onValueChange={(v) => handleMonthChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FRENCH_MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Année *</Label>
                  <Select
                    value={String(form.payout_year)}
                    onValueChange={(v) => handleYearChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Montant (F CFA) *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Date du reversement</Label>
                <Input
                  type="date"
                  value={form.payout_date}
                  onChange={(e) =>
                    setForm({ ...form, payout_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(v) => {
                    setForm({ ...form, payment_method: v });
                    if (v === "especes") setProofFile(null);
                    setOtpSent(false);
                    setOtpCode("");
                    setOtpVerified(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="virement">Virement bancaire</SelectItem>
                    <SelectItem value="wave">Wave</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    {PAYMENT_OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Téléphone destinataire</Label>
                <Input
                  value={form.recipient_phone}
                  onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })}
                  placeholder="Ex: +225 07 00 00 00 00"
                />
              </div>

              {/* Email signature section for cash payments */}
              {isCashPayment && (
                <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4 text-primary" />
                    Confirmation par code OTP
                  </div>
                  {ownerEmail ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Un code de confirmation sera envoyé à <strong>{ownerEmail}</strong>. Le propriétaire doit vous communiquer ce code pour valider le reversement.
                      </p>
                      {!otpSent ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={handleSendOtp}
                          disabled={otpSending || !form.amount || Number(form.amount) <= 0}
                        >
                          {otpSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                          Envoyer le code OTP
                        </Button>
                      ) : !otpVerified ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-primary font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            Code envoyé à {ownerEmail}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              placeholder="Entrez le code à 6 chiffres"
                              maxLength={6}
                              className="font-mono text-center text-lg tracking-widest"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleVerifyOtp}
                              disabled={otpVerifying || otpCode.length !== 6}
                            >
                              {otpVerifying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Vérifier"
                              )}
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={handleSendOtp}
                            disabled={otpSending}
                          >
                            Renvoyer le code
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Code vérifié — Reversement confirmé
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-destructive">
                      ⚠️ Ce propriétaire n'a pas d'email configuré. Ajoutez un email dans sa fiche pour envoyer un code de confirmation.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes optionnelles..."
                  rows={2}
                />
              </div>
              {needsProof && (
                <div className="space-y-2">
                  <Label>Preuve de paiement *</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {proofFile ? (
                      <>
                        <FileCheck className="h-4 w-4 text-emerald-500" />
                        {proofFile.name}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Importer la preuve
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-destructive">
                    Reçu de transfert, capture d'écran ou bordereau (.pdf, .jpg, .png)
                  </p>
                </div>
              )}
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={
                  !form.owner_id ||
                  !form.amount ||
                  Number(form.amount) <= 0 ||
                  isDuplicate ||
                  (needsProof && !proofFile) ||
                  (isCashPayment && ownerEmail && !otpVerified) ||
                  uploading ||
                  createPayout.isPending
                }
              >
                {(createPayout.isPending || uploading) ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Historique des reversements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-8 text-center">
              <ArrowDownToLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Aucun reversement pour cette période.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20"
                        onClick={() => generatePayoutReceiptPDF({
                          ownerName: payout.owner?.name || "Propriétaire",
                          ownerEmail: payout.owner?.email,
                          amount: Number(payout.amount),
                          payoutDate: payout.payout_date,
                          payoutMonth: payout.payout_month || 1,
                          payoutYear: payout.payout_year || new Date().getFullYear(),
                          paymentMethod: payout.payment_method,
                          recipientPhone: payout.recipient_phone,
                          notes: payout.notes,
                        }, agency)}
                        title="Télécharger le reçu"
                      >
                        <Download className="h-4 w-4 text-primary" />
                      </Button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">
                            {payout.owner?.name || "Propriétaire"}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {FRENCH_MONTHS[(payout.payout_month || 1) - 1]} {payout.payout_year}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs bg-emerald/10 text-emerald border-emerald/20"
                          >
                            Effectué
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {getOperatorLabel(payout.payment_method)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(payout.payout_date).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>
                        {payout.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {payout.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground whitespace-nowrap">
                        {formatCurrency(Number(payout.amount))}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Supprimer ce reversement ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Le montant de{" "}
                              {formatCurrency(Number(payout.amount))} sera
                              retiré de l'historique.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePayout.mutate(payout.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
