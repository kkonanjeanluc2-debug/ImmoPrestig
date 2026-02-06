import { useState } from "react";
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
import { Loader2, CreditCard, Smartphone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface TenantPayRentDialogProps {
  paymentId: string;
  amount: number;
  dueDate: string;
  propertyTitle: string;
  tenantPhone?: string | null;
}

type PaymentMethod = "wave" | "kkiapay";

// Available payment methods - Wave Direct and KKiaPay only
const allPaymentMethods: { value: PaymentMethod; label: string; color: string; provider: string; description?: string }[] = [
  { value: "wave", label: "Wave Direct", color: "bg-blue-600", provider: "wave", description: "Paiement direct Wave" },
  { value: "kkiapay", label: "KKiaPay", color: "bg-primary", provider: "kkiapay", description: "Mobile Money & Carte" },
];

export function TenantPayRentDialog({
  paymentId,
  amount,
  dueDate,
  propertyTitle,
  tenantPhone,
}: Omit<TenantPayRentDialogProps, 'agencyMobileMoneyProvider'>) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("kkiapay");
  const [phone, setPhone] = useState(tenantPhone || "");
  const queryClient = useQueryClient();

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

  const waitForPaymentToBePaid = async () => {
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase
        .from("payments")
        .select("status")
        .eq("id", paymentId)
        .single();

      if (!error && data?.status === "paid") return true;
      await new Promise((r) => setTimeout(r, 2000));
    }

    return false;
  };

  const handlePayment = async () => {
    if (!phone.trim()) {
      toast.error("Veuillez entrer votre numéro de téléphone");
      return;
    }

    setIsLoading(true);
    try {
      const selectedMethodData = allPaymentMethods.find(m => m.value === selectedMethod);
      const provider = selectedMethodData?.provider;
      
      let functionName: string;
      let body: Record<string, unknown>;
      
      if (provider === "kkiapay") {
        functionName = "tenant-pay-rent-kkiapay";
        body = { 
          payment_id: paymentId, 
          amount: amount,
          customer_name: "",
          customer_phone: phone,
        };
      } else if (provider === "pawapay") {
        functionName = "tenant-pay-rent-pawapay";
        const actualMethod = selectedMethod.replace("pawapay_", "") + "_money";
        body = { 
          payment_id: paymentId, 
          customer_phone: phone,
          payment_method: actualMethod,
          country_code: "CI"
        };
      } else if (selectedMethod === "wave") {
        functionName = "tenant-pay-rent-wave";
        body = { payment_id: paymentId, customer_phone: phone };
      } else {
        functionName = "tenant-pay-rent";
        body = { payment_id: paymentId, payment_method: selectedMethod, customer_phone: phone };
      }

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) throw error;

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
          const paid = verified ? await waitForPaymentToBePaid() : false;

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="text-xs">
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
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Montant à payer</span>
              <span className="text-lg font-bold text-primary">
                {amount.toLocaleString("fr-FR")} F CFA
              </span>
            </div>
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
                Payer {amount.toLocaleString("fr-FR")} F
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
