import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Users, 
  FileText, 
  Clock,
  AlertTriangle,
  Loader2,
  Pencil,
  Eye,
  UserCheck,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import { useState } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTenants, useDeleteTenant, TenantWithDetails } from "@/hooks/useTenants";
import { useOwners } from "@/hooks/useOwners";
import { AddTenantDialog } from "@/components/tenant/AddTenantDialog";
import { ImportTenantsDialog } from "@/components/tenant/ImportTenantsDialog";
import { MergeTenantsDialog } from "@/components/tenant/MergeTenantsDialog";
import { EditTenantDialog } from "@/components/tenant/EditTenantDialog";
import { EmailHistoryDialog } from "@/components/tenant/EmailHistoryDialog";
import { TenantTrashDialog } from "@/components/tenant/TenantTrashDialog";
import { TenantPortalAccessDialog } from "@/components/tenant/TenantPortalAccessDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { AssignmentBadge } from "@/components/assignment/AssignUserSelect";
import { useToast } from "@/hooks/use-toast";
import { useRevokeTenantPortalAccess } from "@/hooks/useTenantPortalAccess";
import { useNewTenantRequestsCount, useNewTenantRequests } from "@/hooks/useNewTenantRequestsCount";
import { useTenantsActiveRequestsMap, TenantActiveRequest } from "@/hooks/useTenantsActiveRequests";
import { MessageSquare } from "lucide-react";

import { useAssignableUsers, useIsAgencyOwner } from "@/hooks/useAssignableUsers";

