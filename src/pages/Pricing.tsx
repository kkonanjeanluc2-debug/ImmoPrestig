import {
  Check,
  Star,
  Zap,
  Building2,
  Crown,
  Menu,
  Home,
  ShoppingCart,
  MapPin,
  Shield,
  Clock,
  Smartphone,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Bell,
  ArrowRight,
  X,
  Layers,
  PenTool,
  Globe,
  Landmark,
  Scale,
  TrendingUp,
} from "lucide-react";
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
import { usePlatformBranding } from "@/hooks/usePlatformBranding";
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
  const { data: setupFeeSetting } = usePlatformSetting("setup_fee_message_enabled");
  const showSetupFee = setupFeeSetting?.value !== "false";
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "semi_annual" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { logoUrl: platformLogo, appName: platformAppName } = usePlatformBranding();

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
      navigate(`/signup?plan=${encodeURIComponent(plan.id)}&plan_name=${encodeURIComponent(plan.name)}`);
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
      {/* Header / Nav */}
      <nav
        role="navigation"
        aria-label="Navigation principale"
        className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50"
      >
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img src={platformLogo} alt={platformAppName} className="h-10 md:h-12" />
              <span className="font-bold text-lg md:text-xl">{platformAppName}</span>
            </Link>
            <div className="hidden sm:flex items-center gap-3">
              <DemoRequestButton
                variant="outline"
                size="sm"
                className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
              />
              <Button variant="ghost" size="sm" onClick={openPricing}>
                Tarification
              </Button>
              {user ? (
                <Link to="/dashboard">
                  <Button size="sm">Tableau de bord</Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      Se connecter
                    </Button>
                  </Link>
                  <Button size="sm" onClick={startFree}>
                    Commencer
                  </Button>
                </>
              )}
            </div>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="sm:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="pt-12">
                <div className="flex flex-col gap-3">
                  <DemoRequestButton
                    variant="outline"
                    className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openPricing();
                    }}
                  >
                    Tarification
                  </Button>
                  {user ? (
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full">Tableau de bord</Button>
                    </Link>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full">
                          Se connecter
                        </Button>
                      </Link>
                      <Button
                        className="w-full"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          startFree();
                        }}
                      >
                        Commencer
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main>
        {/* ===== HERO SECTION ===== */}
        <section
          aria-label="Présentation ImmoPrestige"
          className="relative overflow-hidden py-20 md:py-32 bg-gradient-to-br from-primary/5 via-background to-accent/5"
        >
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
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
            >
              Arrêtez de perdre de l'argent.
              <br />
              <span className="text-primary">Gérez comme un pro.</span>
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-4"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
            >
              Loyers impayés, contrats égarés, locataires introuvables ?
              <strong className="text-foreground"> C'est terminé.</strong> {platformAppName} centralise toute votre
              gestion immobilière en une seule application pensée pour l'Afrique.
            </motion.p>

            <motion.p
              className="text-base text-muted-foreground max-w-2xl mx-auto mb-10"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={3}
            >
              Contrats numériques · Paiements en ligne · Quittances automatiques · Points mensuels · Suivi des impayés ·
              CRM immobilier · Gestion de lotissements
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={4}
            >
              <Button
                size="lg"
                className="text-lg px-10 py-6 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                onClick={startFree}
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>

            <motion.p
              className="mt-4 text-sm text-muted-foreground"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={5}
            >
              ✓ Gratuit pour toujours · ✓ Sans carte bancaire · ✓ Configuration en 2 min
            </motion.p>
          </div>
        </section>

        {/* ===== PAIN POINTS ===== */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-14"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Vous reconnaissez-vous ?</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Les propriétaires et agences qui ne digitalisent pas perdent en moyenne{" "}
                <strong className="text-destructive">30% de leurs revenus</strong> chaque année.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  icon: CreditCard,
                  problem: "Loyers impayés sans suivi",
                  solution: "Alertes automatiques et suivi en temps réel de chaque paiement",
                },
                {
                  icon: FileText,
                  problem: "Contrats et quittances perdus",
                  solution: "Documents numériques générés et stockés automatiquement",
                },
                {
                  icon: Clock,
                  problem: "Des heures perdues en paperasse",
                  solution: "Automatisation complète : rappels, reçus, relances",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                >
                  <Card className="h-full border-none shadow-md hover:shadow-lg transition-shadow bg-card">
                    <CardContent className="pt-8 pb-6 text-center">
                      <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                        <item.icon className="h-7 w-7 text-destructive" />
                      </div>
                      <p className="font-semibold text-foreground mb-2 line-through decoration-destructive/50">
                        {item.problem}
                      </p>
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
            <motion.div
              className="text-center mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <Badge variant="secondary" className="mb-4">
                Une seule application, trois modules essentiels
              </Badge>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Tout ce dont vous avez besoin,
                <br />
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
            <motion.div
              className="text-center mb-14"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Pourquoi choisir {platformAppName} ?</h2>
              <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto">
                Pensée pour les réalités africaines, notre solution vous fait gagner du temps, sécurise vos transactions
                et professionnalise vos activités.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { icon: Smartphone, title: "Web et Mobile", desc: "Gérez tout depuis votre PC ou téléphone" },
                {
                  icon: Shield,
                  title: "Données sécurisées",
                  desc: "Chiffrement de bout en bout, hébergement cloud fiable",
                },
                { icon: Bell, title: "Rappels automatiques", desc: "WhatsApp et email pour ne rien oublier" },
                {
                  icon: BarChart3,
                  title: "Tableaux de bord",
                  desc: "Statistiques en temps réel pour piloter votre activité",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                >
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

        {/* ===== AI ADVISOR HIGHLIGHT ===== */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-accent/5 via-background to-primary/5 relative overflow-hidden">
          <div className="absolute top-10 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              className="max-w-5xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                {/* Text */}
                <div>
                  <Badge variant="secondary" className="mb-4 text-sm px-4 py-1.5">
                    🤖 Intelligence Artificielle intégrée
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 leading-tight">
                    Un conseiller IA
                    <br />
                    <span className="text-primary">à vos côtés 24h/24</span>
                  </h2>
                  <p className="text-muted-foreground text-lg mb-6">
                    Notre assistant intelligent analyse vos données en temps réel et vous donne des{" "}
                    <strong className="text-foreground">recommandations personnalisées</strong> pour maximiser vos
                    revenus et accélérer vos transactions.
                  </p>
                  <ul className="space-y-4 mb-8">
                    {[
                      {
                        icon: <Scale className="h-5 w-5" />,
                        text: "Stratégies de recouvrement des impayés adaptées au droit OHADA",
                      },
                      {
                        icon: <TrendingUp className="h-5 w-5" />,
                        text: "Conseils de négociation et optimisation des ventes immobilières",
                      },
                      {
                        icon: <BarChart3 className="h-5 w-5" />,
                        text: "Analyse des parcelles et recommandations de commercialisation",
                      },
                      {
                        icon: <Zap className="h-5 w-5" />,
                        text: "Réponses instantanées basées sur vos données réelles",
                      },
                    ].map((item, i) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-3"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                        custom={i + 1}
                      >
                        <span className="flex-shrink-0 mt-0.5 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          {item.icon}
                        </span>
                        <span className="text-sm text-foreground leading-relaxed pt-1">{item.text}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <Button size="lg" className="shadow-lg shadow-primary/25" onClick={startFree}>
                    Essayer l'assistant IA
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
                {/* Visual card mockup */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={2}
                >
                  <Card className="border-none shadow-2xl bg-card/80 backdrop-blur-sm">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Conseiller IA</p>
                          <p className="text-xs text-muted-foreground">En ligne · Analyse en cours</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-muted/50 rounded-xl rounded-tl-none p-3 text-sm max-w-[85%]">
                          <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                            <Scale className="h-3.5 w-3.5 text-primary" /> Analyse de vos impayés
                          </p>
                          <p className="text-muted-foreground text-xs">
                            3 locataires ont plus de 2 mois d'impayés. Je recommande d'envoyer une mise en demeure
                            formelle conforme au droit OHADA, puis de proposer un plan d'apurement sur 3 mois.
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-xl rounded-tl-none p-3 text-sm max-w-[85%]">
                          <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Optimisation ventes
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Votre bien à Cocody est en vente depuis 45 jours. Suggestion : réduire le prix de 5% ou
                            proposer un paiement échelonné pour attirer plus d'acquéreurs.
                          </p>
                        </div>
                        <div className="bg-primary/10 rounded-xl rounded-tr-none p-3 text-sm ml-auto max-w-[75%]">
                          <p className="text-foreground text-xs">Comment optimiser le recouvrement ce mois-ci ?</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        {[
                          { icon: <Scale className="h-3 w-3" />, label: "Impayés" },
                          { icon: <TrendingUp className="h-3 w-3" />, label: "Ventes" },
                          { icon: <BarChart3 className="h-3 w-3" />, label: "Parcelles" },
                        ].map((tag) => (
                          <span
                            key={tag.label}
                            className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1"
                          >
                            {tag.icon} {tag.label}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== SOCIAL PROOF ===== */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-12"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Ils nous font confiance</h2>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-center">
              {[
                { value: "500+", label: "Biens gérés" },
                { value: "98%", label: "Taux de recouvrement" },
                { value: "2 min", label: "Pour démarrer" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                >
                  <div className="text-4xl md:text-5xl font-display font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-muted-foreground font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== SEO CONTENT: USE CASES ===== */}
        <section aria-label="Fonctionnalités de gestion immobilière" className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <Badge variant="secondary" className="mb-4">
                La solution complète pour l'immobilier en Afrique
              </Badge>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Un logiciel immobilier pour chaque besoin
              </h2>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
                Que vous soyez propriétaire bailleur, agence immobilière ou promoteur, {platformAppName} s'adapte à
                votre activité immobilière en Côte d'Ivoire et en Afrique.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {[
                {
                  icon: Home,
                  title: "Gestion locative simplifiée",
                  desc: "Automatisez la gestion locative de vos biens immobiliers. Suivi des loyers, génération automatique de quittances de loyer, contrats de bail numériques, rappels de paiement par WhatsApp et email. Idéal pour les propriétaires bailleurs et agences de gestion locative en Côte d'Ivoire.",
                  keywords: [
                    "Gestion des locataires",
                    "Suivi des loyers",
                    "Quittances automatiques",
                    "Contrats de bail",
                    "États des lieux",
                  ],
                },
                {
                  icon: Layers,
                  title: "Gestion de lotissements",
                  desc: "Le module lotissement le plus complet d'Afrique. Créez et gérez vos lotissements, îlots et parcelles. Suivez les ventes de terrains, les échéanciers de paiement, les démarches administratives et les documents juridiques. Parfait pour les promoteurs immobiliers et lotisseurs.",
                  keywords: [
                    "Création d'îlots",
                    "Gestion de parcelles",
                    "Vente de terrains",
                    "Échéanciers",
                    "Documents juridiques",
                  ],
                },
                {
                  icon: ShoppingCart,
                  title: "Ventes immobilières et CRM",
                  desc: "Gérez toutes vos ventes immobilières avec un CRM immobilier puissant. Suivi des prospects et acquéreurs, offres d'achat, négociations, encaissements et mutations notariales. L'outil indispensable pour les agences immobilières qui veulent professionnaliser leurs transactions.",
                  keywords: [
                    "CRM immobilier",
                    "Gestion des prospects",
                    "Offres d'achat",
                    "Transactions immobilières",
                    "Mutations notariales",
                  ],
                },
                {
                  icon: Globe,
                  title: "Application immobilière mobile",
                  desc: "Accédez à votre application immobilière depuis n'importe quel appareil. {platformAppName} fonctionne sur smartphone, tablette et ordinateur. Paiements en ligne via Orange Money, Wave, MTN Money intégrés pour le marché africain.",
                  keywords: ["Application mobile", "Mobile Money", "Wave", "Orange Money"],
                },
              ].map((item, i) => (
                <motion.article
                  key={i}
                  className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {item.desc.replace("{platformAppName}", platformAppName)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.keywords.map((kw, j) => (
                          <span key={j} className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CTA BEFORE PRICING ===== */}
        <section aria-label="Appel à l'action" className="py-16 md:py-20 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="container mx-auto px-4 text-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Prêt à transformer votre gestion immobilière ?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Rejoignez des centaines de propriétaires et agences immobilières qui ont digitalisé leur gestion
                locative, leurs lotissements et leurs ventes immobilières avec {platformAppName}.
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
              <Badge variant="secondary" className="mb-4 mx-auto w-fit">
                Tarification simple et transparente
              </Badge>
              <DialogTitle className="text-2xl md:text-3xl font-display font-bold">
                Choisissez le forfait <span className="text-primary">adapté à vos besoins</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-base max-w-2xl mx-auto">
                Commencez gratuitement, évoluez selon votre croissance.
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-6">
              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-2 my-6 flex-wrap">
                {([
                  { key: "monthly" as const, label: "Mensuel" },
                  { key: "quarterly" as const, label: "Trimestriel" },
                  { key: "semi_annual" as const, label: "Semestriel" },
                  { key: "yearly" as const, label: "Annuel" },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setBillingCycle(opt.key)}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium transition-colors",
                      billingCycle === opt.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                {billingCycle !== "monthly" && (
                  <Badge variant="secondary" className="text-xs">
                    Économisez jusqu'à {yearlyDiscountPercent}%
                  </Badge>
                )}
              </div>

              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                  {activePlans.map((plan) => {
                    const priceMap: Record<string, number> = {
                      monthly: plan.price_monthly,
                      quarterly: plan.price_quarterly,
                      semi_annual: plan.price_semi_annual,
                      yearly: plan.price_yearly,
                    };
                    const price = priceMap[billingCycle] ?? plan.price_monthly;
                    const periodLabel: Record<string, string> = {
                      monthly: "par mois",
                      quarterly: "par trimestre",
                      semi_annual: "par semestre",
                      yearly: "par an",
                    };
                    const months: Record<string, number> = { monthly: 1, quarterly: 3, semi_annual: 6, yearly: 12 };
                    const savingsPercent = billingCycle !== "monthly" && plan.price_monthly > 0
                      ? Math.round((1 - price / (plan.price_monthly * months[billingCycle])) * 100)
                      : 0;
                    const features = Array.isArray(plan.features) ? plan.features : [];

                    return (
                      <Card
                        key={plan.id}
                        className={cn(
                          "relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col h-full",
                          plan.is_popular && "border-primary shadow-md ring-1 ring-primary",
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
                        <CardHeader className="text-center pb-3">
                          <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {planIcons[plan.name] || <Building2 className="h-5 w-5" />}
                          </div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <CardDescription className="text-xs min-h-[32px]">
                            {plan.description || "Idéal pour démarrer"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center pt-0">
                          <div className="mb-4">
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-3xl font-bold">{formatPrice(price)}</span>
                              <span className="text-sm text-muted-foreground">{plan.currency}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {periodLabel[billingCycle]}
                            </p>
                            {savingsPercent > 0 && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                Économisez {savingsPercent}%
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-2 text-left mb-4">
                            {plan.max_properties && (
                              <div className="flex items-center gap-2 text-xs">
                                <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                <span>
                                  {plan.max_properties === 999999
                                    ? "Biens illimités"
                                    : `Jusqu'à ${plan.max_properties} biens`}
                                </span>
                              </div>
                            )}
                            {plan.max_tenants && (
                              <div className="flex items-center gap-2 text-xs">
                                <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                <span>
                                  {plan.max_tenants === 999999
                                    ? "Locataires illimités"
                                    : `Jusqu'à ${plan.max_tenants} locataires`}
                                </span>
                              </div>
                            )}
                            {plan.max_users && (
                              <div className="flex items-center gap-2 text-xs">
                                <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                <span>
                                  {plan.max_users === 999999
                                    ? "Utilisateurs illimités"
                                    : `${plan.max_users} utilisateur${plan.max_users > 1 ? "s" : ""}`}
                                </span>
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
                          <Button
                            className="w-full"
                            size="sm"
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

              {/* Frais de paramétrage */}
              {showSetupFee && (
              <div className="mt-6 mx-auto max-w-2xl rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="font-semibold">
                    Frais de paramétrage pour paiements loyers en ligne + Formation : 150 000 FCFA
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paiement unique incluant la configuration et l'accompagnement au démarrage pour prendre en main
                  l'application, eventuellement.
                </p>
              </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* FAQ Section */}
        <section aria-label="Questions fréquentes" className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Questions fréquentes sur la gestion immobilière</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {[
                {
                  q: "Qu'est-ce qu'ImmoPrestige ?",
                  a: "ImmoPrestige est un logiciel de gestion immobilière et locative en ligne, conçu pour les agences immobilières, propriétaires et bailleurs en Côte d'Ivoire et en Afrique. Il centralise la gestion des biens, locataires, loyers, contrats et lotissements.",
                },
                {
                  q: "Comment fonctionne le paiement des loyers en ligne ?",
                  a: "ImmoPrestige intègre les paiements Mobile Money (Orange Money, MTN Money, Moov Money), Wave et les cartes bancaires. Les locataires peuvent payer directement en ligne et les quittances sont générées automatiquement.",
                },
                {
                  q: "ImmoPrestige est-il gratuit ?",
                  a: "Oui, ImmoPrestige propose un plan gratuit pour démarrer sans engagement et sans carte bancaire. Des forfaits payants sont disponibles pour les besoins plus importants.",
                },
                {
                  q: "Puis-je utiliser ImmoPrestige sur mon téléphone ?",
                  a: "Oui, ImmoPrestige est une application web progressive (PWA) qui fonctionne sur tous les appareils : ordinateur, tablette et smartphone.",
                },
                {
                  q: "Puis-je changer de forfait ?",
                  a: "Oui, vous pouvez passer à un forfait supérieur à tout moment. La différence sera calculée au prorata.",
                },
                {
                  q: "Mes données sont-elles sécurisées ?",
                  a: "Absolument. Vos données sont chiffrées et hébergées sur des serveurs sécurisés avec des sauvegardes régulières.",
                },
                {
                  q: "Comment gérer un lotissement ?",
                  a: "ImmoPrestige offre un module complet : création d'îlots et parcelles, gestion des ventes, suivi des échéanciers, démarches administratives et signatures numériques.",
                },
                {
                  q: "ImmoPrestige fonctionne-t-il en Côte d'Ivoire ?",
                  a: "Oui, ImmoPrestige est spécialement conçu pour le marché ivoirien et africain avec le Franc CFA et les moyens de paiement locaux.",
                },
              ].map((item, i) => (
                <article key={i} itemScope itemType="https://schema.org/Question">
                  <h3 className="font-semibold mb-2" itemProp="name">
                    {item.q}
                  </h3>
                  <div itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                    <p className="text-muted-foreground text-sm" itemProp="text">
                      {item.a}
                    </p>
                  </div>
                </article>
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
              Rejoignez des centaines de propriétaires et agences qui font confiance à {platformAppName}.
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
      </main>

      {/* Footer SEO-rich */}
      <footer className="border-t bg-muted/20 py-12" role="contentinfo">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-foreground mb-3">ImmoPrestige</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Le logiciel de gestion immobilière et locative N°1 en Afrique. Conçu pour les agences immobilières,
                propriétaires et bailleurs en Côte d'Ivoire.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Gestion Locative</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Gestion des biens immobiliers</li>
                <li>Suivi des locataires et loyers</li>
                <li>Quittances de loyer automatiques</li>
                <li>Contrats de bail numériques</li>
                <li>États des lieux digitaux</li>
                <li>Rappels WhatsApp automatiques</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Ventes & Achats</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>CRM immobilier</li>
                <li>Gestion des offres d'achat</li>
                <li>Suivi des transactions</li>
                <li>Échéanciers de paiement</li>
                <li>Gestion des lotissements</li>
                <li>Parcelles et îlots</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Paiements acceptés</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Orange Money</li>
                <li>Wave</li>
                <li>MTN Mobile Money</li>
                <li>Moov Money</li>
                <li>Cartes bancaires (Visa, Mastercard)</li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} {platformAppName}. Tous droits réservés.
            </p>
            <p>Logiciel de gestion immobilière pour la Côte d'Ivoire, le Sénégal, le Cameroun et toute l'Afrique.</p>
          </div>
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
