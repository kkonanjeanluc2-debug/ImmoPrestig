import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTenants, useDeleteTenant, TenantWithDetails } from "@/hooks/useTenants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generatePaymentHistoryPDF } from "@/lib/generatePaymentHistoryPDF";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertCircle,
  Download,
  MessageCircle,
  DoorOpen,
  ClipboardCheck,
  KeyRound,
  MessageSquare,
  ShieldOff,
  AlertTriangle
} from "lucide-react";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { EditTenantDialog } from "@/components/tenant/EditTenantDialog";
import { TenantPaymentChart } from "@/components/tenant/TenantPaymentChart";
import { TenantPaymentStatusChart } from "@/components/tenant/TenantPaymentStatusChart";
import { EmailHistoryDialog } from "@/components/tenant/EmailHistoryDialog";
import { WhatsAppHistoryDialog } from "@/components/tenant/WhatsAppHistoryDialog";
import { SendReminderDialog } from "@/components/payment/SendReminderDialog";
import { CollectPaymentDialog } from "@/components/payment/CollectPaymentDialog";
import { TenantPayRentDialog } from "@/components/payment/TenantPayRentDialog";
import { generateRentReceipt, getPaymentPeriod } from "@/lib/generateReceipt";
import { generateAgencyFeesReceipt } from "@/lib/generateAgencyFeesReceipt";
import { useAgency } from "@/hooks/useAgency";
import { useAssignedUserName } from "@/hooks/useAssignedUserProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { TenantEtatsDesLieuxTab } from "@/components/etat-des-lieux/TenantEtatsDesLieuxTab";
import { TenantContractsTab } from "@/components/tenant/TenantContractsTab";
import { TenantPortalAccessDialog } from "@/components/tenant/TenantPortalAccessDialog";
import { useRevokeTenantPortalAccess } from "@/hooks/useTenantPortalAccess";
import { TenantRequestsTab } from "@/components/tenant/TenantRequestsTab";

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
  impaye: { label: "Impayé", icon: AlertTriangle, className: "text-destructive bg-destructive/20 font-semibold" },
  upcoming: { label: "À venir", icon: Clock, className: "text-primary bg-primary/10" },
};

const TenantDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useCurrentUserRole();
  const { data: tenants = [], isLoading: tenantsLoading } = useTenants();
  const { data: ownAgency } = useAgency();
  const deleteTenant = useDeleteTenant();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("can_edit_tenants");
  const canDelete = hasPermission("can_delete_tenants");
  const canCollectPayment = hasPermission("can_edit_payments");
  const canSendReminders = hasPermission("can_delete_payments");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [whatsappHistoryOpen, setWhatsappHistoryOpen] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState<string | null>(null);
  const [downloadingAgencyFees, setDownloadingAgencyFees] = useState(false);
  const [portalAccessDialogOpen, setPortalAccessDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const revokeAccess = useRevokeTenantPortalAccess();

  const isLocataire = userRole?.role === "locataire";

  // For tenant portal users: fetch the landlord's agency
  const { data: tenantAgency } = useQuery({
    queryKey: ["tenant-landlord-agency", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: tenantRecord } = await supabase
        .from("tenants")
        .select("user_id")
        .eq("portal_user_id", user.id)
        .eq("has_portal_access", true)
        .maybeSingle();
      if (!tenantRecord) return null;
      const { data: agencyData } = await supabase
        .from("agencies")
        .select("name, email, phone, address, city, country, logo_url")
        .eq("user_id", tenantRecord.user_id)
        .maybeSingle();
      return agencyData;
    },
    enabled: !!user?.id && isLocataire,
  });

  const agency = isLocataire ? tenantAgency : ownAgency;

  // For tenants: find their own tenant record using portal_user_id
  const ownTenant = isLocataire 
    ? tenants.find(t => t.portal_user_id === user?.id) as TenantWithDetails | undefined
    : null;

  // Use own tenant for locataires, otherwise use id from URL
  const tenant = isLocataire 
    ? ownTenant 
    : tenants.find(t => t.id === id) as TenantWithDetails | undefined;
  
  // Get active contract
  const activeContract = tenant?.contracts?.find(c => c.status === 'active') || tenant?.contracts?.[0];
  const contractStatus = activeContract?.status as keyof typeof contractStatusConfig || 'expired';
  const statusConfig = contractStatusConfig[contractStatus] || contractStatusConfig.expired;

  // Unit number and gestionnaire name for receipts
  const unitNumber = tenant?.unit?.unit_number;
  const { data: gestionnaireName } = useAssignedUserName(tenant?.property?.assigned_to);


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

  const handleRevokeAccess = async () => {
    if (!tenant) return;
    try {
      await revokeAccess.mutateAsync(tenant.id);
      toast.success("Accès portail révoqué avec succès");
      setRevokeDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la révocation");
    }
  };

  if (tenantsLoading || roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // For tenants: if they try to access another tenant's page, redirect to their own
  if (isLocataire && id && ownTenant && id !== ownTenant.id) {
    navigate(`/tenants/${ownTenant.id}`, { replace: true });
    return null;
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {!isLocataire && (
              <Button variant="outline" size="icon" onClick={() => navigate("/tenants")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-navy flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">
                  {tenant.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                    {tenant.name}
                  </h1>
                  <Badge variant="outline" className={cn("w-fit", statusConfig.className)}>
                    {statusConfig.label}
                  </Badge>
                  {!isLocataire && tenant.has_portal_access && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      <KeyRound className="h-3 w-3 mr-1" />
                      Accès portail
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Mail className="h-4 w-4" />
                  {tenant.email}
                </p>
              </div>
            </div>
          </div>
          {/* Admin-only action buttons */}
          {!isLocataire && (
            <div className="flex flex-wrap gap-2">
              <EmailHistoryDialog tenantId={tenant.id} tenantName={tenant.name} />
              <Button variant="outline" size="sm" onClick={() => setWhatsappHistoryOpen(true)} className="text-green-600 border-green-600/30 hover:bg-green-50 dark:hover:bg-green-950">
                <MessageCircle className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
              <WhatsAppHistoryDialog
                open={whatsappHistoryOpen}
                onOpenChange={setWhatsappHistoryOpen}
                tenantId={tenant.id}
                tenantName={tenant.name}
              />
              {/* Portal Access Button */}
              {canEdit && (
                tenant.has_portal_access ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setRevokeDialogOpen(true)}
                    className="text-amber-600 border-amber-600/30 hover:bg-amber-50 dark:hover:bg-amber-950"
                  >
                    <ShieldOff className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Révoquer accès</span>
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPortalAccessDialogOpen(true)}
                    className="text-primary"
                  >
                    <KeyRound className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Créer accès</span>
                  </Button>
                )
              )}
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Modifier</span>
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Supprimer</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-emerald/10 rounded-lg">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-emerald">{paidPayments}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Paiements réglés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-destructive/10 rounded-lg">
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-destructive">{latePayments}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">En retard</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-amber-500">{pendingPayments}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{paymentRate}%</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Taux paiement</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 mb-6">
            <TabsTrigger value="payments" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Paiements</span>
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Contrats</span>
            </TabsTrigger>
            <TabsTrigger value="etats-des-lieux" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">États des lieux</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Requêtes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Charts & Payments */}
              <div className="lg:col-span-2 space-y-6">
            {/* Payment Evolution Chart */}
            <TenantPaymentChart payments={tenant.payments || []} />

            {/* Payment Status Chart */}
            <TenantPaymentStatusChart payments={tenant.payments || []} />

            {/* Payment History */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Historique des paiements ({totalPayments})
                </CardTitle>
                {tenant.payments && tenant.payments.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generatePaymentHistoryPDF(
                      tenant.payments!.map(p => ({
                        due_date: p.due_date,
                        amount: Number(p.amount),
                        status: p.status,
                        paid_date: p.paid_date,
                        method: p.method,
                        paid_amount: (p as any).paid_amount ? Number((p as any).paid_amount) : null,
                        payment_months: (p as any).payment_months,
                      })),
                      {
                        name: tenant.name,
                        phone: tenant.phone,
                        email: tenant.email,
                        property_title: tenant.property?.title,
                        property_address: tenant.property?.address,
                        unit_number: tenant.unit?.unit_number,
                        contract_start: activeContract?.start_date,
                        contract_rent: activeContract ? Number(activeContract.rent_amount) : null,
                      },
                      ownAgency || tenantAgency
                    )}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exporter PDF
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {tenant.payments && tenant.payments.length > 0 ? (
                  <div className="space-y-3">
                    {[...tenant.payments].sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()).map((payment) => {
                      const effectiveStatus = payment.status === 'late' && differenceInDays(new Date(), new Date(payment.due_date)) >= 30 ? 'impaye' : payment.status;
                      const status = paymentStatusConfig[effectiveStatus as keyof typeof paymentStatusConfig] || paymentStatusConfig.pending;
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
                          <div className="flex items-center gap-2">
                            <div className="text-right mr-2">
                              <p className="font-bold text-foreground">
                                {Number(payment.amount).toLocaleString('fr-FR')} F CFA
                              </p>
                              {payment.paid_date && (
                                <p className="text-xs text-muted-foreground">
                                  Payé le {format(new Date(payment.paid_date), "dd/MM/yyyy")}
                                </p>
                              )}
                            </div>
                            {/* Download receipt button for paid payments */}
                            {payment.status === 'paid' && payment.paid_date && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-8 px-2"
                                title="Télécharger la quittance"
                                disabled={downloadingReceipt === payment.id}
                                onClick={async () => {
                                  setDownloadingReceipt(payment.id);
                                  try {
                                    await generateRentReceipt({
                                      paymentId: payment.id,
                                      tenantName: tenant.name,
                                      tenantEmail: tenant.email,
                                      propertyTitle: tenant.property?.title || "Bien immobilier",
                                      propertyAddress: tenant.property?.address,
                                      amount: Number(payment.amount),
                                      paidDate: payment.paid_date!,
                                      dueDate: payment.due_date,
                                      period: getPaymentPeriod(payment.due_date),
                                      method: payment.method || undefined,
                                      unitNumber: unitNumber || undefined,
                                      gestionnaireName: gestionnaireName || undefined,
                                      agency: agency ? {
                                        name: agency.name,
                                        email: agency.email,
                                        phone: agency.phone || undefined,
                                        address: agency.address || undefined,
                                        city: agency.city || undefined,
                                        country: agency.country || undefined,
                                        logo_url: agency.logo_url,
                                      } : undefined,
                                    });
                                  } catch (error) {
                                    toast.error("Erreur lors de la génération de la quittance");
                                  } finally {
                                    setDownloadingReceipt(null);
                                  }
                                }}
                              >
                                {downloadingReceipt === payment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {/* Tenant pay button for locataires */}
                            {isLocataire && (payment.status === 'pending' || payment.status === 'late') && (
                              <TenantPayRentDialog
                                paymentId={payment.id}
                                amount={Number(payment.amount)}
                                paidAmount={Number((payment as any).paid_amount || 0)}
                                dueDate={payment.due_date}
                                propertyTitle={tenant.property?.title || "Bien immobilier"}
                                tenantPhone={tenant.phone}
                                agencyUserId={payment.user_id}
                                isVirtual={false}
                                tenantId={tenant.id}
                                paymentMonths={(payment as any).payment_months || undefined}
                              />
                            )}
                            {/* Admin-only actions for pending/late payments */}
                            {!isLocataire && (payment.status === 'pending' || payment.status === 'late') && canCollectPayment && (
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
                            )}
                            {!isLocataire && (payment.status === 'pending' || payment.status === 'late') && canSendReminders && (
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

                  {/* Unit/Door Info */}
                  {tenant.unit && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DoorOpen className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Porte: {tenant.unit.unit_number}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Pièces:</span>
                          <span className="ml-1 font-medium">{tenant.unit.rooms_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Loyer:</span>
                          <span className="ml-1 font-medium">{tenant.unit.rent_amount.toLocaleString('fr-FR')} F</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Hide "View property" button for tenants */}
                  {!isLocataire && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate(`/properties/${tenant.property?.id}`)}
                    >
                      Voir le bien
                    </Button>
                  )}
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

            {/* Agency Fees */}
            {tenant.agency_fees && Number(tenant.agency_fees) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5" />
                    Frais d'agence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-bold text-foreground">
                      {Number(tenant.agency_fees).toLocaleString('fr-FR')} F CFA
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={downloadingAgencyFees}
                    onClick={async () => {
                      setDownloadingAgencyFees(true);
                      try {
                        await generateAgencyFeesReceipt({
                          tenantName: tenant.name,
                          tenantEmail: tenant.email,
                          propertyTitle: tenant.unit?.unit_number || tenant.property?.title || "Bien immobilier",
                          propertyAddress: tenant.property?.address,
                          amount: Number(tenant.agency_fees),
                          date: tenant.created_at,
                          signerName: user?.user_metadata?.full_name || agency?.name || "le bailleur",
                          agency: agency ? {
                            name: agency.name,
                            email: agency.email,
                            phone: agency.phone || undefined,
                            address: agency.address || undefined,
                            city: agency.city || undefined,
                            country: agency.country || undefined,
                            logo_url: agency.logo_url,
                          } : undefined,
                        });
                      } catch {
                        toast.error("Erreur lors de la génération du reçu");
                      } finally {
                        setDownloadingAgencyFees(false);
                      }
                    }}
                  >
                    {downloadingAgencyFees ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Télécharger le reçu
                  </Button>
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
      </TabsContent>

          <TabsContent value="contracts">
            <TenantContractsTab tenantId={tenant.id} tenantName={tenant.name} />
          </TabsContent>

          <TabsContent value="etats-des-lieux">
            <TenantEtatsDesLieuxTab tenant={tenant} />
          </TabsContent>

          <TabsContent value="requests">
            <TenantRequestsTab 
              tenantId={tenant.id} 
              userId={tenant.user_id}
              propertyId={tenant.property_id || undefined}
              isLocataire={isLocataire}
            />
          </TabsContent>

    </Tabs>
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

      {/* Revoke Access Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer l'accès portail ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir révoquer l'accès portail de "{tenant.name}" ? 
              Le locataire ne pourra plus se connecter pour consulter ses informations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAccess}
              className="bg-amber-600 text-white hover:bg-amber-700"
              disabled={revokeAccess.isPending}
            >
              {revokeAccess.isPending ? "Révocation..." : "Révoquer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Portal Access Dialog */}
      <TenantPortalAccessDialog
        open={portalAccessDialogOpen}
        onOpenChange={setPortalAccessDialogOpen}
        tenant={{ id: tenant.id, name: tenant.name, email: tenant.email, phone: tenant.phone }}
      />
    </DashboardLayout>
  );
};

export default TenantDetails;