const contractStatusConfig = {
  active: { label: "Actif", className: "bg-emerald/10 text-emerald border-emerald/20" },
  ending_soon: { label: "Fin proche", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  expired: { label: "Expiré", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  ancien: { label: "Ancien locataire", className: "bg-muted text-muted-foreground border-muted-foreground/20" },
};


function getPaymentStatusLabel(tenant: TenantWithDetails, isExpelled?: boolean) {
  // If tenant has been expelled
  if (isExpelled) {
    return { label: "Expulsé", className: "bg-muted text-muted-foreground border-muted-foreground/30" };
  }

  const activeContract = tenant.contracts?.find(c => c.status === 'active');
  if (!activeContract) {
    // No active contract = check if expired (could be expelled)
    const hasExpired = tenant.contracts?.some(c => c.status === 'expired');
    if (hasExpired) {
      return { label: "Expulsé", className: "bg-muted text-muted-foreground border-muted-foreground/30" };
    }
    return null;
  }
  
  const payments = tenant.payments || [];
  
  // Check for any late payments - if any exist, tenant is in "Retard"
  const latePayments = payments.filter(p => p.status === 'late');
  if (latePayments.length > 0) {
    const lateDays = Math.max(...latePayments.map(p => Math.ceil((new Date().getTime() - new Date(p.due_date).getTime()) / (1000 * 60 * 60 * 24))));
    if (latePayments.length >= 3) {
      return { label: "Retard fréquent", className: "bg-orange-500/10 text-orange-600 border-orange-500/30" };
    }
    return { label: `Retard ${lateDays}j+`, className: "bg-destructive/10 text-destructive border-destructive/30" };
  }
  
  // Check if current month is paid
  const now = new Date();
  const currentMonthPayments = payments.filter(p => {
    const dueDate = new Date(p.due_date);
    return dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear();
  });
  
  const currentMonthPaid = currentMonthPayments.some(p => p.status === 'paid');
  if (currentMonthPaid) {
    return { label: "À jour", className: "bg-emerald/10 text-emerald border-emerald/30" };
  }
  
  // No late payments, current month not yet paid - still "À jour" (not overdue yet)
  return { label: "À jour", className: "bg-emerald/10 text-emerald border-emerald/30" };
}

// Keep TenantCard interfaces for handlers
const requestStatusConfig: Record<string, { label: string; className: string }> = {
  nouveau: { label: "Nouveau", className: "bg-destructive/10 text-destructive border-destructive/20" },
  en_cours: { label: "En cours", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  en_attente: { label: "En attente", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  rejete: { label: "Rejeté", className: "bg-red-500/10 text-red-500 border-red-500/20" },
};

// TenantCard removed - using table layout now
export default function Tenants() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldOpenAdd = searchParams.get("add") === "true";
  const [searchQuery, setSearchQuery] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [editingTenant, setEditingTenant] = useState<TenantWithDetails | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [accessDialogTenant, setAccessDialogTenant] = useState<TenantWithDetails | null>(null);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const { data: tenants, isLoading, error } = useTenants();
  const deleteTenantMutation = useDeleteTenant();
  const revokeAccessMutation = useRevokeTenantPortalAccess();
  const { toast } = useToast();
  const { hasPermission, role, isLoading: permLoading } = usePermissions();
  const canCreate = hasPermission("can_create_tenants");
  const canEdit = hasPermission("can_edit_tenants");
  const canDelete = hasPermission("can_delete_tenants");
  const { data: assignableUsers = [] } = useAssignableUsers();
  const { isOwner: isAgencyOwner } = useIsAgencyOwner();
  const { count: newRequestsCount, markAsSeen } = useNewTenantRequestsCount();
  const { data: newRequests } = useNewTenantRequests();
  const [requestsDialogOpen, setRequestsDialogOpen] = useState(false);
  const { requestsByTenant } = useTenantsActiveRequestsMap();
  const { data: owners = [] } = useOwners();

  if (!permLoading && role !== "super_admin" && role !== "admin" && !hasPermission("can_view_tenants")) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleOpenRequests = () => {
    setRequestsDialogOpen(true);
    markAsSeen();
  };

  const categoryLabels: Record<string, string> = {
    maintenance: "Maintenance",
    reclamation: "Réclamation",
    administrative: "Administratif",
  };

  const priorityConfig: Record<string, { label: string; className: string }> = {
    haute: { label: "Haute", className: "bg-destructive/10 text-destructive border-destructive/20" },
    moyenne: { label: "Moyenne", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    basse: { label: "Basse", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  };

  const handleEditTenant = (tenant: TenantWithDetails) => {
    setEditingTenant(tenant);
    setEditDialogOpen(true);
  };

  const handleViewTenant = (tenant: TenantWithDetails) => {
    navigate(`/tenants/${tenant.id}`);
  };

  const handleDeleteTenant = async (tenant: TenantWithDetails) => {
    try {
      await deleteTenantMutation.mutateAsync({ id: tenant.id, name: tenant.name });
      toast({
        title: "Locataire supprimé",
        description: `${tenant.name} a été déplacé dans la corbeille.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer le locataire.",
      });
    }
  };

  const handleCreateAccess = (tenant: TenantWithDetails) => {
    setAccessDialogTenant(tenant);
    setAccessDialogOpen(true);
  };

  const handleRevokeAccess = async (tenant: TenantWithDetails) => {
    try {
      await revokeAccessMutation.mutateAsync(tenant.id);
      toast({
        title: "Accès révoqué",
        description: `L'accès portail de ${tenant.name} a été désactivé.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de révoquer l'accès.",
      });
    }
  };


  const filteredTenants = (tenants || []).filter(tenant => {
    const paymentStatus = getPaymentStatusLabel(tenant);
    
    // Status filter using button-based filters
    if (statusFilter === "uptodate") {
      if (paymentStatus?.label !== "À jour") return false;
    }
    if (statusFilter === "late") {
      if (!paymentStatus?.label.includes("Retard")) return false;
    }
    if (statusFilter === "expelled") {
      if (paymentStatus?.label !== "Expulsé") return false;
    }

    const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.property?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const assignedTo = tenant.assigned_to;
    const matchesAssigned = assignedFilter === "all"
      ? true
      : assignedFilter === "unassigned"
        ? !assignedTo
        : assignedTo === assignedFilter;

    const matchesOwner = ownerFilter === "all"
      ? true
      : tenant.property?.owner_id === ownerFilter;
    
    return matchesSearch && matchesAssigned && matchesOwner;
  });

  // Compute stats
  const totalTenants = tenants?.length || 0;
  const activeContracts = tenants?.filter(t => 
    t.contracts?.some(c => c.status === 'active')
  ).length || 0;
  const pendingPayments = tenants?.reduce((sum, t) => 
    sum + (t.payments?.filter(p => p.status === 'pending').length || 0)
  , 0) || 0;
  const latePayments = tenants?.reduce((sum, t) => 
    sum + (t.payments?.filter(p => p.status === 'late').length || 0)
  , 0) || 0;

  const stats = [
    { title: "Total Locataires", value: totalTenants.toString(), icon: Users, color: "text-emerald" },
    { title: "Contrats Actifs", value: activeContracts.toString(), icon: FileText, color: "text-blue-500" },
    { title: "Paiements en attente", value: pendingPayments.toString(), icon: Clock, color: "text-amber-500" },
    { title: "Retards de paiement", value: latePayments.toString(), icon: AlertTriangle, color: "text-red-500" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground">
              Locataires
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Gérez vos locataires, contrats et paiements
            </p>
          </div>
          
          {/* Action buttons - scrollable on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap">
            <ExportDropdown
              data={tenants || []}
              filename="locataires"
              columns={[
                { key: 'name', label: 'Nom' },
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Téléphone', format: (v) => v || '' },
                { key: 'property', label: 'Bien', format: (v) => v?.title || 'Non assigné' },
                { key: 'property', label: 'Adresse', format: (v) => v?.address || '' },
                { key: 'contracts', label: 'Loyer (F CFA)', format: (v) => {
                  const active = v?.find((c: any) => c.status === 'active');
                  return active ? Number(active.rent_amount).toString() : '';
                }},
                { key: 'contracts', label: 'Statut contrat', format: (v) => {
                  const active = v?.find((c: any) => c.status === 'active');
                  return active ? 'Actif' : 'Inactif';
                }},
              ]}
            />
            {isAgencyOwner && <TenantTrashDialog />}
            {canCreate && <ImportTenantsDialog />}
            {canEdit && <MergeTenantsDialog />}
            {canCreate && <AddTenantDialog defaultOpen={shouldOpenAdd} onSuccess={() => setSearchParams({})} />}
          </div>

          {/* Emergency button for new requests */}
          {newRequestsCount > 0 && (
            <Button
              onClick={handleOpenRequests}
              className="animate-pulse bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2 shadow-lg"
            >
              <Bell className="h-4 w-4" />
              <span>{newRequestsCount} nouvelle{newRequestsCount > 1 ? "s" : ""} requête{newRequestsCount > 1 ? "s" : ""} locataire</span>
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un locataire..."
                className="pl-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="w-[220px] h-9">
                  <SelectValue placeholder="Propriétaire" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les propriétaires</SelectItem>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAgencyOwner && assignableUsers.length > 1 && (
                <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                  <SelectTrigger className="w-[220px] h-9">
                    <SelectValue placeholder="Gestionnaire" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les gestionnaires</SelectItem>
                    <SelectItem value="unassigned">Non assignés</SelectItem>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex rounded-lg border border-border overflow-hidden">
                {[
                  { value: "all", label: "Tous" },
                  { value: "uptodate", label: "À jour" },
                  { value: "late", label: "Retard" },
                  { value: "expelled", label: "Expulsés" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium transition-colors",
                      statusFilter === filter.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={cn("p-1.5 sm:p-2 rounded-lg bg-muted flex-shrink-0", stat.color)}>
                    <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.title}</p>
                    <p className="text-base sm:text-lg font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Erreur lors du chargement des locataires.</p>
          </div>
        )}

        {/* Tenant Table */}
        {!isLoading && !error && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Locataire</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Bien</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Loyer</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Statut</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Fin de Bail</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTenants.map((tenant) => {
                    const activeContract = tenant.contracts?.find(c => c.status === 'active') || tenant.contracts?.[0];
                    const paymentStatus = getPaymentStatusLabel(tenant);
                    const propertyLabel = tenant.property
                      ? `${tenant.property.title}${tenant.unit ? `, ${tenant.unit.unit_number}` : ''}`
                      : "—";

                    return (
                      <tr key={tenant.id} className="hover:bg-muted/50 transition-colors">
                        {/* Locataire */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-primary">
                                {tenant.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">{tenant.name}</p>
                              {tenant.phone && (
                                <p className="text-xs text-muted-foreground">{tenant.phone}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Bien */}
                        <td className="px-4 py-3">
                          <div className="max-w-[250px]">
                            <p className="text-sm text-foreground break-words">{tenant.property?.title || "—"}</p>
                            {tenant.unit && (
                              <p className="text-xs text-muted-foreground break-words">{tenant.unit.unit_number}</p>
                            )}
                          </div>
                        </td>
                        {/* Loyer */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                            {activeContract 
                              ? `${Number(activeContract.rent_amount).toLocaleString('fr-FR')} FCFA`
                              : "—"}
                          </span>
                        </td>
                        {/* Statut */}
                        <td className="px-4 py-3 text-center">
                          {paymentStatus ? (
                            <Badge variant="outline" className={cn("text-xs", paymentStatus.className)}>
                              {paymentStatus.label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        {/* Fin de Bail */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-foreground whitespace-nowrap">
                            {activeContract
                              ? new Date(activeContract.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                              : "—"}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <EmailHistoryDialog tenantId={tenant.id} tenantName={tenant.name} />
                            {canEdit && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditTenant(tenant)}>
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewTenant(tenant)}>
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredTenants.length === 0 && (
                <div className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {tenants?.length === 0 
                      ? "Aucun locataire enregistré. Ajoutez votre premier locataire !"
                      : "Aucun locataire trouvé."}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Edit Tenant Dialog */}
        <EditTenantDialog
          tenant={editingTenant}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />

        {/* Portal Access Dialog */}
        {accessDialogTenant && (
          <TenantPortalAccessDialog
            open={accessDialogOpen}
            onOpenChange={setAccessDialogOpen}
            tenant={{
              id: accessDialogTenant.id,
              name: accessDialogTenant.name,
              email: accessDialogTenant.email,
            }}
          />
        )}

        {/* New Requests Dialog */}
        <Dialog open={requestsDialogOpen} onOpenChange={setRequestsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-destructive" />
                Nouvelles requêtes locataires
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {newRequests && newRequests.length > 0 ? (
                newRequests.map((req: any) => (
                  <Card key={req.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-foreground">{req.title}</h4>
                        <div className="flex gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {categoryLabels[req.category] || req.category}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[10px]", priorityConfig[req.priority]?.className)}>
                            {priorityConfig[req.priority]?.label || req.priority}
                          </Badge>
                        </div>
                      </div>
                      {req.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{req.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {req.tenants?.name || "Locataire"}
                        </span>
                        <span>{new Date(req.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-1 gap-1"
                        onClick={() => {
                          setRequestsDialogOpen(false);
                          navigate(`/tenants/${req.tenant_id}`);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Voir le locataire
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune nouvelle requête.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
