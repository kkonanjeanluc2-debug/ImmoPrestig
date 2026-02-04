import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useOwners, useDeleteOwner } from "@/hooks/useOwners";
import { useProperties } from "@/hooks/useProperties";
import { usePayments } from "@/hooks/usePayments";
import { useTenants } from "@/hooks/useTenants";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useOwnerInterventions } from "@/hooks/usePropertyInterventions";
import { useAgency } from "@/hooks/useAgency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Building2,
  TrendingUp,
  Calendar,
  Loader2,
  User,
  Home,
  Building,
  Map,
  Receipt,
  Clock,
  Percent,
  Wrench,
  FileText,
  Send,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { EditOwnerDialog } from "@/components/owner/EditOwnerDialog";
import { MonthlyReportPeriodDialog } from "@/components/owner/MonthlyReportPeriodDialog";
import { OwnerPropertiesList } from "@/components/owner/OwnerPropertiesList";
import { OwnerTenantsList } from "@/components/owner/OwnerTenantsList";
import { OwnerRevenueChart } from "@/components/owner/OwnerRevenueChart";
import { InterventionsList } from "@/components/intervention/InterventionsList";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { generateOwnerMonthlyReport } from "@/lib/generateOwnerMonthlyReport";
import { supabase } from "@/integrations/supabase/client";
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

const OwnerDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: owners = [], isLoading: ownersLoading } = useOwners();
  const { data: properties = [] } = useProperties();
  const { data: payments = [] } = usePayments();
  const { data: tenants = [] } = useTenants();
  const { data: activityLogs = [] } = useActivityLogs();
  const { data: agency } = useAgency();
  const deleteOwner = useDeleteOwner();
  const { canEdit, canDelete } = usePermissions();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const owner = owners.find(o => o.id === id);
  const ownerProperties = properties.filter(p => p.owner_id === id);
  
  // Get interventions for this owner
  const { data: ownerInterventions = [] } = useOwnerInterventions(id || "");
  
  // Get tenants from owner's properties for payment calculations
  const propertyIds = ownerProperties.map(p => p.id);
  
  // Find tenants who are in owner's properties
  const ownerTenants = tenants.filter(t => t.property_id && propertyIds.includes(t.property_id));
  const ownerTenantIds = ownerTenants.map(t => t.id);

  // Activity logs related to this owner
  const ownerActivityLogs = activityLogs.filter(log => 
    (log.entity_type === "owner" && log.entity_id === id) ||
    (log.entity_type === "property" && propertyIds.includes(log.entity_id || ""))
  ).slice(0, 10);

  // Calculate statistics
  const totalProperties = ownerProperties.length;
  const locationProperties = ownerProperties.filter(p => p.type === "location");
  const venteProperties = ownerProperties.filter(p => p.type === "vente");
  const monthlyRevenue = locationProperties.reduce((sum, p) => sum + (p.price || 0), 0);
  const totalPropertyValue = ownerProperties.reduce((sum, p) => sum + (p.price || 0), 0);
  const occupiedProperties = ownerProperties.filter(p => p.status === "loué").length;
  const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;

  const handleDelete = async () => {
    if (!owner) return;
    try {
      await deleteOwner.mutateAsync({ id: owner.id, name: owner.name });
      toast.success("Propriétaire supprimé avec succès");
      navigate("/owners");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleGenerateMonthlyReport = async (month: number, year: number) => {
    if (!owner) return;
    
    setGeneratingPDF(true);
    try {
      const selectedDate = new Date(year, month, 1);
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      const periodMonth = month;
      const periodYear = year;
      const periodLabel = format(selectedDate, "MMMM yyyy", { locale: fr });

      // Prepare tenant payments data
      const tenantPayments = ownerTenants.map(tenant => {
        const property = ownerProperties.find(p => p.id === tenant.property_id);
        const tenantPaymentsThisMonth = payments.filter(p => 
          p.tenant_id === tenant.id &&
          p.due_date >= format(monthStart, "yyyy-MM-dd") &&
          p.due_date <= format(monthEnd, "yyyy-MM-dd")
        );

        const totalDue = tenantPaymentsThisMonth.reduce((sum, p) => sum + p.amount, 0) || (property?.price || 0);
        const totalPaid = tenantPaymentsThisMonth
          .filter(p => p.status === "paid")
          .reduce((sum, p) => sum + p.amount, 0);

        const hasLate = tenantPaymentsThisMonth.some(p => 
          p.status === "pending" && new Date(p.due_date) < new Date()
        );

        let status: "paid" | "pending" | "late" = "pending";
        if (totalPaid >= totalDue && totalDue > 0) {
          status = "paid";
        } else if (hasLate) {
          status = "late";
        }

        const paidPayment = tenantPaymentsThisMonth.find(p => p.status === "paid");

        return {
          tenantName: tenant.name,
          propertyTitle: property?.title || "Bien inconnu",
          rentAmount: totalDue,
          paidAmount: totalPaid,
          status,
          paidDate: paidPayment?.paid_date || null,
        };
      }).filter(t => t.rentAmount > 0);

      // Prepare interventions data - filter for selected month
      const monthlyInterventions = ownerInterventions
        .filter(intervention => {
          if (!intervention.start_date) return false;
          const startDate = new Date(intervention.start_date);
          return startDate >= monthStart && startDate <= monthEnd;
        })
        .map(intervention => {
          const property = ownerProperties.find(p => p.id === intervention.property_id);
          return {
            title: intervention.title,
            propertyTitle: property?.title || "Bien inconnu",
            type: intervention.type,
            cost: intervention.cost || 0,
            status: intervention.status,
          };
        });

      const commissionPercentage = owner.management_type?.percentage || 0;

      await generateOwnerMonthlyReport({
        ownerName: owner.name,
        ownerEmail: owner.email,
        ownerPhone: owner.phone || undefined,
        period: periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1),
        periodMonth,
        periodYear,
        agency: agency ? {
          name: agency.name,
          email: agency.email,
          phone: agency.phone || undefined,
          address: agency.address || undefined,
          city: agency.city || undefined,
          country: agency.country || undefined,
          logo_url: agency.logo_url,
        } : null,
        tenantPayments,
        interventions: monthlyInterventions,
        commissionPercentage,
        managementTypeName: owner.management_type?.name,
      });

      setPeriodDialogOpen(false);
      toast.success("Point mensuel généré avec succès");
    } catch (error) {
      console.error("Error generating monthly report:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleSendMonthlyReportByEmail = async () => {
    if (!owner || !owner.email) {
      toast.error("Ce propriétaire n'a pas d'adresse email");
      return;
    }
    
    setSendingEmail(true);
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const periodLabel = format(now, "MMMM yyyy", { locale: fr });

      // Prepare tenant payments data
      const tenantPayments = ownerTenants.map(tenant => {
        const property = ownerProperties.find(p => p.id === tenant.property_id);
        const tenantPaymentsThisMonth = payments.filter(p => 
          p.tenant_id === tenant.id &&
          p.due_date >= format(monthStart, "yyyy-MM-dd") &&
          p.due_date <= format(monthEnd, "yyyy-MM-dd")
        );

        const totalDue = tenantPaymentsThisMonth.reduce((sum, p) => sum + p.amount, 0) || (property?.price || 0);
        const totalPaid = tenantPaymentsThisMonth
          .filter(p => p.status === "paid")
          .reduce((sum, p) => sum + p.amount, 0);

        const hasLate = tenantPaymentsThisMonth.some(p => 
          p.status === "pending" && new Date(p.due_date) < now
        );

        let status: "paid" | "pending" | "late" = "pending";
        if (totalPaid >= totalDue && totalDue > 0) {
          status = "paid";
        } else if (hasLate) {
          status = "late";
        }

        return {
          tenantName: tenant.name,
          propertyTitle: property?.title || "Bien inconnu",
          rentAmount: totalDue,
          paidAmount: totalPaid,
          status,
        };
      }).filter(t => t.rentAmount > 0);

      // Prepare interventions data
      const monthlyInterventions = ownerInterventions
        .filter(intervention => {
          if (!intervention.start_date) return false;
          const startDate = new Date(intervention.start_date);
          return startDate >= monthStart && startDate <= monthEnd;
        })
        .map(intervention => {
          const property = ownerProperties.find(p => p.id === intervention.property_id);
          return {
            title: intervention.title,
            propertyTitle: property?.title || "Bien inconnu",
            type: intervention.type,
            cost: intervention.cost || 0,
          };
        });

      const commissionPercentage = owner.management_type?.percentage || 0;

      const { data, error } = await supabase.functions.invoke('send-owner-monthly-report', {
        body: {
          ownerName: owner.name,
          ownerEmail: owner.email,
          period: periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1),
          agencyName: agency?.name || "Gestion Locative",
          agencyEmail: agency?.email,
          agencyPhone: agency?.phone,
          agencyLogoUrl: agency?.logo_url,
          tenantPayments,
          interventions: monthlyInterventions,
          commissionPercentage,
          managementTypeName: owner.management_type?.name,
        },
      });

      if (error) throw error;

      toast.success(`Point mensuel envoyé à ${owner.email}`);
    } catch (error) {
      console.error("Error sending monthly report email:", error);
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setSendingEmail(false);
    }
  };

  if (ownersLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!owner) {
    return (
      <DashboardLayout>
        <div className="text-center py-24">
          <p className="text-destructive mb-4">Propriétaire introuvable.</p>
          <Button variant="outline" onClick={() => navigate("/owners")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux propriétaires
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
    };
    return labels[actionType] || actionType;
  };

  const getEntityLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      owner: "Propriétaire",
      property: "Bien",
      tenant: "Locataire",
      payment: "Paiement",
      document: "Document",
    };
    return labels[entityType] || entityType;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/owners")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-navy flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">
                  {owner.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                    {owner.name}
                  </h1>
                  <Badge 
                    variant={owner.status === "actif" ? "default" : "secondary"}
                    className={owner.status === "actif" ? "bg-emerald text-primary-foreground" : ""}
                  >
                    {owner.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Mail className="h-4 w-4" />
                  {owner.email}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPeriodDialogOpen(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Point mensuel
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSendMonthlyReportByEmail}
              disabled={sendingEmail || !owner.email}
              title={!owner.email ? "Aucun email configuré" : "Envoyer par email"}
            >
              {sendingEmail ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer par email
            </Button>
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
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalProperties}</p>
                  <p className="text-xs text-muted-foreground">Biens</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald">
                    {monthlyRevenue.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-xs text-muted-foreground">F CFA/mois</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-navy/10 rounded-lg">
                  <Home className="h-5 w-5 text-navy" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{occupancyRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Taux d'occupation</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sand/50 rounded-lg">
                  <Receipt className="h-5 w-5 text-navy" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{locationProperties.length}</p>
                  <p className="text-xs text-muted-foreground">En location</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Properties & Revenue */}
          <div className="lg:col-span-2 space-y-6">
            {/* Revenue Chart */}
            <OwnerRevenueChart payments={payments} tenantIds={ownerTenantIds} />

            {/* Tabs for Properties, Tenants and Interventions */}
            <Tabs defaultValue="properties" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="properties" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Biens ({totalProperties})
                </TabsTrigger>
                <TabsTrigger value="tenants" className="gap-2">
                  <Users className="h-4 w-4" />
                  Locataires ({ownerTenants.length})
                </TabsTrigger>
                <TabsTrigger value="interventions" className="gap-2">
                  <Wrench className="h-4 w-4" />
                  Interventions
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="properties" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Biens immobiliers ({totalProperties})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ownerProperties.length > 0 ? (
                      <OwnerPropertiesList properties={ownerProperties} maxDisplay={10} />
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Aucun bien associé à ce propriétaire
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tenants" className="mt-4">
                <OwnerTenantsList tenants={ownerTenants} properties={ownerProperties} />
              </TabsContent>
              
              <TabsContent value="interventions" className="mt-4">
                <InterventionsList ownerId={id} showPropertyColumn={true} />
              </TabsContent>
            </Tabs>

            {/* Activity History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historique d'activité
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ownerActivityLogs.length > 0 ? (
                  <div className="space-y-3">
                    {ownerActivityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className={cn(
                          "p-1.5 rounded-full",
                          log.action_type === "create" && "bg-emerald/20 text-emerald",
                          log.action_type === "update" && "bg-primary/20 text-primary",
                          log.action_type === "delete" && "bg-destructive/20 text-destructive"
                        )}>
                          {log.action_type === "create" && <Building2 className="h-3 w-3" />}
                          {log.action_type === "update" && <Pencil className="h-3 w-3" />}
                          {log.action_type === "delete" && <Trash2 className="h-3 w-3" />}
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
                    <p className="text-sm font-medium">{owner.email}</p>
                  </div>
                </div>
                {owner.phone && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Téléphone</p>
                      <p className="text-sm font-medium">{owner.phone}</p>
                    </div>
                  </div>
                )}
                {owner.address && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Adresse</p>
                      <p className="text-sm font-medium">{owner.address}</p>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Créé le {format(new Date(owner.created_at), "dd MMMM yyyy", { locale: fr })}</span>
                  </div>
                  {owner.updated_at !== owner.created_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Modifié le {format(new Date(owner.updated_at), "dd MMMM yyyy", { locale: fr })}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Management Type */}
            {owner.management_type && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Percent className="h-5 w-5 text-primary" />
                    Type de gestion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{owner.management_type.name}</span>
                    <Badge variant="outline" className="text-lg font-bold px-3 py-1 bg-background">
                      {owner.management_type.percentage}%
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {owner.management_type.type === "gestion_locative" 
                      ? "Gestion locative" 
                      : "Commission de vente"}
                  </div>
                  {monthlyRevenue > 0 && owner.management_type.type === "gestion_locative" && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Commission mensuelle</span>
                          <span className="font-semibold text-primary">
                            {Math.round(monthlyRevenue * owner.management_type.percentage / 100).toLocaleString('fr-FR')} F
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Commission annuelle</span>
                          <span className="font-semibold text-primary">
                            {Math.round(monthlyRevenue * 12 * owner.management_type.percentage / 100).toLocaleString('fr-FR')} F
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Portfolio Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Résumé du patrimoine</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Biens en location</span>
                  <span className="font-medium">{locationProperties.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Biens en vente</span>
                  <span className="font-medium">{venteProperties.length}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Revenus mensuels</span>
                  <span className="font-medium text-emerald">{monthlyRevenue.toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Revenus annuels estimés</span>
                  <span className="font-medium">{(monthlyRevenue * 12).toLocaleString('fr-FR')} F</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Biens loués</span>
                  <span className="font-medium">{occupiedProperties} / {totalProperties}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Biens disponibles</span>
                  <span className="font-medium">
                    {ownerProperties.filter(p => p.status === "disponible").length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Period Selection Dialog */}
      <MonthlyReportPeriodDialog
        open={periodDialogOpen}
        onOpenChange={setPeriodDialogOpen}
        onGenerate={handleGenerateMonthlyReport}
        isLoading={generatingPDF}
      />

      {/* Edit Dialog */}
      <EditOwnerDialog
        owner={owner}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce propriétaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{owner.name}" ? Cette action est irréversible.
              {totalProperties > 0 && (
                <span className="block mt-2 text-destructive">
                  Attention : {totalProperties} bien(s) sont associés à ce propriétaire.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default OwnerDetails;
