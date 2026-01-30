import { Check, Star, Zap, Building2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionPlans, SubscriptionPlan } from "@/hooks/useSubscriptionPlans";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionCheckoutDialog } from "@/components/subscription/SubscriptionCheckoutDialog";
import { DemoRequestButton } from "@/components/common/DemoRequestButton";
import logoImage from "@/assets/immoprestige-logo.png";

const planIcons: Record<string, React.ReactNode> = {
  "Gratuit": <Zap className="h-6 w-6" />,
  "Starter": <Building2 className="h-6 w-6" />,
  "Pro": <Star className="h-6 w-6" />,
  "Enterprise": <Crown className="h-6 w-6" />,
};

const Pricing = () => {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const activePlans = plans?.filter(plan => plan.is_active) || [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-CI", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getYearlySavings = (monthly: number, yearly: number) => {
    const monthlyTotal = monthly * 12;
    const savings = monthlyTotal - yearly;
    if (savings > 0) {
      return Math.round((savings / monthlyTotal) * 100);
    }
    return 0;
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (user) {
      // User is logged in, show checkout dialog
      setSelectedPlan(plan);
      setCheckoutOpen(true);
    } else {
      // Not logged in, redirect to signup
      navigate("/signup");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="ImmoPrestige" className="h-12" />
            <span className="font-bold text-xl">ImmoPrestige</span>
          </Link>
          <div className="flex items-center gap-4">
            <DemoRequestButton 
              variant="outline" 
              size="sm"
              className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
            />
            {user ? (
              <Link to="/">
                <Button>Accéder au tableau de bord</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Se connecter</Button>
                </Link>
                <Link to="/signup">
                  <Button>Commencer gratuitement</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            Tarification simple et transparente
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Choisissez le forfait
            <br />
            <span className="text-primary">adapté à vos besoins</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Gérez vos biens immobiliers en toute simplicité avec notre solution complète.
            Commencez gratuitement, évoluez selon vos besoins.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
                billingCycle === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annuel
              <Badge variant="secondary" className="text-xs">
                Économisez jusqu'à 20%
              </Badge>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="relative">
                  <CardHeader>
                    <Skeleton className="h-6 w-6 rounded-full mb-2" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-32 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full mb-4" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} className="h-4 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {activePlans.map((plan) => {
                const price = billingCycle === "monthly" ? plan.price_monthly : plan.price_yearly;
                const savings = getYearlySavings(plan.price_monthly, plan.price_yearly);
                const features = Array.isArray(plan.features) ? plan.features : [];

                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      "relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                      plan.is_popular && "border-primary shadow-md ring-1 ring-primary"
                    )}
                  >
                    {plan.is_popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground shadow-sm">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Plus populaire
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-4">
                      <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {planIcons[plan.name] || <Building2 className="h-6 w-6" />}
                      </div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription className="min-h-[40px]">
                        {plan.description || "Idéal pour démarrer"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="text-center">
                      <div className="mb-6">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold">
                            {formatPrice(price)}
                          </span>
                          <span className="text-muted-foreground">
                            {plan.currency}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {billingCycle === "monthly" ? "par mois" : "par an"}
                        </p>
                        {billingCycle === "yearly" && savings > 0 && (
                          <Badge variant="secondary" className="mt-2">
                            Économisez {savings}%
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-3 text-left mb-6">
                        {plan.max_properties && (
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            <span>
                              {plan.max_properties === 999999
                                ? "Biens illimités"
                                : `Jusqu'à ${plan.max_properties} biens`}
                            </span>
                          </div>
                        )}
                        {plan.max_tenants && (
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            <span>
                              {plan.max_tenants === 999999
                                ? "Locataires illimités"
                                : `Jusqu'à ${plan.max_tenants} locataires`}
                            </span>
                          </div>
                        )}
                        {plan.max_users && (
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            <span>
                              {plan.max_users === 999999
                                ? "Utilisateurs illimités"
                                : `${plan.max_users} utilisateur${plan.max_users > 1 ? "s" : ""}`}
                            </span>
                          </div>
                        )}
                        {features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button
                        className="w-full"
                        variant={plan.is_popular ? "default" : "outline"}
                        onClick={() => handleSelectPlan(plan)}
                      >
                        {plan.price_monthly === 0 ? "Commencer gratuitement" : "Choisir ce forfait"}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Questions fréquentes
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="font-semibold mb-2">Puis-je changer de forfait ?</h3>
              <p className="text-muted-foreground text-sm">
                Oui, vous pouvez passer à un forfait supérieur à tout moment. La différence sera calculée au prorata.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Comment fonctionne le paiement ?</h3>
              <p className="text-muted-foreground text-sm">
                Nous acceptons Orange Money, MTN Money, Wave, Moov Money et les cartes bancaires pour votre confort.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Y a-t-il un engagement ?</h3>
              <p className="text-muted-foreground text-sm">
                Non, tous nos forfaits sont sans engagement. Vous pouvez annuler à tout moment.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Mes données sont-elles sécurisées ?</h3>
              <p className="text-muted-foreground text-sm">
                Absolument. Vos données sont chiffrées et hébergées sur des serveurs sécurisés.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Prêt à simplifier votre gestion immobilière ?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Rejoignez des centaines de propriétaires et agences qui font confiance à ImmoPrestige.
          </p>
          <Link to="/signup">
            <Button size="lg" className="px-8">
              Commencer gratuitement
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 ImmoPrestige. Tous droits réservés.</p>
        </div>
      </footer>

      {/* Checkout Dialog */}
      <SubscriptionCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        plan={selectedPlan}
        billingCycle={billingCycle}
      />
    </div>
  );
};

export default Pricing;
