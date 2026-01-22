import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { KPISection } from "@/components/dashboard/KPISection";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { LatePaymentsChart } from "@/components/dashboard/LatePaymentsChart";
import { PropertyPerformanceChart } from "@/components/dashboard/PropertyPerformanceChart";
import { OccupancyChart } from "@/components/dashboard/OccupancyChart";
import { PropertyTypesChart } from "@/components/dashboard/PropertyTypesChart";
import { RecentPayments } from "@/components/dashboard/RecentPayments";
import { StatCard } from "@/components/dashboard/StatCard";
import { DraggableWidget } from "@/components/dashboard/DraggableWidget";
import { useDashboardPreferences, WidgetId } from "@/hooks/useDashboardPreferences";
import { useProperties } from "@/hooks/useProperties";
import { usePayments } from "@/hooks/usePayments";
import { useTenants } from "@/hooks/useTenants";
import { useContracts } from "@/hooks/useContracts";
import { Building2, Users, Wallet, TrendingUp, Loader2 } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { ReactNode } from "react";

const AdvancedDashboard = () => {
  const { preferences, toggleWidget, updateOrder, setPeriod, resetPreferences, isVisible } = useDashboardPreferences();
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: contracts, isLoading: contractsLoading } = useContracts();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const isLoading = propertiesLoading || paymentsLoading || tenantsLoading || contractsLoading;

  // Compute base stats
  const totalProperties = properties?.length || 0;
  const activeTenants = tenants?.filter((t) =>
    t.contracts?.some((c) => c.status === "active")
  ).length || 0;

  const now = new Date();
  const periodMonths = preferences.period === "month" ? 1 : preferences.period === "quarter" ? 3 : 12;
  const startDate = new Date(now.getFullYear(), now.getMonth() - periodMonths + 1, 1);

  const monthlyRevenue = payments?.filter((p) => {
    const paidDate = p.paid_date ? new Date(p.paid_date) : null;
    return p.status === "paid" && paidDate && paidDate >= startDate;
  }).reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const occupiedProperties = properties?.filter((p) => p.status === "occupé").length || 0;
  const occupancyRate = totalProperties > 0
    ? Math.round((occupiedProperties / totalProperties) * 100)
    : 0;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = preferences.widgetOrder.indexOf(active.id as WidgetId);
      const newIndex = preferences.widgetOrder.indexOf(over.id as WidgetId);
      updateOrder(arrayMove(preferences.widgetOrder, oldIndex, newIndex));
    }
  };

  const renderWidget = (widgetId: WidgetId): ReactNode => {
    if (!isVisible(widgetId)) return null;

    switch (widgetId) {
      case "stats":
        return (
          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total des biens"
              value={totalProperties}
              change={totalProperties > 0 ? `${totalProperties} bien${totalProperties > 1 ? "s" : ""}` : "Aucun bien"}
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
              title="Revenus période"
              value={`${monthlyRevenue.toLocaleString("fr-FR")} F CFA`}
              change={preferences.period === "month" ? "Ce mois" : preferences.period === "quarter" ? "Ce trimestre" : "Cette année"}
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
          </div>
        );

      case "revenue-trend":
        return (
          <RevenueTrendChart
            payments={payments || []}
            period={preferences.period}
          />
        );

      case "late-analysis":
        return (
          <LatePaymentsChart
            payments={payments || []}
            period={preferences.period}
          />
        );

      case "property-performance":
        return (
          <PropertyPerformanceChart
            properties={properties || []}
            payments={payments || []}
            period={preferences.period}
          />
        );

      case "occupancy":
        return <OccupancyChart properties={properties || []} />;

      case "property-types":
        return <PropertyTypesChart properties={properties || []} />;

      case "recent-payments":
        return <RecentPayments />;

      default:
        return null;
    }
  };

  // Filter and sort widgets for main grid
  const mainWidgets: WidgetId[] = ["revenue-trend", "late-analysis", "property-performance", "occupancy", "property-types", "recent-payments"];
  const sortedMainWidgets = preferences.widgetOrder.filter((id) => mainWidgets.includes(id) && isVisible(id));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Tableau de bord avancé
            </h1>
            <p className="text-muted-foreground mt-1">
              Analyses détaillées et KPIs personnalisables
            </p>
          </div>
          <DashboardFilters
            period={preferences.period}
            onPeriodChange={setPeriod}
            visibleWidgets={preferences.visibleWidgets}
            onToggleWidget={toggleWidget}
            onReset={resetPreferences}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Row */}
            {isVisible("stats") && renderWidget("stats")}

            {/* KPIs Section */}
            <KPISection
              properties={properties || []}
              payments={payments || []}
              contracts={contracts || []}
              period={preferences.period}
              visibleWidgets={preferences.visibleWidgets}
            />

            {/* Draggable Charts Grid */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sortedMainWidgets} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedMainWidgets.map((widgetId) => (
                    <DraggableWidget
                      key={widgetId}
                      id={widgetId}
                      className={
                        widgetId === "revenue-trend"
                          ? "col-span-full lg:col-span-2"
                          : widgetId === "recent-payments"
                          ? "md:col-span-2 lg:col-span-1"
                          : ""
                      }
                    >
                      {renderWidget(widgetId)}
                    </DraggableWidget>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdvancedDashboard;
