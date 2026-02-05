import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Smartphone, CreditCard, Wallet, ArrowRight, AlertTriangle, Calculator, TrendingDown, TrendingUp } from "lucide-react";
import type { SubscriptionPlan } from "@/hooks/useSubscriptionPlans";
import { useAgencySubscription } from "@/hooks/useAgencySubscription";
import { calculateProration, formatProrationSummary, type ProrationResult } from "@/lib/prorationUtils";

interface SubscriptionCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  billingCycle: "monthly" | "yearly";
}

// Payment methods with provider information
const paymentMethods = [
  { id: "orange_money", name: "Orange Money", icon: Smartphone, color: "bg-orange-500", fedapayMode: "Orange CI", provider: "fedapay" },
  { id: "mtn_money", name: "MTN Money", icon: Smartphone, color: "bg-yellow-500", fedapayMode: "MTN CI", provider: "fedapay" },
  { id: "wave", name: "Wave (via FedaPay)", icon: Wallet, color: "bg-blue-400", fedapayMode: "Wave CI", provider: "fedapay" },
  { id: "wave_direct", name: "Wave Direct", icon: Wallet, color: "bg-blue-600", fedapayMode: null, provider: "wave_ci", description: "Paiement direct Wave" },
  { id: "moov", name: "Moov Money", icon: Smartphone, color: "bg-blue-500", fedapayMode: "Moov CI", provider: "fedapay" },
  { id: "card", name: "Carte bancaire", icon: CreditCard, color: "bg-muted-foreground", fedapayMode: null, provider: "fedapay" },
  { id: "pawapay_mtn", name: "MTN (PawaPay)", icon: Smartphone, color: "bg-yellow-600", fedapayMode: null, provider: "pawapay", description: "Via PawaPay" },
  { id: "pawapay_orange", name: "Orange (PawaPay)", icon: Smartphone, color: "bg-orange-600", fedapayMode: null, provider: "pawapay", description: "Via PawaPay" },
  { id: "kkiapay", name: "KKiaPay", icon: CreditCard, color: "bg-red-500", fedapayMode: null, provider: "kkiapay", description: "Mobile Money & Carte" },
];

