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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Smartphone, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TenantPayRentDialogProps {
  paymentId: string;
  amount: number;
  dueDate: string;
  propertyTitle?: string;
}

const paymentModes = [
  { value: "orange_ci", label: "Orange Money", icon: "🟠" },
  { value: "mtn_open_ci", label: "MTN Mobile Money", icon: "🟡" },
  { value: "wave_ci", label: "Wave", icon: "🔵" },
  { value: "moov_ci", label: "Moov Money", icon: "🔵" },
];

export function TenantPayRentDialog({
  paymentId,
  amount,
  dueDate,
  propertyTitle = "Bien immobilier",
}: TenantPayRentDialogProps) {
  const [open, setOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState("orange_ci");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (value: number) =>
    value.toLocaleString("fr-FR") + " F CFA";

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("tenant-pay-rent", {
        body: {
          payment_id: paymentId,
          payment_mode: paymentMode,
        },
      });

      if (error) throw error;

      if (data?.checkout_url) {
        // Redirect to FedaPay checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error("Impossible de créer la transaction de paiement");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Erreur de paiement",
        description: error.message || "Une erreur est survenue lors de l'initialisation du paiement.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedMode = paymentModes.find((m) => m.value === paymentMode);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="text-xs bg-primary hover:bg-primary/90">
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
            Effectuez le paiement de votre loyer via Mobile Money.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Bien</span>
              <span className="font-medium">{propertyTitle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Échéance</span>
              <span className="font-medium">
                {new Date(dueDate).toLocaleDateString("fr-FR")}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-2 mt-2">
              <span className="text-sm text-muted-foreground">Montant à payer</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(amount)}
              </span>
            </div>
          </div>

          {/* Payment Mode Selection */}
          <div className="space-y-2">
            <Label htmlFor="payment-mode">Mode de paiement</Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger id="payment-mode">
                <SelectValue placeholder="Sélectionner un mode" />
              </SelectTrigger>
              <SelectContent>
                {paymentModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <span className="flex items-center gap-2">
                      <span>{mode.icon}</span>
                      <span>{mode.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Vous serez redirigé vers la page de paiement FedaPay. Une fois le paiement confirmé, 
              votre loyer sera automatiquement marqué comme payé.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="bg-primary hover:bg-primary/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Payer {formatCurrency(amount)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
