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
import { usePropertyUnitsSummary } from "@/hooks/usePropertyUnitsSummary";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { PeriodFilter, PeriodValue, getDefaultPeriod, getPeriodLabel } from "@/components/dashboard/PeriodFilter";
import { SubscriptionExpiryBanner } from "@/components/dashboard/SubscriptionExpiryBanner";
import { AIAdvisorChat } from "@/components/ai/AIAdvisorChat";

const Index = () => {
  const { user } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useCurrentUserRole();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [period, setPeriod] = useState<PeriodValue>(getDefaultPeriod);
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { data: whatsappStats } = useWhatsAppLogsCount();
  const { data: unitsSummary } = usePropertyUnitsSummary();

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
    // useTenants est déjà scoped par rôle/assignation + RLS
    return tenants;
  }, [tenants]);

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    // usePayments est déjà scoped par rôle/assignation + RLS
    return payments;
  }, [payments]);

  // Apply period filter to payments
  const periodFilteredPayments = useMemo(() => {
    return filteredPayments.filter(p => {
      const dateStr = p.paid_date || p.due_date;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= period.from && d <= period.to;
    });
  }, [filteredPayments, period]);

  // Compute stats using filtered data
  const totalProperties = filteredProperties.length;
  const activeTenants = filteredTenants.filter(t => 
    t.contracts?.some(c => c.status === 'active')
  ).length;
  
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthEnd = new Date(thisYear, thisMonth + 1, 0);
  const monthStartStr = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-01`;
  const monthEndStr = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
  const currentYM = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}`;
  const FRENCH_MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  const monthlyRevenue = filteredPayments.reduce((sum, p: any) => {
    const status = p.status;
    const paidDate = p.paid_date;
    const paymentMonths = p.payment_months as string[] | null;
    const isMultiMonth = paymentMonths && Array.isArray(paymentMonths) && paymentMonths.length > 1;
    const totalAmount = Number(p.paid_amount) || Number(p.amount);
    const isPaidInPeriod = paidDate && paidDate >= monthStartStr && paidDate <= monthEndStr;

    if (status === 'paid') {
      if (isMultiMonth) {
        const perMonth = Math.round(totalAmount / paymentMonths.length);
        const overlapping = paymentMonths.filter(m => {
          const parts = m.split(' ');
          if (parts.length === 2) {
            const idx = FRENCH_MONTHS.indexOf(parts[0]);
            if (idx >= 0) return `${parts[1]}-${String(idx + 1).padStart(2, '0')}` === currentYM;
          }
          return m.substring(0, 7) === currentYM;
        }).length;
        return sum + perMonth * overlapping;
      } else if (isPaidInPeriod) {
        return sum + totalAmount;
      } else if (paymentMonths && paymentMonths.length === 1) {
        const m = paymentMonths[0];
        const parts = m.split(' ');
        let ym = m.substring(0, 7);
        if (parts.length === 2) {
          const idx = FRENCH_MONTHS.indexOf(parts[0]);
          if (idx >= 0) ym = `${parts[1]}-${String(idx + 1).padStart(2, '0')}`;
        }
        if (ym === currentYM) return sum + totalAmount;
      }
    } else if ((status === 'pending' || status === 'late') && Number(p.paid_amount) > 0) {
      if (isPaidInPeriod || (p.due_date && p.due_date >= monthStartStr && p.due_date <= monthEndStr)) {
        return sum + Number(p.paid_amount);
      }
    }
    return sum;
  }, 0);

  // Calculate occupancy considering units (portes)
  const { totalUnits, occupiedUnits } = useMemo(() => {
    let total = 0;
    let occupied = 0;
    filteredProperties.forEach(p => {
      const summary = unitsSummary ? unitsSummary[p.id] : null;
      if (summary && summary.total_units > 0) {
        total += summary.total_units;
        occupied += summary.occupied_units;
      } else {
        total++;
        if (p.status === 'loué') occupied++;
      }
    });
    return { totalUnits: total, occupiedUnits: occupied };
  }, [filteredProperties, unitsSummary]);

  const occupancyRate = totalUnits > 0 
    ? Math.round((occupiedUnits / totalUnits) * 100) 
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
        {/* Subscription Expiry Banner */}
        <SubscriptionExpiryBanner />

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
          <PeriodFilter value={period} onChange={setPeriod} />
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
              title="Revenus du mois"
              value={`${monthlyRevenue.toLocaleString('fr-FR')} F CFA`}
              change={now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              changeType="positive"
              icon={Wallet}
              iconBg="sand"
            />
            <StatCard
              title="Taux d'occupation"
              value={`${occupancyRate}%`}
              change={`${occupiedUnits}/${totalUnits} unités`}
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
            <RevenueChart payments={filteredPayments} periodLabel={getPeriodLabel(period)} periodFrom={period.from} periodTo={period.to} />
            <OccupancyChart properties={filteredProperties} />
            <PropertyTypesChart properties={filteredProperties} />
          </div>
        )}

        {/* Manager Performance Chart */}
        {!isLoading && <ManagerPerformanceChart periodFrom={period.from} periodTo={period.to} />}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            <MyAssignedItems />
            <ManagerPerformance periodFrom={period.from} periodTo={period.to} />
            <RecentPayments />
          </div>
      </div>
      <AIAdvisorChat context="all" />
      </div>
    </DashboardLayout>
  );
};

export default Index;
