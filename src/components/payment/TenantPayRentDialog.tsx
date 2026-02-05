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
import { toast } from "sonner";
import { Loader2, CreditCard, Smartphone } from "lucide-react";

interface TenantPayRentDialogProps {
  paymentId: string;
  amount: number;
  dueDate: string;
  propertyTitle: string;
  tenantPhone?: string | null;
}

type PaymentMethod = "orange_money" | "mtn_money" | "wave" | "moov" | "pawapay_mtn" | "pawapay_orange" | "kkiapay";

// All available payment methods
const allPaymentMethods: { value: PaymentMethod; label: string; color: string; provider?: string }[] = [
  { value: "orange_money", label: "Orange Money", color: "bg-orange-500", provider: "fedapay" },
  { value: "mtn_money", label: "MTN Mobile Money", color: "bg-yellow-500", provider: "fedapay" },
  { value: "wave", label: "Wave", color: "bg-blue-500", provider: "wave" },
  { value: "moov", label: "Moov Money", color: "bg-purple-500", provider: "fedapay" },
  { value: "pawapay_mtn", label: "MTN (PawaPay)", color: "bg-yellow-600", provider: "pawapay" },
  { value: "pawapay_orange", label: "Orange (PawaPay)", color: "bg-orange-600", provider: "pawapay" },
  { value: "kkiapay", label: "KKiaPay", color: "bg-red-500", provider: "kkiapay" },
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
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("orange_money");
  const [phone, setPhone] = useState(tenantPhone || "");

  const dueMonth = new Date(dueDate).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

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
