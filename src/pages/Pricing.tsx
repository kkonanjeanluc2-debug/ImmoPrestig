import { Check, Star, Zap, Building2, Crown, Menu, Home, ShoppingCart, MapPin, Shield, Clock, Smartphone, Users, FileText, CreditCard, BarChart3, Bell, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionPlans, SubscriptionPlan } from "@/hooks/useSubscriptionPlans";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionCheckoutDialog } from "@/components/subscription/SubscriptionCheckoutDialog";
import { DemoRequestButton } from "@/components/common/DemoRequestButton";
import logoImage from "@/assets/immoprestige-logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePlatformSetting } from "@/hooks/usePlatformSettings";
import { motion } from "framer-motion";

const planIcons: Record<string, React.ReactNode> = {
  Gratuit: <Zap className="h-6 w-6" />,
  Starter: <Building2 className="h-6 w-6" />,
  Pro: <Star className="h-6 w-6" />,
  Enterprise: <Crown className="h-6 w-6" />,
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Pricing = () => {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { data: discountSetting } = usePlatformSetting("yearly_discount_percentage");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const yearlyDiscountPercent = parseInt(discountSetting?.value || "20", 10);
  const activePlans = plans?.filter((plan) => plan.is_active) || [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-CI", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (user) {
      setSelectedPlan(plan);
      setCheckoutOpen(true);
    } else {
      navigate("/signup");
    }
  };

  const openPricing = () => {
    setPricingOpen(true);
  };

  const startFree = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/signup?plan=gratuit");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img src={logoImage} alt="ImmoPrestige" className="h-10 md:h-12" />
              <span className="font-bold text-lg md:text-xl">ImmoPrestige</span>
            </Link>
            <div className="hidden sm:flex items-center gap-3">
              <DemoRequestButton
                variant="outline"
                size="sm"
                className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
              />
              <Button variant="ghost" size="sm" onClick={openPricing}>Tarification</Button>
              {user ? (
                <Link to="/dashboard">
                  <Button size="sm">Tableau de bord</Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Se connecter</Button>
                  </Link>
                  <Button size="sm" onClick={startFree}>Commencer</Button>
                </>
              )}
            </div>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="sm:hidden">
                <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="top" className="pt-12">
                <div className="flex flex-col gap-3">
                  <DemoRequestButton variant="outline" className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200" onClick={() => setMobileMenuOpen(false)} />
                  <Button variant="ghost" className="w-full" onClick={() => { setMobileMenuOpen(false); openPricing(); }}>Tarification</Button>
                  {user ? (
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}><Button className="w-full">Tableau de bord</Button></Link>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}><Button variant="ghost" className="w-full">Se connecter</Button></Link>
                      <Button className="w-full" onClick={() => { setMobileMenuOpen(false); startFree(); }}>Commencer</Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden py-20 md:py-32 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
              🏆 N°1 de la gestion immobilière en Afrique
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-7xl font-display font-bold tracking-tight mb-6 leading-tight"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            Arrêtez de perdre de l'argent.
            <br />
            <span className="text-primary">Gérez comme un pro.</span>
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-4"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            Loyers impayés, contrats égarés, locataires introuvables ?
            <strong className="text-foreground"> C'est terminé.</strong> ImmoPrestige centralise toute votre gestion immobilière en une seule application pensée pour l'Afrique.
          </motion.p>

          <motion.p
            className="text-base text-muted-foreground max-w-2xl mx-auto mb-10"
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
          >
            Contrats numériques · Paiements en ligne · Quittances automatiques · Points mensuels · Suivi des impayés · CRM immobilier · Gestion de lotissements
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial="hidden" animate="visible" variants={fadeUp} custom={4}
          >
            <Button size="lg" className="text-lg px-10 py-6 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" onClick={startFree}>
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>

          <motion.p 
            className="mt-4 text-sm text-muted-foreground"
            initial="hidden" animate="visible" variants={fadeUp} custom={5}
          >
            ✓ Gratuit pour toujours · ✓ Sans carte bancaire · ✓ Configuration en 2 min
          </motion.p>
        </div>
      </section>

      {/* ===== PAIN POINTS ===== */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Vous reconnaissez-vous ?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Les propriétaires et agences qui ne digitalisent pas perdent en moyenne <strong className="text-destructive">30% de leurs revenus</strong> chaque année.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: CreditCard, problem: "Loyers impayés sans suivi", solution: "Alertes automatiques et suivi en temps réel de chaque paiement" },
              { icon: FileText, problem: "Contrats et quittances perdus", solution: "Documents numériques générés et stockés automatiquement" },
              { icon: Clock, problem: "Des heures perdues en paperasse", solution: "Automatisation complète : rappels, reçus, relances" },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                <Card className="h-full border-none shadow-md hover:shadow-lg transition-shadow bg-card">
                  <CardContent className="pt-8 pb-6 text-center">
                    <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                      <item.icon className="h-7 w-7 text-destructive" />
                    </div>
                    <p className="font-semibold text-foreground mb-2 line-through decoration-destructive/50">{item.problem}</p>
                    <p className="text-sm text-accent font-medium">→ {item.solution}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 3 MODULES ===== */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-4">Une seule application, trois modules essentiels</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Tout ce dont vous avez besoin,<br />
              <span className="text-primary">rien de superflu</span>
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Module 1: Gestion locative */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <Card className="h-full border-t-4 border-t-primary hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                    <Home className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Gestion Locative</CardTitle>
                  <CardDescription>Simplifiez la gestion de vos biens en toute sérénité</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {[
                      "Contrats numériques avec signature",
                      "Paiements en ligne (Mobile Money, wave, CB)",
                      "Quittances automatiques",
                      "Point mensuel du bailleur",
                      "Suivi et relance des impayés",
                      "États des lieux digitaux",
                      "Inventaire du bien pour location meublée",
                      "Quittances et contrats personnalisables",
                      "Rappels WhatsApp automatiques",
                    ].map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Module 2: CRM Immobilier */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <Card className="h-full border-t-4 border-t-accent hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-3">
                    <ShoppingCart className="h-7 w-7 text-accent" />
                  </div>
                  <CardTitle className="text-xl">CRM Immobilier</CardTitle>
                  <CardDescription>Gerez vos Ventes et Achats avec des outils puissants</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {[
                      "Création et suivi d'offres d'achat",
                      "Négociation directe avec vendeurs",
                      "Encaissement et échéanciers",
                      "Traçabilité complète des transactions",
                      "Gestion des prospects et acquéreurs",
                      "Suivi des mutations notariales",
                    ].map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Module 3: Lotissements */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
              <Card className="h-full border-t-4 border-t-secondary hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="h-14 w-14 rounded-2xl bg-secondary/20 flex items-center justify-center mb-3">
                    <MapPin className="h-7 w-7 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-xl">Lotissements</CardTitle>
                  <CardDescription>Administrez vos lotissements en toute simplicité</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {[
                      "Création d'îlots et parcelles en masse",
                      "PV de familles et conventions",
                      "Contrats de préfinancement signés",
                      "Signatures numériques intégrées",
                      "Démarches administratives centralisées",
                      "Traçabilité complète de chaque étape",
                    ].map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-secondary-foreground mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== WHY US ===== */}
      <section className="py-16 md:py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Pourquoi choisir ImmoPrestige ?
            </h2>
            <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto">
              Pensée pour les réalités africaines, notre solution vous fait gagner du temps, sécurise vos transactions et professionnalise vos activités.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Smartphone, title: "Web et Mobile", desc: "Gérez tout depuis votre PC ou téléphone, même hors connexion" },
              { icon: Shield, title: "Données sécurisées", desc: "Chiffrement de bout en bout, hébergement cloud fiable" },
              { icon: Bell, title: "Rappels automatiques", desc: "WhatsApp et email pour ne rien oublier" },
              { icon: BarChart3, title: "Tableaux de bord", desc: "Statistiques en temps réel pour piloter votre activité" },
            ].map((item, i) => (
              <motion.div key={i} className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary-foreground/15 flex items-center justify-center">
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-primary-foreground/70 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Ils nous font confiance
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-center">
            {[
              { value: "500+", label: "Biens gérés" },
              { value: "98%", label: "Taux de recouvrement" },
              { value: "2 min", label: "Pour démarrer" },
            ].map((stat, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                <div className="text-4xl md:text-5xl font-display font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA BEFORE PRICING ===== */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Prêt à transformer votre gestion immobilière ?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Rejoignez des centaines de propriétaires et agences qui ont dit adieu à la paperasse et aux loyers impayés.
            </p>
            <Button size="lg" className="text-lg px-10 py-6 shadow-lg shadow-primary/25 mb-4" onClick={startFree}>
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground">
              ✓ Aucun engagement · ✓ Plan gratuit inclus · ✓ Support WhatsApp
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== PRICING DIALOG ===== */}
      <Dialog open={pricingOpen} onOpenChange={setPricingOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0 text-center">
            <Badge variant="secondary" className="mb-4 mx-auto w-fit">Tarification simple et transparente</Badge>
            <DialogTitle className="text-2xl md:text-3xl font-display font-bold">
              Choisissez le forfait <span className="text-primary">adapté à vos besoins</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base max-w-2xl mx-auto">
              Commencez gratuitement, évoluez selon votre croissance.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 my-6">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-colors",
                  billingCycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
                  billingCycle === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Annuel
                <Badge variant="secondary" className="text-xs">Économisez jusqu'à {yearlyDiscountPercent}%</Badge>
              </button>
            </div>

            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="relative">
                    <CardHeader><Skeleton className="h-6 w-6 rounded-full mb-2" /><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-32 mt-2" /></CardHeader>
                    <CardContent><Skeleton className="h-10 w-full mb-4" /><div className="space-y-2">{[1, 2, 3, 4].map((j) => (<Skeleton key={j} className="h-4 w-full" />))}</div></CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {activePlans.map((plan) => {
                  const calculatedYearlyPrice = Math.round(plan.price_monthly * 12 * (1 - yearlyDiscountPercent / 100));
                  const price = billingCycle === "monthly" ? plan.price_monthly : calculatedYearlyPrice;
                  const features = Array.isArray(plan.features) ? plan.features : [];

                  return (
                    <Card
                      key={plan.id}
                      className={cn(
                        "relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                        plan.is_popular && "border-primary shadow-md ring-1 ring-primary",
                      )}
                    >
                      {plan.is_popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground shadow-sm">
                            <Star className="h-3 w-3 mr-1 fill-current" />Plus populaire
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="text-center pb-3">
                        <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          {planIcons[plan.name] || <Building2 className="h-5 w-5" />}
                        </div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <CardDescription className="text-xs min-h-[32px]">{plan.description || "Idéal pour démarrer"}</CardDescription>
                      </CardHeader>
                      <CardContent className="text-center pt-0">
                        <div className="mb-4">
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-3xl font-bold">{formatPrice(price)}</span>
                            <span className="text-sm text-muted-foreground">{plan.currency}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{billingCycle === "monthly" ? "par mois" : "par an"}</p>
                          {billingCycle === "yearly" && plan.price_monthly > 0 && (
                            <Badge variant="secondary" className="mt-1 text-xs">Économisez {yearlyDiscountPercent}%</Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-left mb-4">
                          {plan.max_properties && (
                            <div className="flex items-center gap-2 text-xs">
                              <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              <span>{plan.max_properties === 999999 ? "Biens illimités" : `Jusqu'à ${plan.max_properties} biens`}</span>
                            </div>
                          )}
                          {plan.max_tenants && (
                            <div className="flex items-center gap-2 text-xs">
                              <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              <span>{plan.max_tenants === 999999 ? "Locataires illimités" : `Jusqu'à ${plan.max_tenants} locataires`}</span>
                            </div>
                          )}
                          {plan.max_users && (
                            <div className="flex items-center gap-2 text-xs">
                              <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              <span>{plan.max_users === 999999 ? "Utilisateurs illimités" : `${plan.max_users} utilisateur${plan.max_users > 1 ? "s" : ""}`}</span>
                            </div>
                          )}
                          {features.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                              <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button className="w-full" size="sm" variant={plan.is_popular ? "default" : "outline"} onClick={() => handleSelectPlan(plan)}>
                          {plan.price_monthly === 0 ? "Commencer gratuitement" : "Choisir ce forfait"}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Frais de paramétrage */}
            <div className="mt-6 mx-auto max-w-2xl rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Check className="h-4 w-4 text-primary" />
                <span className="font-semibold">Frais de paramétrage : 150 000 FCFA</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Paiement unique incluant la configuration et l'accompagnement au démarrage pour prendre en main l'application, eventuellement.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAQ Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Questions fréquentes</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { q: "Puis-je changer de forfait ?", a: "Oui, vous pouvez passer à un forfait supérieur à tout moment. La différence sera calculée au prorata." },
              { q: "Comment fonctionne le paiement ?", a: "Nous acceptons Orange Money, MTN Money, Wave, Moov Money et les cartes bancaires pour votre confort." },
              { q: "Y a-t-il un engagement ?", a: "Non, tous nos forfaits sont sans engagement. Vous pouvez annuler à tout moment." },
              { q: "Mes données sont-elles sécurisées ?", a: "Absolument. Vos données sont chiffrées et hébergées sur des serveurs sécurisés." },
            ].map((item, i) => (
              <div key={i}>
                <h3 className="font-semibold mb-2">{item.q}</h3>
                <p className="text-muted-foreground text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            👉 Adoptez dès aujourd'hui l'application qui transforme votre quotidien immobilier.
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Rejoignez des centaines de propriétaires et agences qui font confiance à ImmoPrestige.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-lg px-10 py-6 shadow-lg shadow-primary/25" onClick={startFree}>
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" onClick={openPricing}>
              Tarification
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 ImmoPrestige. Tous droits réservés.</p>
        </div>
      </footer>

      {/* Checkout Dialog */}
      <SubscriptionCheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} plan={selectedPlan} billingCycle={billingCycle} />
    </div>
  );
};

export default Pricing;
