import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Building2,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useAssignableUsers, useIsAgencyOwner } from "@/hooks/useAssignableUsers";
import { useProperties } from "@/hooks/useProperties";
import { useTenants } from "@/hooks/useTenants";
import { usePayments } from "@/hooks/usePayments";
import { useMemo } from "react";

interface ManagerStats {
  userId: string;
  name: string;
  role: string;
  propertiesCount: number;
  tenantsCount: number;
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  latePayments: number;
  collectionRate: number;
  totalRevenue: number;
  collectedRevenue: number;
}

export function ManagerPerformance() {
  const { isOwner: isAgencyOwner } = useIsAgencyOwner();
  const { data: assignableUsers = [], isLoading: usersLoading } = useAssignableUsers();
  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const { data: tenants = [], isLoading: tenantsLoading } = useTenants();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();

  const managerStats = useMemo(() => {
    if (!assignableUsers.length) return [];

    const stats: ManagerStats[] = assignableUsers.map((user) => {
      // Get properties assigned to this user
      const userProperties = properties.filter(
        (p: any) => p.assigned_to === user.user_id
      );

      // Get tenants assigned to this user
      const userTenants = tenants.filter(
        (t: any) => t.assigned_to === user.user_id
      );

      // Get tenant IDs for payment calculation
      const tenantIds = new Set(userTenants.map((t: any) => t.id));

      // Get payments for assigned tenants
      const userPayments = payments.filter((p: any) => tenantIds.has(p.tenant_id));

      const paidPayments = userPayments.filter((p: any) => p.status === "paid");
      const pendingPayments = userPayments.filter((p: any) => p.status === "pending");
      const latePayments = userPayments.filter((p: any) => p.status === "late");

      const totalRevenue = userPayments.reduce(
        (sum: number, p: any) => sum + Number(p.amount),
        0
      );
      const collectedRevenue = paidPayments.reduce(
        (sum: number, p: any) => sum + Number(p.amount),
        0
      );

      const collectionRate =
        userPayments.length > 0
          ? (paidPayments.length / userPayments.length) * 100
          : 0;

      return {
        userId: user.user_id,
        name: user.full_name || user.email || "Utilisateur",
        role: user.role,
        propertiesCount: userProperties.length,
        tenantsCount: userTenants.length,
        totalPayments: userPayments.length,
        paidPayments: paidPayments.length,
        pendingPayments: pendingPayments.length,
        latePayments: latePayments.length,
        collectionRate,
        totalRevenue,
        collectedRevenue,
      };
    });

    // Sort by properties count descending
    return stats.sort((a, b) => b.propertiesCount - a.propertiesCount);
  }, [assignableUsers, properties, tenants, payments]);

  const isLoading = usersLoading || propertiesLoading || tenantsLoading || paymentsLoading;

  // Only show for agency owners
  if (!isAgencyOwner) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (managerStats.length === 0) {
    return null;
  }

  // Calculate totals
  const totals = managerStats.reduce(
    (acc, stat) => ({
      properties: acc.properties + stat.propertiesCount,
      tenants: acc.tenants + stat.tenantsCount,
      totalRevenue: acc.totalRevenue + stat.totalRevenue,
      collectedRevenue: acc.collectedRevenue + stat.collectedRevenue,
    }),
    { properties: 0, tenants: 0, totalRevenue: 0, collectedRevenue: 0 }
  );

  const overallCollectionRate =
    totals.totalRevenue > 0
      ? (totals.collectedRevenue / totals.totalRevenue) * 100
      : 0;

  const getCollectionRateColor = (rate: number) => {
    if (rate >= 90) return "text-emerald";
    if (rate >= 70) return "text-amber-500";
    return "text-destructive";
  };

  const getCollectionRateBg = (rate: number) => {
    if (rate >= 90) return "bg-emerald";
    if (rate >= 70) return "bg-amber-500";
    return "bg-destructive";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Performance par gestionnaire
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totals.properties}</p>
            <p className="text-xs text-muted-foreground">Biens assignés</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totals.tenants}</p>
            <p className="text-xs text-muted-foreground">Locataires</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className={`text-2xl font-bold ${getCollectionRateColor(overallCollectionRate)}`}>
              {overallCollectionRate.toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Recouvrement</p>
          </div>
        </div>

        {/* Manager List */}
        <div className="space-y-3">
          {managerStats.map((manager) => (
            <div
              key={manager.userId}
              className="bg-background border rounded-lg p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {manager.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{manager.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {manager.role}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getCollectionRateColor(manager.collectionRate)}`}>
                    {manager.collectionRate.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">recouvrement</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-muted/30 rounded p-2">
                  <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="font-bold">{manager.propertiesCount}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Biens</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <div className="flex items-center justify-center gap-1 text-violet-500 mb-1">
                    <Users className="h-3.5 w-3.5" />
                    <span className="font-bold">{manager.tenantsCount}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Locataires</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <div className="flex items-center justify-center gap-1 text-emerald mb-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span className="font-bold">{manager.paidPayments}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Payés</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <div className="flex items-center justify-center gap-1 text-destructive mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="font-bold">{manager.latePayments}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Retards</p>
                </div>
              </div>

              {/* Collection Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Revenus collectés</span>
                  <span className="font-medium text-foreground">
                    {manager.collectedRevenue.toLocaleString("fr-FR")} / {manager.totalRevenue.toLocaleString("fr-FR")} F CFA
                  </span>
                </div>
                <Progress
                  value={manager.collectionRate}
                  className="h-2"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Empty state for managers with no assignments */}
        {managerStats.every((m) => m.propertiesCount === 0 && m.tenantsCount === 0) && (
          <div className="text-center py-4 text-muted-foreground">
            <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune assignation effectuée.</p>
            <p className="text-xs">Assignez des biens ou locataires aux gestionnaires pour voir leurs performances.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
