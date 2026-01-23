import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTenants, useDeleteTenant, TenantWithDetails } from "@/hooks/useTenants";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin,
  Pencil, 
  Trash2,
  Calendar,
  Loader2,
  Home,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Euro,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { EditTenantDialog } from "@/components/tenant/EditTenantDialog";
import { TenantPaymentChart } from "@/components/tenant/TenantPaymentChart";
import { TenantPaymentStatusChart } from "@/components/tenant/TenantPaymentStatusChart";
import { EmailHistoryDialog } from "@/components/tenant/EmailHistoryDialog";
import { SendReminderDialog } from "@/components/payment/SendReminderDialog";
import { CollectPaymentDialog } from "@/components/payment/CollectPaymentDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { format, differenceInDays, isFuture, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const contractStatusConfig = {
  active: { label: "Actif", className: "bg-emerald/10 text-emerald border-emerald/20" },
  ending_soon: { label: "Fin proche", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  expired: { label: "Expiré", className: "bg-red-500/10 text-red-500 border-red-500/20" },
};

const paymentStatusConfig = {
  paid: { label: "Payé", icon: CheckCircle, className: "text-emerald bg-emerald/10" },
  pending: { label: "En attente", icon: Clock, className: "text-amber-500 bg-amber-500/10" },
  late: { label: "En retard", icon: XCircle, className: "text-destructive bg-destructive/10" },
  upcoming: { label: "À venir", icon: Clock, className: "text-primary bg-primary/10" },
};

const TenantDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tenants = [], isLoading: tenantsLoading } = useTenants();
  const { data: activityLogs = [] } = useActivityLogs();
  const deleteTenant = useDeleteTenant();
  const { canEdit, canDelete } = usePermissions();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const tenant = tenants.find(t => t.id === id) as TenantWithDetails | undefined;
  
  // Get active contract
  const activeContract = tenant?.contracts?.find(c => c.status === 'active') || tenant?.contracts?.[0];
  const contractStatus = activeContract?.status as keyof typeof contractStatusConfig || 'expired';
  const statusConfig = contractStatusConfig[contractStatus] || contractStatusConfig.expired;

  // Activity logs related to this tenant
  const tenantActivityLogs = activityLogs.filter(log => 
    (log.entity_type === "tenant" && log.entity_id === id) ||
    (log.entity_type === "payment" && tenant?.payments?.some(p => p.id === log.entity_id))
  ).slice(0, 10);

  // Calculate statistics
  const totalPayments = tenant?.payments?.length || 0;
  const paidPayments = tenant?.payments?.filter(p => p.status === 'paid').length || 0;
  const latePayments = tenant?.payments?.filter(p => p.status === 'late').length || 0;
  const pendingPayments = tenant?.payments?.filter(p => p.status === 'pending').length || 0;
  const totalPaidAmount = tenant?.payments
    ?.filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const paymentRate = totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;

  const handleDelete = async () => {
    if (!tenant) return;
    try {
      await deleteTenant.mutateAsync({ id: tenant.id, name: tenant.name });
      toast.success("Locataire supprimé avec succès");
      navigate("/tenants");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (tenantsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!tenant) {
    return (
      <DashboardLayout>
        <div className="text-center py-24">
          <p className="text-destructive mb-4">Locataire introuvable.</p>
          <Button variant="outline" onClick={() => navigate("/tenants")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux locataires
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      create: "Création",
      update: "Modification",
      delete: "Suppression",
      payment_collected: "Paiement encaissé",
    };
    return labels[actionType] || actionType;
  };

  const getEntityLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      tenant: "Locataire",
      payment: "Paiement",
      contract: "Contrat",
    };
    return labels[entityType] || entityType;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/tenants")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-navy flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">
                  {tenant.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                    {tenant.name}
                  </h1>
                  <Badge variant="outline" className={cn("w-fit", statusConfig.className)}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Mail className="h-4 w-4" />
                  {tenant.email}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <EmailHistoryDialog tenantId={tenant.id} tenantName={tenant.name} />
            {canEdit && (
              <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald">{paidPayments}</p>
                  <p className="text-xs text-muted-foreground">Paiements réglés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{latePayments}</p>
                  <p className="text-xs text-muted-foreground">Paiements en retard</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">{pendingPayments}</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{paymentRate}%</p>
                  <p className="text-xs text-muted-foreground">Taux de paiement</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts & Payments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Evolution Chart */}
            <TenantPaymentChart payments={tenant.payments || []} />

            {/* Payment Status Chart */}
            <TenantPaymentStatusChart payments={tenant.payments || []} />

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Historique des paiements ({totalPayments})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tenant.payments && tenant.payments.length > 0 ? (
                  <div className="space-y-3">
                    {tenant.payments.map((payment) => {
                      const status = paymentStatusConfig[payment.status as keyof typeof paymentStatusConfig] || paymentStatusConfig.pending;
                      const StatusIcon = status.icon;
                      
                      // Check if payment is due within the next 7 days
                      const dueDate = new Date(payment.due_date);
                      const daysUntilDue = differenceInDays(dueDate, new Date());
                      const isDueSoon = payment.status !== 'paid' && isFuture(dueDate) && daysUntilDue <= 7 && daysUntilDue >= 0;
                      const isOverdue = payment.status !== 'paid' && isPast(dueDate) && daysUntilDue < 0;
                      
                      return (
                        <div
                          key={payment.id}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-lg",
                            isDueSoon ? "bg-orange-500/10 border border-orange-500/30" : 
                            isOverdue ? "bg-destructive/10 border border-destructive/30" : 
                            "bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", status.className)}>
                              <StatusIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">
                                  {format(dueDate, "dd MMMM yyyy", { locale: fr })}
                                </p>
                                {isDueSoon && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-600 dark:text-orange-400">
                                    <AlertCircle className="h-3 w-3" />
                                    {daysUntilDue === 0 ? "Aujourd'hui" : `Dans ${daysUntilDue} jour${daysUntilDue > 1 ? 's' : ''}`}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Échéance • {status.label}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-bold text-foreground">
                                {Number(payment.amount).toLocaleString('fr-FR')} F CFA
                              </p>
                              {payment.paid_date && (
                                <p className="text-xs text-muted-foreground">
                                  Payé le {format(new Date(payment.paid_date), "dd/MM/yyyy")}
                                </p>
                              )}
                            </div>
                            {(payment.status === 'pending' || payment.status === 'late') && (
                              <>
                                <CollectPaymentDialog
                                  paymentId={payment.id}
                                  tenantName={tenant.name}
                                  tenantEmail={tenant.email}
                                  amount={Number(payment.amount)}
                                  dueDate={payment.due_date}
                                  propertyTitle={tenant.property?.title || "Bien immobilier"}
                                  propertyAddress={tenant.property?.address}
                                  currentMethod={payment.method}
                                />
                                <SendReminderDialog
                                  paymentId={payment.id}
                                  tenantId={tenant.id}
                                  tenantName={tenant.name}
                                  tenantEmail={tenant.email}
                                  tenantPhone={tenant.phone}
                                  propertyTitle={tenant.property?.title || "Bien non assigné"}
                                  amount={Number(payment.amount)}
                                  dueDate={payment.due_date}
                                  status={payment.status}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Aucun paiement enregistré
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Activity History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historique d'activité
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tenantActivityLogs.length > 0 ? (
                  <div className="space-y-3">
                    {tenantActivityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className={cn(
                          "p-1.5 rounded-full",
                          log.action_type === "create" && "bg-emerald/20 text-emerald",
                          log.action_type === "update" && "bg-primary/20 text-primary",
                          log.action_type === "delete" && "bg-destructive/20 text-destructive",
                          log.action_type === "payment_collected" && "bg-emerald/20 text-emerald"
                        )}>
                          {log.action_type === "create" && <FileText className="h-3 w-3" />}
                          {log.action_type === "update" && <Pencil className="h-3 w-3" />}
                          {log.action_type === "delete" && <Trash2 className="h-3 w-3" />}
                          {log.action_type === "payment_collected" && <CheckCircle className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {getActionLabel(log.action_type)} - {getEntityLabel(log.entity_type)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {log.entity_name}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune activité enregistrée
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Coordonnées</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a href={`mailto:${tenant.email}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {tenant.email}
                    </a>
                  </div>
                </div>
                {tenant.phone && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Téléphone</p>
                      <a href={`tel:${tenant.phone}`} className="text-sm font-medium hover:text-primary transition-colors">
                        {tenant.phone}
                      </a>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Créé le {format(new Date(tenant.created_at), "dd MMMM yyyy", { locale: fr })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Info */}
            {tenant.property && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Bien loué
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium text-foreground">{tenant.property.title}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {tenant.property.address}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => navigate(`/properties/${tenant.property?.id}`)}
                  >
                    Voir le bien
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Contract Info */}
            {activeContract && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Contrat actif
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Loyer mensuel</span>
                    <span className="font-bold text-emerald">
                      {Number(activeContract.rent_amount).toLocaleString('fr-FR')} F CFA
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date de début</span>
                    <span className="font-medium">
                      {format(new Date(activeContract.start_date), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date de fin</span>
                    <span className="font-medium">
                      {format(new Date(activeContract.end_date), "dd/MM/yyyy")}
                    </span>
                  </div>
                  {activeContract.deposit && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dépôt de garantie</span>
                        <span className="font-medium">
                          {Number(activeContract.deposit).toLocaleString('fr-FR')} F CFA
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Résumé financier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total payé</span>
                  <span className="font-bold text-emerald">
                    {totalPaidAmount.toLocaleString('fr-FR')} F CFA
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paiements effectués</span>
                  <span className="font-medium">{paidPayments} / {totalPayments}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taux de paiement</span>
                  <span className={cn(
                    "font-bold",
                    paymentRate >= 80 ? "text-emerald" : paymentRate >= 50 ? "text-amber-500" : "text-destructive"
                  )}>
                    {paymentRate}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditTenantDialog
        tenant={tenant}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce locataire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{tenant.name}" ? Cette action est irréversible.
              {totalPayments > 0 && (
                <span className="block mt-2 text-destructive">
                  Attention: Ce locataire a {totalPayments} paiement(s) associé(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default TenantDetails;
