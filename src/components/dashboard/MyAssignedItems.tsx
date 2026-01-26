import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  Users, 
  MapPin, 
  ChevronRight, 
  UserCheck,
  Home,
  Mail,
  Phone,
  AlertCircle,
  AlertTriangle,
  Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProperties } from "@/hooks/useProperties";
import { useTenants } from "@/hooks/useTenants";
import { useAgencyMembers } from "@/hooks/useAgencyMembers";
import { usePayments } from "@/hooks/usePayments";
import { useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";

export function MyAssignedItems() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { data: members } = useAgencyMembers();

  // Check if user is a team member (not the agency owner)
  const isTeamMember = useMemo(() => {
    return members?.some(m => m.user_id === user?.id);
  }, [members, user?.id]);

  // Get items assigned to current user
  const myAssignedProperties = useMemo(() => {
    if (!properties || !user?.id) return [];
    return properties.filter((p: any) => p.assigned_to === user.id);
  }, [properties, user?.id]);

  const myAssignedTenants = useMemo(() => {
    if (!tenants || !user?.id) return [];
    return tenants.filter((t: any) => t.assigned_to === user.id);
  }, [tenants, user?.id]);

  // Get late payments for assigned tenants
  const latePaymentsByTenant = useMemo(() => {
    if (!payments || !myAssignedTenants.length) return new Map();
    
    const tenantIds = new Set(myAssignedTenants.map((t: any) => t.id));
    const lateMap = new Map<string, { count: number; totalAmount: number; oldestDays: number }>();
    
    payments.forEach((payment: any) => {
      if (tenantIds.has(payment.tenant_id) && payment.status === 'late') {
        const existing = lateMap.get(payment.tenant_id) || { count: 0, totalAmount: 0, oldestDays: 0 };
        const daysLate = differenceInDays(new Date(), parseISO(payment.due_date));
        lateMap.set(payment.tenant_id, {
          count: existing.count + 1,
          totalAmount: existing.totalAmount + Number(payment.amount),
          oldestDays: Math.max(existing.oldestDays, daysLate)
        });
      }
    });
    
    return lateMap;
  }, [payments, myAssignedTenants]);

  // Total late payments summary
  const latePaymentsSummary = useMemo(() => {
    let totalCount = 0;
    let totalAmount = 0;
    latePaymentsByTenant.forEach(({ count, totalAmount: amount }) => {
      totalCount += count;
      totalAmount += amount;
    });
    return { totalCount, totalAmount };
  }, [latePaymentsByTenant]);

  const isLoading = propertiesLoading || tenantsLoading || paymentsLoading;

  // Only show for team members who have assignments
  if (!isTeamMember && myAssignedProperties.length === 0 && myAssignedTenants.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasAssignments = myAssignedProperties.length > 0 || myAssignedTenants.length > 0;

  // Status badges for properties
  const statusClasses: Record<string, string> = {
    disponible: "bg-emerald/10 text-emerald border-emerald/20",
    loué: "bg-navy/10 text-navy border-navy/20",
    vendu: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "en attente": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          Mes éléments assignés
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAssignments ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun élément ne vous est assigné pour le moment.</p>
            <p className="text-xs mt-1">Les biens et locataires assignés apparaîtront ici.</p>
          </div>
        ) : (
          <>
            {/* Late Payments Alert */}
            {latePaymentsSummary.totalCount > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">
                      {latePaymentsSummary.totalCount} paiement{latePaymentsSummary.totalCount > 1 ? 's' : ''} en retard
                    </p>
                    <p className="text-xs opacity-90">
                      Total: {latePaymentsSummary.totalAmount.toLocaleString('fr-FR')} F CFA
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded-lg p-3 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Building2 className="h-4 w-4" />
                  Biens
                </div>
                <p className="text-2xl font-bold text-foreground">{myAssignedProperties.length}</p>
              </div>
              <div className="bg-background rounded-lg p-3 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  Locataires
                </div>
                <p className="text-2xl font-bold text-foreground">{myAssignedTenants.length}</p>
              </div>
            </div>

            {/* My Properties */}
            {myAssignedProperties.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Mes biens ({myAssignedProperties.length})
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-7"
                    onClick={() => navigate("/properties")}
                  >
                    Voir tout
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {myAssignedProperties.slice(0, 3).map((property: any) => (
                    <div 
                      key={property.id}
                      className="bg-background rounded-lg p-3 border hover:border-primary/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/properties/${property.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Home className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {property.title}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {property.address}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] flex-shrink-0 ${statusClasses[property.status] || ""}`}
                        >
                          {property.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {myAssignedProperties.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      + {myAssignedProperties.length - 3} autre(s) bien(s)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* My Tenants */}
            {myAssignedTenants.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald" />
                    Mes locataires ({myAssignedTenants.length})
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-7"
                    onClick={() => navigate("/tenants")}
                  >
                    Voir tout
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {myAssignedTenants.slice(0, 3).map((tenant: any) => {
                    const lateInfo = latePaymentsByTenant.get(tenant.id);
                    const hasLatePayments = !!lateInfo;
                    
                    return (
                      <div 
                        key={tenant.id}
                        className={`bg-background rounded-lg p-3 border hover:border-primary/50 cursor-pointer transition-colors ${
                          hasLatePayments ? 'border-destructive/50 bg-destructive/5' : ''
                        }`}
                        onClick={() => navigate(`/tenants/${tenant.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            hasLatePayments ? 'bg-destructive/10' : 'bg-emerald/10'
                          }`}>
                            <span className={`text-sm font-semibold ${
                              hasLatePayments ? 'text-destructive' : 'text-emerald'
                            }`}>
                              {tenant.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-foreground truncate">
                                {tenant.name}
                              </p>
                              {hasLatePayments && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {lateInfo.count} retard{lateInfo.count > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                {tenant.email}
                              </span>
                              {tenant.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {tenant.phone}
                                </span>
                              )}
                            </div>
                            {hasLatePayments && (
                              <p className="text-xs text-destructive mt-1">
                                {lateInfo.totalAmount.toLocaleString('fr-FR')} F CFA • {lateInfo.oldestDays}j de retard
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {myAssignedTenants.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      + {myAssignedTenants.length - 3} autre(s) locataire(s)
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
