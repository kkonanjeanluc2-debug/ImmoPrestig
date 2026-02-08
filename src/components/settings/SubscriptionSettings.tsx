import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgencySubscription, useAgencyPaymentHistory } from "@/hooks/useAgencySubscription";
import { useSubscriptionPlans, SubscriptionPlan } from "@/hooks/useSubscriptionPlans";
import { SubscriptionCheckoutDialog } from "@/components/subscription/SubscriptionCheckoutDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Crown, 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  ArrowUpRight,
  Zap,
  Building2,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

const planIcons: Record<string, React.ReactNode> = {
  "Gratuit": <Zap className="h-5 w-5" />,
  "Starter": <Building2 className="h-5 w-5" />,
  "Pro": <Star className="h-5 w-5" />,
  "Enterprise": <Crown className="h-5 w-5" />,
};

const paymentMethodLabels: Record<string, string> = {
  orange_money: "Orange Money",
  mtn_money: "MTN Money",
  wave: "Wave",
  moov: "Moov Money",
  card: "Carte bancaire",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  active: { label: "Actif", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  trial: { label: "Essai", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  expired: { label: "Expiré", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: "Annulé", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

const transactionStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "Payé", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  failed: { label: "Échoué", variant: "destructive" },
  refunded: { label: "Remboursé", variant: "outline" },
};

export function SubscriptionSettings() {
  const { data: subscription, isLoading: subLoading } = useAgencySubscription();
  const { data: transactions, isLoading: txLoading } = useAgencyPaymentHistory();
  const { data: plans } = useSubscriptionPlans();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const formatPrice = (amount: number, currency: string = "XOF") => {
    return new Intl.NumberFormat("fr-CI", {
      style: "decimal",
      minimumFractionDigits: 0,
    }).format(amount) + " " + currency;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy à HH:mm", { locale: fr });
  };

  const handleUpgrade = (plan: SubscriptionPlan, cycle: "monthly" | "yearly") => {
    setSelectedPlan(plan);
    setBillingCycle(cycle);
    setCheckoutOpen(true);
  };

  const activePlans = plans?.filter(p => p.is_active) || [];
  const currentPlanId = subscription?.plan_id;

  return (
    <div className="space-y-6">
      {/* Current Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Votre abonnement
          </CardTitle>
          <CardDescription>
            Gérez votre forfait et consultez vos informations de facturation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : subscription ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {planIcons[subscription.plan.name] || <Crown className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{subscription.plan.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {subscription.billing_cycle === "lifetime" 
                        ? "Abonnement à vie" 
                        : subscription.billing_cycle === "yearly" 
                          ? "Facturation annuelle" 
                          : "Facturation mensuelle"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={statusConfig[subscription.status]?.variant || "secondary"}
                    className="gap-1"
                  >
                    {statusConfig[subscription.status]?.icon}
                    {statusConfig[subscription.status]?.label || subscription.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">Prix</span>
                  </div>
                  <p className="font-semibold">
                    {subscription.billing_cycle === "lifetime" ? (
                      <span className="text-primary">Gratuit à vie</span>
                    ) : (
                      <>
                        {formatPrice(
                          subscription.billing_cycle === "yearly" 
                            ? subscription.plan.price_yearly 
                            : subscription.plan.price_monthly,
                          subscription.plan.currency
                        )}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{subscription.billing_cycle === "yearly" ? "an" : "mois"}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Début</span>
                  </div>
                  <p className="font-semibold">{formatDate(subscription.starts_at)}</p>
                </div>
                {subscription.ends_at && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Expiration</span>
                    </div>
                    <p className="font-semibold">{formatDate(subscription.ends_at)}</p>
                  </div>
                )}
              </div>

              {/* Plan limits */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {subscription.plan.max_properties === null || subscription.plan.max_properties === 999999 ? "∞" : subscription.plan.max_properties}
                  </p>
                  <p className="text-xs text-muted-foreground">Biens max</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {subscription.plan.max_tenants === null || subscription.plan.max_tenants === 999999 ? "∞" : subscription.plan.max_tenants}
                  </p>
                  <p className="text-xs text-muted-foreground">Locataires max</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {subscription.plan.max_users === null || subscription.plan.max_users === 999999 ? "∞" : subscription.plan.max_users}
                  </p>
                  <p className="text-xs text-muted-foreground">Utilisateurs max</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Crown className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Aucun abonnement actif</h3>
              <p className="text-muted-foreground mb-4">
                Choisissez un forfait pour débloquer toutes les fonctionnalités
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            {subscription ? "Changer de forfait" : "Choisir un forfait"}
          </CardTitle>
          <CardDescription>
            Comparez les forfaits et sélectionnez celui qui vous convient
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activePlans.map((plan) => {
              const isCurrentPlan = plan.id === currentPlanId;
              const currentPlanPrice = subscription?.plan?.price_monthly || 0;
              const isUpgrade = plan.price_monthly > currentPlanPrice;
              const isDowngrade = plan.price_monthly < currentPlanPrice && currentPlanId;
              
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "p-4 border rounded-lg transition-all",
                    isCurrentPlan && "border-primary bg-primary/5",
                    plan.is_popular && !isCurrentPlan && "border-primary/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{plan.name}</h4>
                    {isCurrentPlan && (
                      <Badge variant="secondary" className="text-xs">Actuel</Badge>
                    )}
                    {plan.is_popular && !isCurrentPlan && (
                      <Badge className="text-xs">Populaire</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold mb-1">
                    {formatPrice(plan.price_monthly, plan.currency)}
                    <span className="text-sm font-normal text-muted-foreground">/mois</span>
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    ou {formatPrice(plan.price_yearly, plan.currency)}/an
                  </p>
                  {!isCurrentPlan && (
                    <div className="space-y-2">
                      {isUpgrade && (
                        <p className="text-xs text-emerald font-medium text-center">↑ Mise à niveau</p>
                      )}
                      {isDowngrade && (
                        <p className="text-xs text-amber-600 font-medium text-center">↓ Rétrogradation</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={() => handleUpgrade(plan, "monthly")}
                        >
                          Mensuel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => handleUpgrade(plan, "yearly")}
                        >
                          Annuel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Historique des paiements
          </CardTitle>
          <CardDescription>
            Consultez l'ensemble de vos transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Forfait</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(tx.created_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tx.plan?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                            {tx.billing_cycle === "lifetime" 
                              ? "À vie" 
                              : tx.billing_cycle === "yearly" 
                                ? "Annuel" 
                                : "Mensuel"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {paymentMethodLabels[tx.payment_method] || tx.payment_method}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPrice(tx.amount, tx.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transactionStatusConfig[tx.status]?.variant || "secondary"}>
                          {transactionStatusConfig[tx.status]?.label || tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Aucune transaction pour le moment</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checkout Dialog */}
      <SubscriptionCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        plan={selectedPlan}
        billingCycle={billingCycle}
      />
    </div>
  );
}
