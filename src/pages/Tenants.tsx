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
  Search, 
  Users, 
  FileText, 
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Euro,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Wallet,
  Loader2,
  Pencil,
  Eye,
  UserCheck,
  DoorOpen,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTenants, useDeleteTenant, TenantWithDetails } from "@/hooks/useTenants";
import { AddTenantDialog } from "@/components/tenant/AddTenantDialog";
import { ImportTenantsDialog } from "@/components/tenant/ImportTenantsDialog";
import { MergeTenantsDialog } from "@/components/tenant/MergeTenantsDialog";
import { EditTenantDialog } from "@/components/tenant/EditTenantDialog";
import { EmailHistoryDialog } from "@/components/tenant/EmailHistoryDialog";
import { TenantTrashDialog } from "@/components/tenant/TenantTrashDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { AssignmentBadge } from "@/components/assignment/AssignUserSelect";
import { useToast } from "@/hooks/use-toast";

import { useAssignableUsers, useIsAgencyOwner } from "@/hooks/useAssignableUsers";

const contractStatusConfig = {
  active: { label: "Actif", className: "bg-emerald/10 text-emerald border-emerald/20" },
  ending_soon: { label: "Fin proche", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  expired: { label: "Expiré", className: "bg-red-500/10 text-red-500 border-red-500/20" },
};

const paymentStatusConfig = {
  paid: { label: "Payé", icon: CheckCircle, className: "text-emerald" },
  pending: { label: "En attente", icon: Clock, className: "text-amber-500" },
  late: { label: "En retard", icon: XCircle, className: "text-red-500" },
  upcoming: { label: "À venir", icon: Clock, className: "text-blue-500" },
};

interface TenantCardProps {
  tenant: TenantWithDetails;
  onEdit: (tenant: TenantWithDetails) => void;
  onView: (tenant: TenantWithDetails) => void;
  onDelete: (tenant: TenantWithDetails) => void;
  canEdit: boolean;
  isDeleting: boolean;
}

function TenantCard({ tenant, onEdit, onView, onDelete, canEdit, isDeleting }: TenantCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Get active contract
  const activeContract = tenant.contracts?.find(c => c.status === 'active') || tenant.contracts?.[0];
  const contractStatus = activeContract?.status as keyof typeof contractStatusConfig || 'expired';
  const statusConfig = contractStatusConfig[contractStatus] || contractStatusConfig.expired;
  const assignedTo = (tenant as any).assigned_to;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            {/* Avatar */}
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-base sm:text-lg font-semibold text-muted-foreground">
                {tenant.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                <h3 className="font-semibold text-sm sm:text-base text-foreground truncate max-w-[180px] sm:max-w-none">{tenant.name}</h3>
                <Badge variant="outline" className={cn("text-[10px] sm:text-xs", statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
                {assignedTo && <AssignmentBadge userId={assignedTo} />}
              </div>

              {/* Contact */}
              <div className="flex flex-col gap-1 text-xs sm:text-sm text-muted-foreground mb-2">
                <a href={`mailto:${tenant.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors truncate">
                  <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                  <span className="truncate">{tenant.email}</span>
                </a>
                {tenant.phone && (
                  <a href={`tel:${tenant.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                    <span>{tenant.phone}</span>
                  </a>
                )}
              </div>

              {/* Property */}
              {tenant.property && (
                <div className="flex items-start gap-1.5 text-xs sm:text-sm">
                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{tenant.property.title}</p>
                      {tenant.unit && (
                        <Badge variant="secondary" className="text-[10px] flex items-center gap-1 h-5">
                          <DoorOpen className="h-3 w-3" />
                          {tenant.unit.unit_number}
                          <span className="text-muted-foreground">
                            ({tenant.unit.rooms_count} pièce{tenant.unit.rooms_count > 1 ? 's' : ''})
                          </span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-[10px] sm:text-xs truncate">{tenant.property.address}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(tenant)}
                  className="gap-1 h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden xs:inline">Détails</span>
                </Button>
                <EmailHistoryDialog tenantId={tenant.id} tenantName={tenant.name} />
                {canEdit && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(tenant)}
                      className="gap-1 h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                    >
                      <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="hidden xs:inline">Modifier</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          )}
                          <span className="hidden xs:inline">Supprimer</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce locataire ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer <strong>{tenant.name}</strong> ? Cette action est irréversible et supprimera également tous les contrats et paiements associés.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(tenant)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>

            {/* Rent Amount */}
            {activeContract && (
              <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                <span className="text-base sm:text-xl font-bold text-foreground">
                  {Number(activeContract.rent_amount).toLocaleString('fr-FR')}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">F CFA/mois</span>
              </div>
            )}
          </div>
        </div>

        {/* Contract Summary */}
        {activeContract && (
          <div className="px-4 sm:px-6 pb-4">
            <div className="flex flex-wrap gap-3 sm:gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Début:</span>
                <span className="font-medium">{new Date(activeContract.start_date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Fin:</span>
                <span className="font-medium">{new Date(activeContract.end_date).toLocaleDateString('fr-FR')}</span>
              </div>
              {activeContract.deposit && (
                <div className="flex items-center gap-1.5">
                  <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Dépôt:</span>
                  <span className="font-medium">{Number(activeContract.deposit).toLocaleString('fr-FR')} F CFA</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expand Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 sm:px-6 py-3 border-t border-border flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Wallet className="h-4 w-4" />
          <span>Historique des paiements</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Payment History */}
        {expanded && (
          <div className="border-t border-border bg-muted/30">
            <div className="p-4 sm:p-6">
              <h4 className="text-sm font-medium text-foreground mb-3">Derniers paiements</h4>
              <div className="space-y-2">
                {tenant.payments && tenant.payments.length > 0 ? (
                  tenant.payments.slice(0, 5).map((payment) => {
                    const status = paymentStatusConfig[payment.status as keyof typeof paymentStatusConfig] || paymentStatusConfig.pending;
                    const StatusIcon = status.icon;
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 bg-background rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className={cn("h-4 w-4", status.className)} />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {new Date(payment.due_date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                            <p className={cn("text-xs", status.className)}>{status.label}</p>
                          </div>
                        </div>
                        <span className="font-semibold text-foreground">
                          {Number(payment.amount).toLocaleString('fr-FR')} F CFA
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun paiement enregistré</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Tenants() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [editingTenant, setEditingTenant] = useState<TenantWithDetails | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { data: tenants, isLoading, error } = useTenants();
  const deleteTenantMutation = useDeleteTenant();
  const { toast } = useToast();
  const { canCreate, canEdit } = usePermissions();
  const { data: assignableUsers = [] } = useAssignableUsers();
  const { isOwner: isAgencyOwner } = useIsAgencyOwner();

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


  const filteredTenants = (tenants || []).filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.property?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const assignedTo = (tenant as any).assigned_to;
    const matchesAssigned = assignedFilter === "all"
      ? true
      : assignedFilter === "unassigned"
        ? !assignedTo
        : assignedTo === assignedFilter;
    
    return matchesSearch && matchesAssigned;
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
            <TenantTrashDialog />
            {canCreate && <ImportTenantsDialog />}
            {canEdit && <MergeTenantsDialog />}
            {canCreate && <AddTenantDialog />}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un locataire..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Assigned Filter - Only for agency owner/admin */}
          {isAgencyOwner && assignableUsers.length > 1 && (
            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Gestionnaire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les gestionnaires</SelectItem>
                <SelectItem value="unassigned">
                  <span className="text-muted-foreground">Non assignés</span>
                </SelectItem>
                {assignableUsers.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-3 w-3" />
                      {user.full_name || user.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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


        {/* Tenant List */}
        {!isLoading && !error && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Liste des locataires ({filteredTenants.length})
            </h2>
            <div className="grid gap-3 sm:gap-4">
              {filteredTenants.map((tenant) => (
                <TenantCard 
                  key={tenant.id}
                  tenant={tenant} 
                  onEdit={handleEditTenant}
                  onView={handleViewTenant}
                  onDelete={handleDeleteTenant}
                  canEdit={canEdit}
                  isDeleting={deleteTenantMutation.isPending}
                />
              ))}
            </div>
            {filteredTenants.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {tenants?.length === 0 
                      ? "Aucun locataire enregistré. Ajoutez votre premier locataire !"
                      : "Aucun locataire trouvé."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Edit Tenant Dialog */}
        <EditTenantDialog
          tenant={editingTenant}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />

      </div>
    </DashboardLayout>
  );
}
