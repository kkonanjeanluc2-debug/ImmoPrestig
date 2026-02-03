import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Smartphone,
  CreditCard,
  Wallet,
  CreditCard as CreditCardIcon,
} from "lucide-react";

interface TenantPayRentDialogProps {
  paymentId: string;
  amount: number;
  dueDate: string;
  propertyTitle: string;
}

// Payment methods
const paymentMethods = [
  {
    id: "orange_money",
    name: "Orange Money",
    icon: Smartphone,
    color: "bg-orange-500",
  },
  {
    id: "mtn_money",
    name: "MTN Money",
    icon: Smartphone,
    color: "bg-yellow-500",
  },
  {
    id: "wave",
    name: "Wave",
    icon: Wallet,
    color: "bg-blue-400",
  },
  {
    id: "moov",
    name: "Moov Money",
    icon: Smartphone,
    color: "bg-blue-500",
  },
];

export function TenantPayRentDialog({
  paymentId,
  amount,
  dueDate,
  propertyTitle,
}: TenantPayRentDialogProps) {
  const [open, setOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("orange_money");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Normalize phone number
  const normalizeIvorianPhone = (phone: string): string | null => {
    if (!phone.trim()) return null;

    let digits = phone.replace(/\D/g, "");

    if (digits.startsWith("225")) {
      digits = digits.slice(3);
    }

    if (digits.length === 9 && !digits.startsWith("0")) {
      digits = `0${digits}`;
    }

    const isNewFormat = digits.length === 10 && digits.startsWith("0");
    const isLegacyFormat = digits.length === 8;

    if (!isNewFormat && !isLegacyFormat) {
      return null;
    }

    return `+225${digits}`;
  };

  // Validate phone number
  const validateIvorianPhone = (phone: string): string | null => {
    if (!phone.trim()) {
      return "Veuillez entrer votre numéro de téléphone";
    }

    const digits = phone.replace(/\D/g, "");
    let cleanedDigits = digits;
    if (digits.startsWith("225")) {
      cleanedDigits = digits.slice(3);
    }

    const hasLeadingZero = cleanedDigits.startsWith("0");

    if (cleanedDigits.length === 10 && hasLeadingZero) {
      return null;
    }

    if (cleanedDigits.length === 9 && !hasLeadingZero) {
      return null;
    }

    if (cleanedDigits.length === 8) {
      return null;
    }

    return "Format invalide. Entrez 10 chiffres commençant par 0 (ex: 0708298281)";
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    if (phoneError) {
      setPhoneError(null);
    }
  };

  const normalizedPhone = normalizeIvorianPhone(phoneNumber);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("fr-CI", {
      style: "decimal",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handlePay = async () => {
    const validationError = validateIvorianPhone(phoneNumber);
    if (validationError) {
      setPhoneError(validationError);
      toast.error(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vous devez être connecté pour continuer");
        return;
      }

      const response = await supabase.functions.invoke("tenant-pay-rent", {
        body: {
          payment_id: paymentId,
          payment_method: paymentMethod,
          customer_phone: phoneNumber,
          return_url: window.location.href,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        throw new Error("URL de paiement non reçue");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Une erreur est survenue lors du paiement");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <CreditCardIcon className="h-4 w-4" />
          Payer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payer mon loyer</DialogTitle>
          <DialogDescription>
            Choisissez votre mode de paiement pour régler votre loyer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold">{propertyTitle}</h4>
                <p className="text-sm text-muted-foreground">
                  Échéance : {new Date(dueDate).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatPrice(amount)}{" "}
                  <span className="text-sm font-normal">F CFA</span>
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Mode de paiement</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="grid gap-2">
                {paymentMethods.map((method) => (
                  <Label
                    key={method.id}
                    htmlFor={method.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      paymentMethod === method.id
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <RadioGroupItem
                      value={method.id}
                      id={method.id}
                      className="sr-only"
                    />
                    <div
                      className={`h-8 w-8 rounded-full ${method.color} flex items-center justify-center`}
                    >
                      <method.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">{method.name}</span>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Phone Number Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0708123456"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className={phoneError ? "border-destructive" : ""}
            />
            {phoneError && (
              <p className="text-sm text-destructive">{phoneError}</p>
            )}
            {normalizedPhone && !phoneError && (
              <p className="text-xs text-muted-foreground">
                Numéro formaté : {normalizedPhone}
              </p>
            )}
          </div>

          {/* Pay Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handlePay}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>Payer {formatPrice(amount)} F CFA</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
