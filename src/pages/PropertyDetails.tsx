import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProperty, useDeleteProperty } from "@/hooks/useProperties";
import { useContracts } from "@/hooks/useContracts";
import { PropertyInventoryManager } from "@/components/property/PropertyInventoryManager";
import { useOwners } from "@/hooks/useOwners";
import { useTenants } from "@/hooks/useTenants";
import { usePayments } from "@/hooks/usePayments";
import { usePropertyInterventions } from "@/hooks/usePropertyInterventions";
import { useAgency } from "@/hooks/useAgency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  Calendar, 
  Pencil, 
  Trash2,
  Home,
  Building,
  Map,
  Loader2,
  User,
  Share2,
  FileText
} from "lucide-react";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { useWhatsAppPropertyMessage } from "@/hooks/useWhatsAppPropertyMessage";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { EditPropertyDialog } from "@/components/property/EditPropertyDialog";
import { PropertyImageGallery } from "@/components/property/PropertyImageGallery";
import { PropertyUnitsManager } from "@/components/property/PropertyUnitsManager";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { generatePropertyMonthlyReport } from "@/lib/generatePropertyMonthlyReport";
import { getTenantCollectedAmountForPeriod } from "@/lib/monthlyPaymentTotals";
import { MonthlyReportPeriodDialog } from "@/components/owner/MonthlyReportPeriodDialog";
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

