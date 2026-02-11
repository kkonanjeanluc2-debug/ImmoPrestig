import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentPayments } from "@/components/dashboard/RecentPayments";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { OccupancyChart } from "@/components/dashboard/OccupancyChart";
import { PropertyTypesChart } from "@/components/dashboard/PropertyTypesChart";
import { SubscriptionQuotaCard } from "@/components/dashboard/SubscriptionQuotaCard";
import { MyAssignedItems } from "@/components/dashboard/MyAssignedItems";
import { ManagerPerformance } from "@/components/dashboard/ManagerPerformance";
import { ManagerPerformanceChart } from "@/components/dashboard/ManagerPerformanceChart";
import { Building2, Users, Wallet, TrendingUp, Loader2, FileText, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/hooks/useProperties";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import { useTenants } from "@/hooks/useTenants";
import { usePayments } from "@/hooks/usePayments";
import { useWhatsAppLogsCount } from "@/hooks/useWhatsAppLogsCount";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { DateRangeFilter } from "@/components/payment/DateRangeFilter";
import { DateRange } from "react-day-picker";

const Index = () => {
  const { user } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useCurrentUserRole();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { data: whatsappStats } = useWhatsAppLogsCount();

  // Check if user is a gestionnaire (manager) - filter data to show only their assigned items
  const isGestionnaire = userRole?.role === "gestionnaire";

  // Filter data based on role
  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    if (!isGestionnaire || !user) return properties;
    return properties.filter(p => p.assigned_to === user.id);
  }, [properties, isGestionnaire, user]);

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    if (!isGestionnaire || !user) return tenants;
    return tenants.filter(t => t.assigned_to === user.id);
  }, [tenants, isGestionnaire, user]);

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    if (!isGestionnaire || !user) return payments;
    const assignedTenantIds = new Set(filteredTenants.map(t => t.id));
    return payments.filter(p => assignedTenantIds.has(p.tenant_id));
  }, [payments, isGestionnaire, user, filteredTenants]);

  // Apply month filter to payments
  const periodFilteredPayments = useMemo(() => {
    if (!dateRange?.from) return filteredPayments;
    return filteredPayments.filter(p => {
      const dateStr = p.paid_date || p.due_date;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (dateRange.to) {
        return d >= dateRange.from! && d <= dateRange.to;
      }
      return d.toDateString() === dateRange.from!.toDateString();
    });
  }, [filteredPayments, dateRange]);

  // Compute stats using filtered data
  const totalProperties = filteredProperties.length;
  const activeTenants = filteredTenants.filter(t => 
    t.contracts?.some(c => c.status === 'active')
  ).length;
  
  const revenuePayments = dateRange?.from ? periodFilteredPayments : filteredPayments;
  const monthlyRevenue = revenuePayments.filter(p => {
    const paidDate = p.paid_date ? new Date(p.paid_date) : null;
    if (!paidDate || p.status !== 'paid') return false;
    if (dateRange?.from) return true;
    const now = new Date();
    return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
  }).reduce((sum, p) => sum + Number(p.amount), 0);

  const occupiedProperties = filteredProperties.filter(p => p.status === 'loué').length;
  const occupancyRate = totalProperties > 0 
    ? Math.round((occupiedProperties / totalProperties) * 100) 
    : 0;

  const handleGenerateReceipts = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-monthly-receipts');
      
      if (error) throw error;
      
      toast({
        title: "Génération terminée",
        description: `${data.sent || 0} quittance(s) envoyée(s), ${data.skipped || 0} déjà envoyée(s).`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer les quittances.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Redirect super admin to their dedicated space
  if (!roleLoading && userRole?.role === "super_admin") {
    return <Navigate to="/super-admin" replace />;
  }

  const isLoading = propertiesLoading || tenantsLoading || paymentsLoading || roleLoading;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Tableau de bord
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Bienvenue. Voici un aperçu de votre patrimoine immobilier.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
            <Button
              variant="outline"
              onClick={handleGenerateReceipts}
              disabled={isGenerating}
              className="w-full sm:w-auto text-sm"
              size="sm"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Générer les quittances
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard
              title="Total des biens"
              value={totalProperties}
              change={totalProperties > 0 ? `${totalProperties} bien${totalProperties > 1 ? 's' : ''}` : "Aucun bien"}
              changeType="positive"
              icon={Building2}
              iconBg="navy"
            />
            <StatCard
              title="Locataires actifs"
              value={activeTenants}
              change={activeTenants > 0 ? "Contrats actifs" : "Aucun locataire"}
              changeType="positive"
              icon={Users}
              iconBg="emerald"
            />
            <StatCard
              title="Revenus mensuels"
              value={`${monthlyRevenue.toLocaleString('fr-FR')} F CFA`}
              change={dateRange?.from ? "Période sélectionnée" : "Ce mois-ci"}
              changeType="positive"
              icon={Wallet}
              iconBg="sand"
            />
            <StatCard
              title="Taux d'occupation"
              value={`${occupancyRate}%`}
              change={`${occupiedProperties}/${totalProperties} biens`}
              changeType="positive"
              icon={TrendingUp}
              iconBg="navy"
            />
            <StatCard
              title="Messages WhatsApp"
              value={whatsappStats?.total || 0}
              change={`${whatsappStats?.thisMonth || 0} ce mois`}
              changeType="positive"
              icon={MessageCircle}
              iconBg="emerald"
            />
          </div>
        )}

        {/* Charts Section */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <RevenueChart payments={periodFilteredPayments} />
            <OccupancyChart properties={filteredProperties} />
            <PropertyTypesChart properties={filteredProperties} />
          </div>
        )}

        {/* Manager Performance Chart */}
        {!isLoading && <ManagerPerformanceChart />}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            <MyAssignedItems />
            <ManagerPerformance />
            <RecentPayments />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
