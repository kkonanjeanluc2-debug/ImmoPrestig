import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building2, Users, Search, Trash2, Shield, Crown, UserCog, Eye, Loader2, Power, PowerOff, Home, CreditCard, TrendingUp, ClipboardList, Receipt } from "lucide-react";
import { useIsSuperAdmin, useAllAgencies, useDeleteAgency, useSuperAdminUpdateRole, useToggleAccountStatus, AgencyWithProfile } from "@/hooks/useSuperAdmin";
import { useLogSuperAdminAction, SuperAdminActionType } from "@/hooks/useSuperAdminAudit";
import { AuditLogCard } from "@/components/superadmin/AuditLogCard";
import { RegistrationChart } from "@/components/superadmin/RegistrationChart";
import { SubscriptionPlansManager } from "@/components/superadmin/SubscriptionPlansManager";
import { AgencySubscriptionsManager } from "@/components/superadmin/AgencySubscriptionsManager";
import { TransactionsDashboard } from "@/components/superadmin/TransactionsDashboard";
import { RevenueEvolutionChart } from "@/components/superadmin/RevenueEvolutionChart";
import { AppRole, ROLE_LABELS } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Navigate } from "react-router-dom";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  agence: "Agence",
  proprietaire: "Propriétaire",
};

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  super_admin: <Crown className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  gestionnaire: <UserCog className="h-3 w-3" />,
  lecture_seule: <Eye className="h-3 w-3" />,
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  admin: "bg-red-500/10 text-red-600 border-red-500/20",
  gestionnaire: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  lecture_seule: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const SuperAdmin = () => {
  const { toast } = useToast();
  const { isSuperAdmin, isLoading: isLoadingRole } = useIsSuperAdmin();
  const { data: agencies, isLoading: isLoadingAgencies } = useAllAgencies();
  const deleteAgency = useDeleteAgency();
  const updateRole = useSuperAdminUpdateRole();
  const toggleStatus = useToggleAccountStatus();
  const logAction = useLogSuperAdminAction();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "agence" | "proprietaire">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, AppRole>>({});
  const [activeTab, setActiveTab] = useState("overview");

  // Audit logging helper
  const logAudit = useCallback(async (
    actionType: SuperAdminActionType,
    targetUserId?: string,
    targetAgencyId?: string,
    details?: Record<string, any>
  ) => {
    try {
      await logAction.mutateAsync({ actionType, targetUserId, targetAgencyId, details });
    } catch (error) {
      console.error("Failed to log audit:", error);
    }
  }, [logAction]);

  // Redirect if not super admin
  if (!isLoadingRole && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredAgencies = (agencies || []).filter((agency) => {
    // Text search filter
    const matchesSearch = 
      agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Type filter
    const matchesType = typeFilter === "all" || agency.account_type === typeFilter;
    
    // Status filter
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "active" && agency.is_active) ||
      (statusFilter === "inactive" && !agency.is_active);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const activeCount = (agencies || []).filter(a => a.is_active).length;
  const inactiveCount = (agencies || []).filter(a => !a.is_active).length;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    setPendingRoleChanges((prev) => ({ ...prev, [userId]: newRole }));
  };

  const saveRoleChange = async (agency: AgencyWithProfile) => {
    const newRole = pendingRoleChanges[agency.user_id];
    if (!newRole) return;

    try {
      await updateRole.mutateAsync({ 
        userId: agency.user_id, 
        role: newRole,
        oldRole: agency.role,
        agencyData: { id: agency.id, name: agency.name, email: agency.email },
        logAudit,
      });
      setPendingRoleChanges((prev) => {
        const updated = { ...prev };
        delete updated[agency.user_id];
        return updated;
      });
      toast({
        title: "Rôle mis à jour",
        description: "Le rôle de l'utilisateur a été modifié avec succès.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le rôle.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAgency = async (agency: AgencyWithProfile) => {
    try {
      await deleteAgency.mutateAsync({ 
        id: agency.id,
        agencyData: { name: agency.name, email: agency.email, user_id: agency.user_id },
        logAudit,
      });
      toast({
        title: "Agence supprimée",
        description: `L'agence "${agency.name}" a été supprimée.`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'agence.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (agency: AgencyWithProfile) => {
    try {
      await toggleStatus.mutateAsync({ 
        id: agency.id, 
        is_active: !agency.is_active,
        agencyData: { user_id: agency.user_id, name: agency.name, email: agency.email },
        logAudit,
      });
      toast({
        title: agency.is_active ? "Compte désactivé" : "Compte activé",
        description: `Le compte "${agency.name}" a été ${agency.is_active ? "désactivé" : "activé"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le statut du compte.",
        variant: "destructive",
      });
    }
  };

  const totalAgencies = agencies?.filter((a) => a.account_type === "agence").length || 0;
  const totalProprietaires = agencies?.filter((a) => a.account_type === "proprietaire").length || 0;
  const totalProperties = agencies?.reduce((sum, a) => sum + (a.stats?.properties_count || 0), 0) || 0;
  const totalTenants = agencies?.reduce((sum, a) => sum + (a.stats?.tenants_count || 0), 0) || 0;
  const totalRevenue = agencies?.reduce((sum, a) => sum + (a.stats?.total_revenue || 0), 0) || 0;

  if (isLoadingRole) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Crown className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                Espace Super Admin
              </h1>
              <p className="text-muted-foreground mt-1">
                Gestion centralisée de la plateforme
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto gap-2 bg-muted/50 p-1">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 data-[state=active]:bg-background py-2.5"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Vue d'ensemble</span>
              <span className="sm:hidden">Comptes</span>
            </TabsTrigger>
            <TabsTrigger
              value="subscriptions"
              className="flex items-center gap-2 data-[state=active]:bg-background py-2.5"
            >
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Abonnements</span>
              <span className="sm:hidden">Forfaits</span>
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="flex items-center gap-2 data-[state=active]:bg-background py-2.5"
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">Paiements</span>
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="flex items-center gap-2 data-[state=active]:bg-background py-2.5"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Journal d'audit</span>
              <span className="sm:hidden">Audit</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Agences</p>
                  <p className="text-xl font-bold">{totalAgencies}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Propriétaires</p>
                  <p className="text-xl font-bold">{totalProprietaires}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Home className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Biens</p>
                  <p className="text-xl font-bold">{totalProperties}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Locataires</p>
                  <p className="text-xl font-bold">{totalTenants}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total comptes</p>
                  <p className="text-xl font-bold">{agencies?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenus totaux</p>
                  <p className="text-lg font-bold">{totalRevenue.toLocaleString()} FCFA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registration Chart */}
        {agencies && agencies.length > 0 && (
          <RegistrationChart agencies={agencies} />
        )}

        {/* Agencies List */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des comptes</CardTitle>
            <CardDescription>
              Gérez les agences et propriétaires inscrits sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email ou ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type de compte" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="agence">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Agences ({totalAgencies})
                    </div>
                  </SelectItem>
                  <SelectItem value="proprietaire">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Propriétaires ({totalProprietaires})
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <Power className="h-4 w-4 text-green-600" />
                      Actifs ({activeCount})
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center gap-2">
                      <PowerOff className="h-4 w-4 text-red-600" />
                      Inactifs ({inactiveCount})
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoadingAgencies ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAgencies.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucun compte trouvé
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Compte</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Biens</TableHead>
                      <TableHead className="text-center">Locataires</TableHead>
                      <TableHead className="text-right">Revenus</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Inscrit le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgencies.map((agency) => {
                      const currentRole = pendingRoleChanges[agency.user_id] || agency.role || "lecture_seule";
                      const hasPendingChange = !!pendingRoleChanges[agency.user_id];

                      return (
                        <TableRow key={agency.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={agency.logo_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getInitials(agency.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{agency.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {agency.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={agency.is_active 
                                ? "bg-green-500/10 text-green-600 border-green-500/20" 
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                              }
                            >
                              {agency.is_active ? "Actif" : "Désactivé"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {ACCOUNT_TYPE_LABELS[agency.account_type] || agency.account_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium">{agency.stats?.properties_count || 0}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium">{agency.stats?.tenants_count || 0}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium text-green-600">
                              {(agency.stats?.total_revenue || 0).toLocaleString()} FCFA
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select
                                value={currentRole}
                                onValueChange={(value: AppRole) =>
                                  handleRoleChange(agency.user_id, value)
                                }
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue>
                                    <div className="flex items-center gap-2">
                                      {ROLE_ICONS[currentRole]}
                                      <span>{ROLE_LABELS[currentRole] || currentRole}</span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {(["super_admin", "admin", "gestionnaire", "lecture_seule"] as AppRole[]).map(
                                    (role) => (
                                      <SelectItem key={role} value={role}>
                                        <div className="flex items-center gap-2">
                                          {ROLE_ICONS[role]}
                                          <span>{ROLE_LABELS[role] || role}</span>
                                        </div>
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                              {hasPendingChange && (
                                <Button
                                  size="sm"
                                  onClick={() => saveRoleChange(agency)}
                                  disabled={updateRole.isPending}
                                >
                                  {updateRole.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Sauver"
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(agency.created_at), "dd MMM yyyy", {
                              locale: fr,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleStatus(agency)}
                                disabled={toggleStatus.isPending}
                                className={agency.is_active 
                                  ? "text-orange-600 hover:text-orange-600 hover:bg-orange-500/10" 
                                  : "text-green-600 hover:text-green-600 hover:bg-green-500/10"
                                }
                                title={agency.is_active ? "Désactiver le compte" : "Activer le compte"}
                              >
                                {toggleStatus.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : agency.is_active ? (
                                  <PowerOff className="h-4 w-4" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Supprimer ce compte ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible. Le compte "{agency.name}" et toutes ses données associées seront définitivement supprimés.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteAgency(agency)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <SubscriptionPlansManager />
            <AgencySubscriptionsManager />
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <RevenueEvolutionChart />
            <TransactionsDashboard />
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-6">
            <AuditLogCard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdmin;
