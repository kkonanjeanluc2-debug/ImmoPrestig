import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Smartphone, CreditCard, Wallet } from "lucide-react";
import type { SubscriptionPlan } from "@/hooks/useSubscriptionPlans";

interface SubscriptionCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  billingCycle: "monthly" | "yearly";
}

const paymentMethods = [
  { id: "orange_money", name: "Orange Money", icon: Smartphone, color: "bg-orange-500" },
  { id: "mtn_money", name: "MTN Money", icon: Smartphone, color: "bg-yellow-500" },
  { id: "wave", name: "Wave", icon: Wallet, color: "bg-blue-500" },
  { id: "moov", name: "Moov Money", icon: Smartphone, color: "bg-blue-600" },
  { id: "card", name: "Carte bancaire", icon: CreditCard, color: "bg-gray-600" },
];

export function SubscriptionCheckoutDialog({
  open,
  onOpenChange,
  plan,
  billingCycle,
}: SubscriptionCheckoutDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("orange_money");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!plan) return null;

  const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
  const isFree = price === 0;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("fr-CI", {
      style: "decimal",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner un mode de paiement",
      });
      return;
    }

    if (paymentMethod !== "card" && !phoneNumber && !isFree) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez entrer votre numéro de téléphone",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Vous devez être connecté pour continuer",
        });
        navigate("/login");
        return;
      }

      const response = await supabase.functions.invoke("fedapay-checkout", {
        body: {
          plan_id: plan.id,
          billing_cycle: billingCycle,
          payment_method: paymentMethod,
          customer_phone: phoneNumber,
          return_url: window.location.origin + "/settings?tab=subscription",
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.success && isFree) {
        toast({
          title: "Forfait activé !",
          description: `Votre forfait ${plan.name} a été activé avec succès.`,
        });
        onOpenChange(false);
        return;
      }

      if (data.payment_url) {
        // Redirect to FedaPay payment page
        window.location.href = data.payment_url;
      } else {
        throw new Error("URL de paiement non reçue");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        variant: "destructive",
        title: "Erreur de paiement",
        description: error.message || "Une erreur est survenue lors du paiement",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Souscrire au forfait {plan.name}</DialogTitle>
          <DialogDescription>
            {isFree
              ? "Ce forfait est gratuit, aucun paiement requis."
              : "Choisissez votre mode de paiement préféré."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold">{plan.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {billingCycle === "yearly" ? "Facturation annuelle" : "Facturation mensuelle"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatPrice(price)} <span className="text-sm font-normal">{plan.currency}</span>
                </p>
                {billingCycle === "yearly" && (
                  <Badge variant="secondary" className="mt-1">
                    Économisez {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {!isFree && (
            <>
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
                        <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                        <div className={`h-8 w-8 rounded-full ${method.color} flex items-center justify-center`}>
                          <method.icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium">{method.name}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Phone Number Input (for mobile money) */}
              {paymentMethod !== "card" && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+225 07 00 00 00 00"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Vous recevrez une demande de paiement sur ce numéro.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Traitement en cours...
              </>
            ) : isFree ? (
              "Activer le forfait gratuit"
            ) : (
              `Payer ${formatPrice(price)} ${plan.currency}`
            )}
          </Button>

          {!isFree && (
            <p className="text-xs text-center text-muted-foreground">
              Paiement sécurisé via FedaPay. Vos informations sont protégées.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
