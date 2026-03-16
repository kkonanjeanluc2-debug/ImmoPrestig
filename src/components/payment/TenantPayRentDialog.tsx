import { useState, useEffect, useRef, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { openKkiapayWidget, addKkiapayListener, removeKkiapayListener } from "kkiapay";
import { toast } from "sonner";
import { Loader2, CreditCard, Smartphone, AlertCircle } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";

interface TenantPayRentDialogProps {
  paymentId: string;
  amount: number;
  paidAmount?: number;
  dueDate: string;
  propertyTitle: string;
  tenantPhone?: string | null;
  agencyUserId: string;
  isVirtual?: boolean;
  tenantId?: string;
  paymentMonths?: string[];
}

type PaymentMethod = "kkiapay" | "geniuspay";

// Available payment methods - KKiaPay and GeniusPay
const allPaymentMethods: { value: PaymentMethod; label: string; color: string; provider: string; description?: string }[] = [
  { value: "kkiapay", label: "KKiaPay", color: "bg-primary", provider: "kkiapay", description: "Mobile Money & Carte" },
  { value: "geniuspay", label: "GeniusPay", color: "bg-emerald-600", provider: "geniuspay", description: "Wave, Orange, MTN, Carte" },
];

export function TenantPayRentDialog({
  paymentId: initialPaymentId,
  amount,
  paidAmount = 0,
  dueDate,
  propertyTitle,
  tenantPhone,
  agencyUserId,
  isVirtual = false,
  tenantId,
  paymentMonths,
}: Omit<TenantPayRentDialogProps, 'agencyMobileMoneyProvider'>) {
  const remainingAmount = amount - paidAmount;
  const [open, setOpen] = useState(false);
  const [paymentId, setPaymentId] = useState(initialPaymentId);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("kkiapay");
  const [phone, setPhone] = useState(tenantPhone || "");
  const [payAmount, setPayAmount] = useState(remainingAmount);
  const [latePayments, setLatePayments] = useState<any[]>([]);
  const [checkingLate, setCheckingLate] = useState(false);
  const queryClient = useQueryClient();

  // Check for late payments when dialog opens
  const checkLatePayments = useCallback(async () => {
    if (!tenantId) return;
    setCheckingLate(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("id, due_date, amount, payment_months, status")
        .eq("tenant_id", tenantId)
        .eq("status", "late")
        .order("due_date", { ascending: true });

      if (!error && data) {
        setLatePayments(data.filter(p => p.id !== initialPaymentId));
      }
    } catch (e) {
      console.error("Error checking late payments:", e);
    } finally {
      setCheckingLate(false);
    }
  }, [tenantId, initialPaymentId]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      checkLatePayments();
    } else {
      setLatePayments([]);
    }
  };

  const hasBlockingLatePayments = latePayments.length > 0;
  
  // Check if the agency has online payment enabled
  // Uses SECURITY DEFINER function to bypass RLS (tenants can't query agencies/agency_members directly)
  const { data: agency, isLoading: isLoadingAgency } = useQuery({
    queryKey: ["agency-payment-config", agencyUserId],
    queryFn: async () => {
      if (!agencyUserId) return null;
      const { data, error } = await supabase.rpc("get_agency_payment_config", {
        _agency_user_id: agencyUserId,
      });
      if (error) {
        console.error("Error fetching agency payment config:", error);
        return null;
      }
      return data?.[0] || null;
    },
    enabled: !!agencyUserId,
  });
  const isOnlinePaymentEnabled = !!(agency?.online_rent_enabled);

  const dueMonth = new Date(dueDate).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  // Vérifie (côté backend) et marque le paiement comme payé
  const verifyAndFinalizeKkiapayPayment = async (transactionId?: string) => {
    if (!transactionId) return false;

    try {
      const { data, error } = await supabase.functions.invoke("tenant-pay-rent-kkiapay-verify", {
        body: {
          payment_id: paymentId,
          transaction_id: String(transactionId),
          amount: payAmount,
        },
      });

      if (error) {
        console.error("Error verifying KKiaPay payment:", error);
        return false;
      }

      return !!data?.verified;
    } catch (e) {
      console.error("Failed to verify KKiaPay payment:", e);
      return false;
    }
  };

  const waitForPaymentUpdate = async (maxAttempts = 60) => {
    for (let i = 0; i < maxAttempts; i++) {
      const { data, error } = await supabase
        .from("payments")
        .select("status, paid_amount")
        .eq("id", paymentId)
        .single();

      // Consider success if status changed to paid OR paid_amount increased
      if (!error && (data?.status === "paid" || Number(data?.paid_amount || 0) > paidAmount)) return true;
      await new Promise((r) => setTimeout(r, 2000));
    }

    return false;
  };

  // Track if we're waiting for an external payment (GeniusPay)
  const waitingForExternalPayment = useRef(false);
  const originalPaidAmount = useRef(paidAmount);

  // When user returns to tab after external payment, check for updates
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible" && waitingForExternalPayment.current) {
      // Check payment status immediately
      supabase
        .from("payments")
        .select("status, paid_amount")
        .eq("id", paymentId)
        .single()
        .then(({ data, error }) => {
          if (!error && (data?.status === "paid" || Number(data?.paid_amount || 0) > originalPaidAmount.current)) {
            waitingForExternalPayment.current = false;
            toast.success("Paiement effectué avec succès ! Vous pouvez maintenant télécharger votre quittance.");
            queryClient.invalidateQueries({ queryKey: ["payments"] });
          }
        });
    }
  }, [paymentId, queryClient]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  const handlePayment = async () => {
    if (!phone.trim()) {
      toast.error("Veuillez entrer votre numéro de téléphone");
      return;
    }

    if (payAmount <= 0 || payAmount > remainingAmount) {
      toast.error(`Veuillez entrer un montant entre 1 et ${remainingAmount.toLocaleString("fr-FR")} F CFA`);
      return;
    }

    setIsLoading(true);
    let currentPaymentId = paymentId;
    
    try {
      // If this is a virtual payment, create a real one first
      if (isVirtual && tenantId) {
        const { data: created, error: createError } = await supabase
          .from("payments")
          .insert({
            tenant_id: tenantId,
            amount: amount,
            due_date: dueDate,
            status: "pending",
            user_id: agencyUserId,
            payment_months: paymentMonths || null,
          })
          .select()
          .single();
        
        if (createError) throw createError;
        currentPaymentId = created.id;
        setPaymentId(currentPaymentId);
      }

      const selectedMethodData = allPaymentMethods.find(m => m.value === selectedMethod);
      const provider = selectedMethodData?.provider;
      
      let functionName: string;
      let body: Record<string, unknown>;
      
      if (provider === "kkiapay") {
        functionName = "tenant-pay-rent-kkiapay";
        body = { 
          payment_id: currentPaymentId, 
          amount: payAmount,
          customer_name: "",
          customer_phone: phone,
        };
      } else if (provider === "pawapay") {
        functionName = "tenant-pay-rent-pawapay";
        const actualMethod = selectedMethod.replace("pawapay_", "") + "_money";
        body = { 
          payment_id: currentPaymentId, 
          customer_phone: phone,
          payment_method: actualMethod,
          country_code: "CI"
        };
      } else if (provider === "geniuspay") {
        functionName = "tenant-pay-rent-geniuspay";
        body = { payment_id: currentPaymentId, customer_phone: phone, amount: payAmount };
      } else if (provider === "wave_ci") {
        functionName = "tenant-pay-rent-wave";
        body = { payment_id: currentPaymentId, customer_phone: phone };
      } else {
        functionName = "tenant-pay-rent";
        body = { payment_id: currentPaymentId, payment_method: selectedMethod, customer_phone: phone };
      }

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) {
        // Try to extract detailed error from response
        const errorMsg = data?.error || error.message || "Erreur lors du paiement";
        throw new Error(errorMsg);
      }

      // KKiaPay Widget
      if (provider === "kkiapay" && data?.success && data?.public_key) {
        const cleanup = () => {
          try {
            removeKkiapayListener("success");
            removeKkiapayListener("failed");
          } catch {
            // ignore
          }
        };

        addKkiapayListener("success", async (response: any) => {
          cleanup();
          console.log("KKiaPay success callback:", response);

          const transactionId =
            response?.transactionId ??
            response?.transaction_id ??
            response?.reference ??
            response?.data?.transactionId;

          // Vérification & finalisation côté backend (pas bloquée par les permissions du portail)
          const verified = await verifyAndFinalizeKkiapayPayment(transactionId);

          // Attendre la propagation du statut avant de rafraîchir l'UI
          const paid = verified ? await waitForPaymentUpdate() : false;

          if (paid) {
            toast.success("Paiement effectué avec succès ! Vous pouvez maintenant télécharger votre quittance.");
            queryClient.invalidateQueries({ queryKey: ["payments"] });
          } else if (verified) {
            toast.success("Paiement confirmé. Votre quittance sera disponible sous peu.");
            queryClient.invalidateQueries({ queryKey: ["payments"] });
          } else {
            toast.success("Paiement reçu. Vérification en cours…");
          }
        });

        addKkiapayListener("failed", (response: any) => {
          cleanup();
          console.log("KKiaPay failed callback:", response);
          toast.error("Le paiement KKiaPay n'a pas abouti.");
        });

        // IMPORTANT: Fermer le dialog et arrêter le loading AVANT d'ouvrir le widget
        // Sinon le widget KKiaPay est bloqué par le modal
        setIsLoading(false);
        setOpen(false);

        // Petit délai pour laisser le dialog se fermer
        setTimeout(() => {
          openKkiapayWidget({
            amount: data.amount,
            api_key: data.public_key,
            sandbox: !!data.sandbox,
            phone: data.phone,
            name: data.name,
            email: data.email,
            reason: data.reason,
            data: data.data,
          });
        }, 100);

        return;
      }

      // Handle PawaPay USSD push (no redirect URL)
      if (data?.provider === "pawapay" && data?.success) {
        toast.success(data.message || "Notification envoyée sur votre téléphone");
        setOpen(false);
        return;
      }

      // GeniusPay redirect flow - open in new tab and poll for updates
      if (provider === "geniuspay" && data?.payment_url) {
        toast.success("Redirection vers le paiement... Revenez sur cette page après avoir payé.");
        window.open(data.payment_url, "_blank");
        setIsLoading(false);
        setOpen(false);

        // Mark that we're waiting for an external payment
        waitingForExternalPayment.current = true;
        originalPaidAmount.current = paidAmount;

        // Extended polling (2 minutes) + visibility listener as backup
        const paid = await waitForPaymentUpdate(60);
        if (paid) {
          waitingForExternalPayment.current = false;
          toast.success("Paiement effectué avec succès ! Vous pouvez maintenant télécharger votre quittance.");
          queryClient.invalidateQueries({ queryKey: ["payments"] });
        }
        return;
      }

      if (data?.payment_url) {
        toast.success("Redirection vers le paiement...");
        window.open(data.payment_url, "_blank");
        setOpen(false);
      } else if (data?.success) {
        toast.success(data.message || "Paiement initié avec succès");
        setOpen(false);
      } else {
        throw new Error(data?.error || "Erreur lors de l'initialisation du paiement");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Erreur lors du paiement");
    } finally {
      setIsLoading(false);
    }
  };

  // If agency hasn't enabled online payment, hide the button entirely
  if (!isOnlinePaymentEnabled && !isLoadingAgency) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="text-xs" disabled={isLoadingAgency}>
          <CreditCard className="h-3 w-3 mr-1" />
          Payer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Payer mon loyer
          </DialogTitle>
          <DialogDescription>
            Réglez votre loyer de {dueMonth} en ligne via Mobile Money.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Bien</span>
              <span className="font-medium text-sm">{propertyTitle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Période</span>
              <span className="font-medium capitalize">{dueMonth}</span>
            </div>
            {paidAmount > 0 && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Loyer total</span>
                  <span className="font-medium">{amount.toLocaleString("fr-FR")} F CFA</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Déjà payé</span>
                  <span className="font-medium text-emerald-600">{paidAmount.toLocaleString("fr-FR")} F CFA</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">{paidAmount > 0 ? "Reste à payer" : "Montant à payer"}</span>
              <span className="text-lg font-bold text-primary">
                {remainingAmount.toLocaleString("fr-FR")} F CFA
              </span>
            </div>
          </div>

          {/* Amount to pay */}
          <div className="space-y-2">
            <Label htmlFor="payAmount">Montant à payer</Label>
            <Input
              id="payAmount"
              type="number"
              min={1}
              max={remainingAmount}
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Vous pouvez payer la totalité ou une partie du montant
            </p>
          </div>

          {/* Phone input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="07 XX XX XX XX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Le numéro associé à votre compte Mobile Money
            </p>
          </div>

          {/* Payment method selection */}
          <div className="space-y-2">
            <Label>Mode de paiement</Label>
            <RadioGroup
              value={selectedMethod}
              onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}
              className="grid grid-cols-2 gap-2"
            >
              {allPaymentMethods.map((method) => (
                <div key={method.value}>
                  <RadioGroupItem
                    value={method.value}
                    id={method.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={method.value}
                    className="flex items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                  >
                    <div className={`h-3 w-3 rounded-full ${method.color}`} />
                    <span className="text-sm font-medium">{method.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handlePayment} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Payer {payAmount.toLocaleString("fr-FR")} F
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
