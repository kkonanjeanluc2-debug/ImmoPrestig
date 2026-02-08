import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CreditCard, Building2, Check, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useSubscriptionPlans,
  useAllAgencySubscriptions,
  useAssignSubscription,
} from "@/hooks/useSubscriptionPlans";
import { useAllAgencies, AgencyWithProfile } from "@/hooks/useSuperAdmin";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-CI", {
    style: "decimal",
    minimumFractionDigits: 0,
  }).format(price);
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Actif", variant: "default" },
  trial: { label: "Essai", variant: "outline" },
  cancelled: { label: "Annulé", variant: "secondary" },
  expired: { label: "Expiré", variant: "destructive" },
};

export function AgencySubscriptionsManager() {
  const { data: agencies, isLoading: agenciesLoading } = useAllAgencies();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: subscriptions, isLoading: subscriptionsLoading } = useAllAgencySubscriptions();
  const assignSubscription = useAssignSubscription();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<AgencyWithProfile | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<"monthly" | "yearly" | "lifetime">("monthly");

  const isLoading = agenciesLoading || plansLoading || subscriptionsLoading;

  // Get subscription for an agency
  const getAgencySubscription = (agencyId: string) => {
    return subscriptions?.find((sub) => sub.agency_id === agencyId);
  };

  // Get plan by id
  const getPlanById = (planId: string) => {
    return plans?.find((p) => p.id === planId);
  };

  const openAssignDialog = (agency: AgencyWithProfile) => {
    const currentSub = getAgencySubscription(agency.id);
    setSelectedAgency(agency);
    setSelectedPlanId(currentSub?.plan_id || "");
    setSelectedBillingCycle(currentSub?.billing_cycle || "monthly");
    setIsDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedAgency || !selectedPlanId) {
      toast.error("Veuillez sélectionner un forfait");
      return;
    }

    try {
      await assignSubscription.mutateAsync({
        agency_id: selectedAgency.id,
        plan_id: selectedPlanId,
        billing_cycle: selectedBillingCycle,
      });
      toast.success("Abonnement mis à jour avec succès");
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Une erreur est survenue");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Abonnements des agences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Stats
  const totalSubscribed = subscriptions?.filter((s) => s.status === "active").length || 0;
  const totalRevenue = subscriptions?.reduce((acc, sub) => {
    if (sub.status !== "active") return acc;
    const plan = getPlanById(sub.plan_id);
    if (!plan) return acc;
    return acc + (sub.billing_cycle === "yearly" ? plan.price_yearly : plan.price_monthly);
  }, 0) || 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Abonnements des agences
              </CardTitle>
              <CardDescription>
                Gérez les abonnements de chaque agence
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
                <span className="font-medium">{totalSubscribed}</span> abonnés actifs
              </div>
              <div className="bg-green-500/10 text-green-600 px-3 py-1.5 rounded-lg">
                <span className="font-medium">{formatPrice(totalRevenue)}</span> FCFA/mois
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agence</TableHead>
                  <TableHead>Forfait actuel</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies?.map((agency) => {
                  const subscription = getAgencySubscription(agency.id);
                  const plan = subscription ? getPlanById(subscription.plan_id) : null;
                  const status = subscription?.status || "none";

                  return (
                    <TableRow key={agency.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{agency.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {agency.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan ? (
                          <div>
                            <p className="font-medium">{plan.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(
                                subscription?.billing_cycle === "yearly"
                                  ? plan.price_yearly
                                  : plan.price_monthly
                              )}{" "}
                              FCFA
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Aucun</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {subscription ? (
                          <Badge variant={subscription.billing_cycle === "lifetime" ? "default" : "outline"}>
                            {subscription.billing_cycle === "lifetime"
                              ? "À vie"
                              : subscription.billing_cycle === "yearly"
                                ? "Annuel"
                                : "Mensuel"}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {subscription ? (
                          <Badge variant={statusLabels[status]?.variant || "secondary"}>
                            {statusLabels[status]?.label || status}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Non abonné</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {subscription ? (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(subscription.starts_at), "dd MMM yyyy", {
                              locale: fr,
                            })}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignDialog(agency)}
                        >
                          {subscription ? "Modifier" : "Assigner"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assign Subscription Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {getAgencySubscription(selectedAgency?.id || "")
                ? "Modifier l'abonnement"
                : "Assigner un abonnement"}
            </DialogTitle>
            <DialogDescription>
              {selectedAgency?.name} - {selectedAgency?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Forfait</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un forfait" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.filter((p) => p.is_active).map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{plan.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {formatPrice(plan.price_monthly)} FCFA/mois
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cycle de facturation</Label>
              <Select
                value={selectedBillingCycle}
                onValueChange={(v) => setSelectedBillingCycle(v as "monthly" | "yearly" | "lifetime")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="yearly">Annuel (économisez ~17%)</SelectItem>
                  <SelectItem value="lifetime">À vie (gratuit, sans expiration)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPlanId && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Récapitulatif</p>
                <div className="flex justify-between text-sm">
                  <span>Forfait {getPlanById(selectedPlanId)?.name}</span>
                  <span className="font-medium">
                    {selectedBillingCycle === "lifetime" ? (
                      <span className="text-primary font-semibold">Gratuit à vie</span>
                    ) : (
                      <>
                        {formatPrice(
                          selectedBillingCycle === "yearly"
                            ? getPlanById(selectedPlanId)?.price_yearly || 0
                            : getPlanById(selectedPlanId)?.price_monthly || 0
                        )}{" "}
                        FCFA/{selectedBillingCycle === "yearly" ? "an" : "mois"}
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedPlanId || assignSubscription.isPending}
            >
              {assignSubscription.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