const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: property, isLoading, error } = useProperty(id || "");
  const { data: owners = [] } = useOwners();
  const { data: contracts = [] } = useContracts();
  const { data: tenants = [] } = useTenants();
  const { data: payments = [] } = usePayments();
  const { data: propertyInterventions = [] } = usePropertyInterventions(id);
  const { data: agency } = useAgency();
  const deleteProperty = useDeleteProperty();
  const { canEdit, canDelete } = usePermissions();
  const { generateMessage } = useWhatsAppPropertyMessage();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const owner = property?.owner_id ? owners.find(o => o.id === property.owner_id) : null;
  const activeContract = property ? contracts.find(c => c.property_id === property.id && c.status === "actif") : null;
  const tenantName = activeContract?.tenant ? (activeContract.tenant as any).name : undefined;

  const handleDelete = async () => {
    if (!property) return;
    try {
      await deleteProperty.mutateAsync({ id: property.id, title: property.title });
      toast.success("Bien supprimé avec succès");
      navigate("/properties");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleGeneratePropertyReport = async (month: number, year: number) => {
    if (!property) return;
    setGeneratingPDF(true);
    try {
      const selectedDate = new Date(year, month, 1);
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      const periodLabel = format(selectedDate, "MMMM yyyy", { locale: fr });

      // Get tenants for this property
      const propertyTenants = tenants.filter(t => t.property_id === property.id);

      const monthStartStr = format(monthStart, "yyyy-MM-dd");
      const monthEndStr = format(monthEnd, "yyyy-MM-dd");

      const tenantPayments = propertyTenants.map(tenant => {
        const tenantPaymentsThisMonth = payments.filter(p =>
          p.tenant_id === tenant.id &&
          p.due_date >= monthStartStr &&
          p.due_date <= monthEndStr
        );

        const totalDue = tenantPaymentsThisMonth.reduce((sum, p) => sum + p.amount, 0) || (property.price || 0);
        const totalPaid = getTenantCollectedAmountForPeriod(payments, tenant.id, monthStartStr, monthEndStr);

        const hasLate = tenantPaymentsThisMonth.some(p =>
          p.status === "pending" && new Date(p.due_date) < new Date()
        );

        let status: "paid" | "pending" | "late" = "pending";
        if (totalPaid >= totalDue && totalDue > 0) status = "paid";
        else if (hasLate) status = "late";

        // Calculate displayStatus: count unpaid months up to selected month
        const allPaymentsUpToMonth = payments.filter(p =>
          p.tenant_id === tenant.id &&
          p.due_date <= monthEndStr
        );
        const unpaidMonths = allPaymentsUpToMonth.filter(p =>
          p.status !== "paid" && !(p.paid_amount && p.paid_amount >= p.amount)
        ).length;

        let displayStatus: string | undefined;
        if (status === "paid" && unpaidMonths === 0) {
          displayStatus = "A jour";
        } else if (unpaidMonths > 0 && status !== "pending") {
          displayStatus = `${unpaidMonths} mois de retard`;
        }

        const paidPayment = tenantPaymentsThisMonth.find(p => p.status === "paid");

        return {
          tenantName: tenant.name,
          unitNumber: (tenant as any).unit?.unit_number || undefined,
          rentAmount: totalDue,
          paidAmount: totalPaid,
          status,
          displayStatus,
          paidDate: paidPayment?.paid_date || null,
        };
      }).filter(t => t.rentAmount > 0);

      // Filter interventions for this month
      const monthlyInterventions = propertyInterventions
        .filter(intervention => {
          if (!intervention.start_date) return false;
          const startDate = new Date(intervention.start_date);
          return startDate >= monthStart && startDate <= monthEnd;
        })
        .map(intervention => ({
          title: intervention.title,
          type: intervention.type,
          cost: intervention.cost || 0,
          status: intervention.status,
        }));

      const commissionPercentage = owner?.management_type?.percentage || 0;

      // Prepare advance payments
      const advancePayments = propertyTenants
        .map(tenant => {
          const activeContract = (tenant as any).contracts?.find((c: any) => c.status === "active");
          const monthlyRent = activeContract?.rent_amount || property.price || 0;
          const results: { tenantName: string; unitNumber?: string; monthsCovered: string[]; amount: number }[] = [];

          const advPayments = payments.filter(p => {
            if (p.tenant_id !== tenant.id) return false;
            const hasPaid = p.status === "paid" || (p.paid_amount && p.paid_amount > 0);
            if (!hasPaid) return false;
            const paidDate = p.paid_date?.substring(0, 10);
            const createdDate = p.created_at?.substring(0, 10);
            const paidThisMonth = (paidDate && paidDate >= monthStartStr && paidDate <= monthEndStr) ||
              (createdDate && createdDate >= monthStartStr && createdDate <= monthEndStr);
            if (!paidThisMonth) return false;
            const dueDate = p.due_date?.substring(0, 10);
            const pm = (p as any).payment_months as string[] | null;
            const isMultiMonth = pm && Array.isArray(pm) && pm.length > 1;
            const isFutureMonth = dueDate && dueDate > monthEndStr;
            return isMultiMonth || isFutureMonth;
          });
          advPayments.forEach(ap => {
            const amt = ap.status === "paid" ? ap.amount : (ap.paid_amount || 0);
            const isPartialPayment = ap.status !== "paid" && ap.paid_amount && ap.paid_amount > 0 && ap.paid_amount < ap.amount;
            const rawMonths = ((ap as any).payment_months as string[]) || [format(new Date(ap.due_date), "MMMM yyyy", { locale: fr })];
            const monthsCovered = isPartialPayment ? rawMonths.map(m => `${m} (partiel)`) : rawMonths;
            results.push({
              tenantName: tenant.name,
              unitNumber: (tenant as any).unit?.unit_number || undefined,
              monthsCovered,
              amount: amt,
            });
          });

          // Overpayment on current month
          const currentMonthPayments = payments.filter(p =>
            p.tenant_id === tenant.id &&
            p.due_date >= monthStartStr &&
            p.due_date <= monthEndStr
          );
          const totalPaidCurrentMonth = currentMonthPayments.reduce((sum, p) => {
            if (p.status === "paid") return sum + p.amount;
            if (p.paid_amount && p.paid_amount > 0) return sum + p.paid_amount;
            return sum;
          }, 0);
          if (totalPaidCurrentMonth > monthlyRent && monthlyRent > 0) {
            const overpayment = totalPaidCurrentMonth - monthlyRent;
            // Calculate next month name instead of "Surplus"
            const nextMonth = addMonths(monthStart, 1);
            const nextMonthLabel = format(nextMonth, "MMMM yyyy", { locale: fr });
            const isPartial = overpayment < monthlyRent;
            results.push({
              tenantName: tenant.name,
              unitNumber: (tenant as any).unit?.unit_number || undefined,
              monthsCovered: [isPartial ? `${nextMonthLabel} (partiel)` : nextMonthLabel],
              amount: overpayment,
            });
          }

          return results;
        })
        .flat();

      // Prepare late payments
      const latePayments = propertyTenants
        .map(tenant => {
          const lateCollected = payments.filter(p => {
            if (p.tenant_id !== tenant.id) return false;
            if (p.due_date >= monthStartStr) return false;
            const paidDate = p.paid_date?.substring(0, 10);
            if (!paidDate || paidDate < monthStartStr || paidDate > monthEndStr) return false;
            if (!(p.status === "paid" || (p.paid_amount && p.paid_amount > 0))) return false;
            // Exclude multi-month payments already counted in advance section
            const pm = (p as any).payment_months as string[] | null;
            if (pm && Array.isArray(pm) && pm.length > 1) return false;
            return true;
          });

          return lateCollected.map(lp => {
            const paidAmt = lp.status === "paid" ? lp.amount : (lp.paid_amount || 0);
            return {
              tenantName: tenant.name,
              unitNumber: (tenant as any).unit?.unit_number || undefined,
              dueMonth: format(new Date(lp.due_date), "MMMM yyyy", { locale: fr }),
              rentAmount: lp.amount,
              paidAmount: paidAmt,
              status: (lp.status === "paid" ? "paid" : "partial") as "paid" | "partial",
            };
          });
        })
        .flat();

      await generatePropertyMonthlyReport({
        propertyTitle: property.title,
        propertyAddress: property.address,
        propertyType: property.property_type,
        ownerName: owner?.name,
        period: periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1),
        agency: agency ? {
          name: agency.name,
          email: agency.email,
          phone: agency.phone || undefined,
          address: agency.address || undefined,
          logo_url: agency.logo_url,
        } : null,
        tenantPayments,
        interventions: monthlyInterventions,
        advancePayments,
        latePayments,
        commissionPercentage,
        managementTypeName: (owner as any)?.management_type?.name,
      });

      setPeriodDialogOpen(false);
      toast.success("Point mensuel du bien généré avec succès");
    } catch (error) {
      console.error("Error generating property monthly report:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !property) {
    return (
      <DashboardLayout>
        <div className="text-center py-24">
          <p className="text-destructive mb-4">Bien introuvable ou erreur de chargement.</p>
          <Button variant="outline" onClick={() => navigate("/properties")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux biens
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusClasses: Record<string, string> = {
    disponible: "bg-emerald/10 text-emerald border-emerald/20",
    loué: "bg-navy/10 text-navy border-navy/20",
    vendu: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "en attente": "bg-sand text-navy border-sand-dark/20",
  };

  const typeLabels: Record<string, string> = {
    maison: "Maison à porte multiple",
    appartement: "Appartement",
    terrain: "Terrain",
    meuble: "Location meublée",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    maison: <Home className="h-5 w-5" />,
    appartement: <Building className="h-5 w-5" />,
    terrain: <Map className="h-5 w-5" />,
    meuble: <Building className="h-5 w-5" />,
  };

  const defaultImage = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-navy via-navy/95 to-primary/80 shadow-xl">
          {/* Background image with overlay */}
          <div className="absolute inset-0">
            {property.image_url ? (
              <img
                src={property.image_url}
                alt={property.title}
                className="w-full h-full object-cover opacity-20"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-navy via-navy/90 to-primary/60" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/60 to-transparent" />
          </div>

          <div className="relative p-6 sm:p-8 flex flex-col gap-4">
            {/* Back button + Title */}
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/properties")}
                className="shrink-0 mt-0.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                    {typeIcons[property.property_type] || <Building className="h-5 w-5 text-white" />}
                  </div>
                  <Badge className="bg-white/15 backdrop-blur-sm border-white/20 text-white text-xs">
                    {typeLabels[property.property_type] || property.property_type}
                  </Badge>
                  <Badge variant="outline" className={cn(
                    "text-xs backdrop-blur-sm",
                    property.status === "disponible" && "bg-emerald/20 text-emerald-300 border-emerald/30",
                    property.status === "loué" && "bg-blue-400/20 text-blue-200 border-blue-400/30",
                    property.status === "vendu" && "bg-purple-400/20 text-purple-200 border-purple-400/30",
                    property.status === "en attente" && "bg-amber-400/20 text-amber-200 border-amber-400/30",
                  )}>
                    {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white truncate">
                  {property.title}
                </h1>
                <p className="flex items-center gap-1.5 text-sm text-white/70 mt-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{property.address}</span>
                </p>
              </div>
            </div>

            {/* Price highlight */}
            <div className="flex items-end justify-between">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
                <p className="text-xs text-white/60 uppercase tracking-wider mb-0.5">
                  {property.type === "location" ? "Loyer mensuel" : "Prix de vente"}
                </p>
                <p className="text-2xl sm:text-3xl font-display font-bold text-white">
                  {property.price.toLocaleString('fr-FR')} <span className="text-lg font-normal text-white/80">F CFA</span>
                  {property.type === "location" && <span className="text-sm font-normal text-white/60">/mois</span>}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <WhatsAppButton
                message={generateMessage(property)}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-emerald hover:border-emerald hover:text-white backdrop-blur-sm"
              >
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Partager</span>
              </WhatsAppButton>
              {property.type === "location" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPeriodDialogOpen(true)}
                  disabled={generatingPDF}
                  className="bg-white/10 border-white/20 text-white hover:bg-primary hover:border-primary hover:text-white backdrop-blur-sm"
                >
                  <FileText className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Point mensuel</span>
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <Pencil className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Modifier</span>
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="bg-red-500/20 border-red-400/30 text-red-200 hover:bg-destructive hover:border-destructive hover:text-white backdrop-blur-sm"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Supprimer</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">

            {/* Caractéristiques */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Caractéristiques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {property.bedrooms !== null && property.bedrooms !== undefined && (
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/10">
                      <div className="p-2.5 bg-primary/15 rounded-xl">
                        <Bed className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pièces</p>
                        <p className="text-xl font-bold text-foreground">{property.bedrooms}</p>
                      </div>
                    </div>
                  )}
                  {property.bathrooms !== null && property.bathrooms !== undefined && (
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/10">
                      <div className="p-2.5 bg-primary/15 rounded-xl">
                        <Bath className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Salles de bain</p>
                        <p className="text-xl font-bold text-foreground">{property.bathrooms}</p>
                      </div>
                    </div>
                  )}
                  {property.area && (
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/10">
                      <div className="p-2.5 bg-primary/15 rounded-xl">
                        <Maximize className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Surface</p>
                        <p className="text-xl font-bold text-foreground">{property.area} m²</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {property.description && (
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {property.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Property Units (Multi-door management) */}
            {property.type === "location" && (property.property_type === "maison" || property.property_type === "immeuble") && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Gestion des portes</CardTitle>
                </CardHeader>
                <CardContent>
                  <PropertyUnitsManager propertyId={property.id} canEdit={canEdit} />
                </CardContent>
              </Card>
            )}

            {/* Property Inventory (Furnished rental) */}
            {property.property_type === "meuble" && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Inventaire du mobilier</CardTitle>
                </CardHeader>
                <CardContent>
                  <PropertyInventoryManager
                    propertyId={property.id}
                    propertyTitle={property.title}
                    propertyAddress={property.address}
                    canEdit={canEdit}
                    tenantName={tenantName}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info Sidebar */}
          <div className="space-y-4">
            {/* Owner Info */}
            {owner && (
              <Card className="border-0 shadow-md overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Propriétaire</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <div 
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => navigate("/owners")}
                  >
                    <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full ring-2 ring-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{owner.name}</p>
                      {owner.email && (
                        <p className="text-xs text-muted-foreground truncate">{owner.email}</p>
                      )}
                      {owner.phone && (
                        <p className="text-xs text-muted-foreground">{owner.phone}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dates & Meta */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 bg-muted rounded-lg">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Créé le</p>
                    <p className="font-medium text-foreground">{new Date(property.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                {property.updated_at !== property.created_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-1.5 bg-muted rounded-lg">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Modifié le</p>
                      <p className="font-medium text-foreground">{new Date(property.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditPropertyDialog
        property={property}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bien ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{property.title}" ? Cette action est irréversible.
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

      {/* Monthly Report Period Dialog */}
      <MonthlyReportPeriodDialog
        open={periodDialogOpen}
        onOpenChange={setPeriodDialogOpen}
        onGenerate={handleGeneratePropertyReport}
        isLoading={generatingPDF}
      />
    </DashboardLayout>
  );
};

export default PropertyDetails;