export function SubscriptionCheckoutDialog({
  open,
  onOpenChange,
  plan,
  billingCycle,
}: SubscriptionCheckoutDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("orange_money");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Get current subscription to detect plan change
  const { data: currentSubscription } = useAgencySubscription();

  // Normalize phone number to international format for display
  const normalizeIvorianPhone = (phone: string): string | null => {
    if (!phone.trim()) return null;

    // Keep digits only
    let digits = phone.replace(/\D/g, "");

    // Remove country code if present
    if (digits.startsWith("225")) {
      digits = digits.slice(3);
    }

    // Normalize to 10 digits starting with 0 when possible
    if (digits.length === 9 && !digits.startsWith("0")) {
      digits = `0${digits}`;
    }

    // Accept new format (10 digits starting with 0) or legacy (8 digits)
    const isNewFormat = digits.length === 10 && digits.startsWith("0");
    const isLegacyFormat = digits.length === 8;

    if (!isNewFormat && !isLegacyFormat) {
      return null;
    }

    return `+225${digits}`;
  };

  // Validate Ivorian phone number (10 digits starting with 0)
  const validateIvorianPhone = (phone: string): string | null => {
    if (!phone.trim()) {
      return "Veuillez entrer votre numéro de téléphone";
    }
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, "");
    
    // Remove country code if present
    let cleanedDigits = digits;
    if (digits.startsWith("225")) {
      cleanedDigits = digits.slice(3);
    }
    
    // Check if it starts with 0 (add it back if missing for local format check)
    const hasLeadingZero = cleanedDigits.startsWith("0");
    
    // For CI: local format is 10 digits starting with 0 (e.g., 0708298281)
    // Or 9 digits without leading 0 (which we'll accept too)
    if (cleanedDigits.length === 10 && hasLeadingZero) {
      return null; // Valid: 0xxxxxxxxx
    }
    
    if (cleanedDigits.length === 9 && !hasLeadingZero) {
      return null; // Valid: xxxxxxxxx (without leading 0)
    }
    
    if (cleanedDigits.length === 8) {
      return null; // Valid: legacy 8-digit format
    }
    
    return "Format invalide. Entrez 10 chiffres commençant par 0 (ex: 0708298281)";
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    // Clear error when user starts typing
    if (phoneError) {
      setPhoneError(null);
    }
  };

  // Get normalized phone for display
  const normalizedPhone = normalizeIvorianPhone(phoneNumber);
  
  // Get selected payment method details
  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethod);

  // Calculate proration for plan changes - MUST be before any early returns to follow Rules of Hooks
  const proration: ProrationResult | null = useMemo(() => {
    try {
      if (!plan || !currentSubscription || currentSubscription.plan_id === plan.id) return null;
      if (!currentSubscription.plan) return null;

      const selectedPlanPrice = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
      if (selectedPlanPrice === 0) return null; // Free plan

      const currentPlanPrice = currentSubscription.billing_cycle === "yearly"
        ? currentSubscription.plan.price_yearly
        : currentSubscription.plan.price_monthly;

      const newPlanPrice = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;

      // Parse dates
      const startDate = new Date(currentSubscription.starts_at);
      const endDate = currentSubscription.ends_at ? new Date(currentSubscription.ends_at) : null;

      if (Number.isNaN(startDate.getTime())) return null;
      if (endDate && Number.isNaN(endDate.getTime())) return null;

      return calculateProration(
        currentPlanPrice,
        newPlanPrice,
        startDate,
        endDate,
        currentSubscription.billing_cycle as "monthly" | "yearly"
      );
    } catch (e) {
      console.error("Proration calculation failed", e);
      return null;
    }
  }, [currentSubscription, plan, billingCycle]);

  if (!plan) return null;

  const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
  const isFree = price === 0;
  
  // Detect if this is a plan change (upgrade/downgrade)
  const isChangingPlan = currentSubscription && currentSubscription.plan_id !== plan.id;
  const currentPlanName = currentSubscription?.plan?.name;
  const isUpgrade = currentSubscription && plan.price_monthly > currentSubscription.plan.price_monthly;
  const isDowngrade = currentSubscription && plan.price_monthly < currentSubscription.plan.price_monthly;

  const prorationSummary = proration ? formatProrationSummary(proration) : null;
  
  // Final amount to charge (prorated if changing plan, full price otherwise)
  const finalAmount = proration ? Math.max(0, proration.amountDue) : price;
  const hasCredit = proration && proration.amountDue < 0;

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

    // Validate phone number for mobile money payments
    if (paymentMethod !== "card" && !isFree) {
      const validationError = validateIvorianPhone(phoneNumber);
      if (validationError) {
        setPhoneError(validationError);
        toast({
          variant: "destructive",
          title: "Numéro invalide",
          description: validationError,
        });
        return;
      }
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

      // Determine which edge function to call based on payment method
      const selectedMethodData = paymentMethods.find((m) => m.id === paymentMethod);
      const provider = selectedMethodData?.provider;
      
      let edgeFunctionName: string;
      let requestBody: Record<string, unknown>;
      
      if (provider === "kkiapay") {
        edgeFunctionName = "kkiapay-checkout";
        requestBody = {
          plan_id: plan.id,
          billing_cycle: billingCycle,
          payment_method: paymentMethod,
          customer_name: "", // Will be filled from user profile
          customer_email: "", // Will be filled from session
          customer_phone: phoneNumber,
        };
      } else if (provider === "pawapay") {
        edgeFunctionName = "pawapay-checkout";
        // Extract actual payment method from pawapay_mtn -> mtn_money
        const actualMethod = paymentMethod.replace("pawapay_", "") + "_money";
        requestBody = {
          plan_id: plan.id,
          billing_cycle: billingCycle,
          payment_method: actualMethod === "orange_money" ? "orange_money" : actualMethod === "mtn_money" ? "mtn_money" : paymentMethod.replace("pawapay_", ""),
          customer_phone: phoneNumber,
          country_code: "CI",
          return_url: window.location.origin + "/settings?tab=subscription",
          proration: proration ? {
            remaining_days: proration.remainingDays,
            total_days: proration.totalDays,
            current_plan_credit: proration.currentPlanCredit,
            new_plan_prorata_cost: proration.newPlanProrataCost,
            amount_due: proration.amountDue,
          } : null,
        };
      } else if (provider === "wave_ci") {
        edgeFunctionName = "wave-checkout";
        requestBody = {
          plan_id: plan.id,
          billing_cycle: billingCycle,
          customer_phone: phoneNumber,
          return_url: window.location.origin + "/settings?tab=subscription",
        };
      } else {
        edgeFunctionName = "fedapay-checkout";
        requestBody = {
          plan_id: plan.id,
          billing_cycle: billingCycle,
          payment_method: paymentMethod,
          customer_phone: phoneNumber,
          return_url: window.location.origin + "/settings?tab=subscription",
          proration: proration ? {
            remaining_days: proration.remainingDays,
            total_days: proration.totalDays,
            current_plan_credit: proration.currentPlanCredit,
            new_plan_prorata_cost: proration.newPlanProrataCost,
            amount_due: proration.amountDue,
          } : null,
        };
      }

      const response = await supabase.functions.invoke(edgeFunctionName, {
        body: requestBody,
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

      // Handle PawaPay USSD push (no redirect URL)
      if (data.provider === "pawapay" && data.success && !data.payment_url) {
        toast({
          title: "Notification envoyée",
          description: data.message || "Veuillez confirmer le paiement sur votre téléphone.",
        });
        onOpenChange(false);
        return;
      }

      if (data.payment_url) {
        // Redirect to payment page (FedaPay or Wave)
        window.location.href = data.payment_url;
      } else if (data.success) {
        // Handle cases where payment is initiated but no redirect needed
        toast({
          title: "Paiement initié",
          description: data.message || "Veuillez suivre les instructions sur votre téléphone.",
        });
        onOpenChange(false);
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isChangingPlan 
              ? `Changer vers le forfait ${plan.name}` 
              : `Souscrire au forfait ${plan.name}`}
          </DialogTitle>
          <DialogDescription>
            {isFree
              ? "Ce forfait est gratuit, aucun paiement requis."
              : isChangingPlan
                ? "Votre nouveau forfait prendra effet immédiatement."
                : "Choisissez votre mode de paiement préféré."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan Change Alert */}
          {isChangingPlan && (
            <Alert variant={isDowngrade ? "destructive" : "default"} className={isUpgrade ? "border-emerald bg-emerald/10" : ""}>
              {isUpgrade ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <AlertDescription className="ml-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{currentPlanName}</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant={isUpgrade ? "default" : "secondary"}>{plan.name}</Badge>
                </div>
                <p className="mt-2 text-sm">
                  {isUpgrade 
                    ? "Mise à niveau : vous aurez accès à plus de fonctionnalités dès le paiement validé."
                    : "Rétrogradation : certaines fonctionnalités ne seront plus disponibles."}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Proration Details */}
          {proration && prorationSummary && !isFree && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Calcul au prorata</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jours restants sur l'abonnement actuel</span>
                  <span className="font-medium">{proration.remainingDays} jours ({proration.remainingPercentage.toFixed(0)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédit forfait actuel</span>
                  <span className="font-medium text-emerald">-{formatPrice(proration.currentPlanCredit)} XOF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coût nouveau forfait (prorata)</span>
                  <span className="font-medium">+{formatPrice(proration.newPlanProrataCost)} XOF</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {hasCredit ? "Crédit à votre compte" : "Montant à payer"}
                  </span>
                  <span className={`font-bold text-lg ${hasCredit ? "text-emerald" : "text-primary"}`}>
                    {hasCredit ? `+${formatPrice(Math.abs(proration.amountDue))}` : formatPrice(proration.amountDue)} XOF
                  </span>
                </div>
              </div>

              {hasCredit && (
                <p className="text-xs text-muted-foreground bg-emerald/10 p-2 rounded">
                  Ce crédit sera automatiquement appliqué à votre prochaine facture.
                </p>
              )}
            </div>
          )}

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
                {proration ? (
                  <>
                    <p className="text-sm text-muted-foreground line-through">
                      {formatPrice(price)} {plan.currency}
                    </p>
                    <p className="text-2xl font-bold">
                      {hasCredit ? "0" : formatPrice(finalAmount)} <span className="text-sm font-normal">{plan.currency}</span>
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold">
                    {formatPrice(price)} <span className="text-sm font-normal">{plan.currency}</span>
                  </p>
                )}
                {billingCycle === "yearly" && !proration && (
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
                        <div className="flex-1">
                          <span className="font-medium">{method.name}</span>
                          {(method as any).description && (
                            <p className="text-xs text-muted-foreground">{(method as any).description}</p>
                          )}
                        </div>
                        {method.provider === "wave_ci" && (
                          <Badge variant="secondary" className="text-xs">Direct</Badge>
                        )}
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
                    placeholder="0708298281"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className={phoneError ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {phoneError ? (
                    <p className="text-xs text-destructive">{phoneError}</p>
                  ) : normalizedPhone ? (
                    <p className="text-xs text-muted-foreground">
                      Numéro envoyé au paiement : <span className="font-medium text-foreground">{normalizedPhone}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Format: 10 chiffres commençant par 0 (ex: 0708298281)
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Payment mode confirmation */}
          {!isFree && selectedMethod && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              {selectedMethod.provider === "wave_ci" ? (
                <>
                  <p className="text-sm text-center">
                    <span className="text-muted-foreground">Paiement via : </span>
                    <span className="font-semibold text-primary">Wave Direct API</span>
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Vous serez redirigé vers l'application Wave pour confirmer le paiement
                  </p>
                </>
              ) : selectedMethod.fedapayMode ? (
                <>
                  <p className="text-sm text-center">
                    <span className="text-muted-foreground">Mode préféré : </span>
                    <span className="font-semibold text-primary">{selectedMethod.fedapayMode}</span>
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Vous pourrez confirmer votre opérateur sur la page de paiement FedaPay
                  </p>
                </>
              ) : null}
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full"
            size="lg"
            variant={hasCredit ? "secondary" : "default"}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Traitement en cours...
              </>
            ) : isFree ? (
              isChangingPlan ? "Changer vers ce forfait" : "Activer le forfait gratuit"
            ) : hasCredit ? (
              "Confirmer le changement (crédit appliqué)"
            ) : isChangingPlan && proration ? (
              `Payer ${formatPrice(finalAmount)} ${plan.currency} (prorata)`
            ) : isChangingPlan ? (
              `Changer de forfait - ${formatPrice(price)} ${plan.currency}`
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
