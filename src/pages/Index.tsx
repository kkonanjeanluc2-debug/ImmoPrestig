import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { OccupancyChart } from "@/components/dashboard/OccupancyChart";
import { PropertyTypesChart } from "@/components/dashboard/PropertyTypesChart";
import { ManagerPerformance } from "@/components/dashboard/ManagerPerformance";
import { ManagerPerformanceChart } from "@/components/dashboard/ManagerPerformanceChart";
import { PaymentEvolutionChart } from "@/components/dashboard/PaymentEvolutionChart";
import { Building2, Users, Wallet, TrendingUp, Loader2, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/hooks/useProperties";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import { getCollectedRevenueForPeriod } from "@/lib/revenueCollections";
import { useTenants } from "@/hooks/useTenants";
import { usePayments } from "@/hooks/usePayments";

import { usePropertyUnitsSummary } from "@/hooks/usePropertyUnitsSummary";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { usePermissions } from "@/hooks/usePermissions";
import { PeriodFilter, PeriodValue, getDefaultPeriod, getPeriodLabel } from "@/components/dashboard/PeriodFilter";

import { AIAdvisorChat } from "@/components/ai/AIAdvisorChat";

const Index = () => {
  const { user } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useCurrentUserRole();
  const { hasPermission, role } = usePermissions();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [period, setPeriod] = useState<PeriodValue>(getDefaultPeriod);
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  
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

  // Compute late payments (arriérés)
  const latePaymentsStats = useMemo(() => {
    if (!filteredPayments) return { total: 0, totalAmount: 0 };
    const late = filteredPayments.filter(p => p.status === 'en_retard' || p.status === 'late' || (p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date()));
    const totalAmount = late.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return { total: late.length, totalAmount };
  }, [filteredPayments]);

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

  // Use selected period for revenue calculation (based on paid_date)
  const periodFromStr = `${period.from.getFullYear()}-${String(period.from.getMonth() + 1).padStart(2, '0')}-${String(period.from.getDate()).padStart(2, '0')}`;
  const periodToStr = `${period.to.getFullYear()}-${String(period.to.getMonth() + 1).padStart(2, '0')}-${String(period.to.getDate()).padStart(2, '0')}`;

  const monthlyRevenue = useMemo(() => {
    return (filteredPayments || []).reduce((sum, p: any) => {
      if (p._isVirtual) return sum;
      const collectionDate = p.status === 'paid' ? (p.paid_date || p.created_at) : p.paid_date;
      if (!collectionDate) return sum;
      const dateOnly = collectionDate.substring(0, 10);
      if (dateOnly >= periodFromStr && dateOnly <= periodToStr) {
        return sum + (Number(p.paid_amount) || Number(p.amount) || 0);
      }
      return sum;
    }, 0);
  }, [filteredPayments, periodFromStr, periodToStr]);

  const periodLabel = getPeriodLabel(period);

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

  // Redirect users without gestion locative access
  if (!roleLoading && role !== "admin" && role !== "super_admin" && !hasPermission("can_access_gestion_locative")) {
    return <Navigate to="/lotissements" replace />;
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
              title="Retard (Arriéré)"
              value={latePaymentsStats.total}
              change={`${latePaymentsStats.totalAmount.toLocaleString("fr-FR")} F CFA`}
              changeType="negative"
              icon={AlertTriangle}
              iconBg="sand"
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

        {/* Payment Evolution Chart */}
        {!isLoading && (
          <PaymentEvolutionChart payments={filteredPayments} periodFrom={period.from} periodTo={period.to} />
        )}

        {/* Manager Performance Chart */}
        {!isLoading && <ManagerPerformanceChart periodFrom={period.from} periodTo={period.to} />}

        {/* Manager Performance Grid */}
        {!isLoading && (
          <ManagerPerformance periodFrom={period.from} periodTo={period.to} />
        )}
      <AIAdvisorChat context="all" />
      </div>
    </DashboardLayout>
  );
};

export default Index;
