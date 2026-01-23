import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTenants, TenantWithDetails } from "@/hooks/useTenants";
import { AddTenantDialog } from "@/components/tenant/AddTenantDialog";
import { ImportTenantsDialog } from "@/components/tenant/ImportTenantsDialog";
import { MergeTenantsDialog } from "@/components/tenant/MergeTenantsDialog";
import { EditTenantDialog } from "@/components/tenant/EditTenantDialog";
import { EmailHistoryDialog } from "@/components/tenant/EmailHistoryDialog";
import { usePermissions } from "@/hooks/usePermissions";

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
  canEdit: boolean;
}

function TenantCard({ tenant, onEdit, canEdit }: TenantCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Get active contract
  const activeContract = tenant.contracts?.find(c => c.status === 'active') || tenant.contracts?.[0];
  const contractStatus = activeContract?.status as keyof typeof contractStatusConfig || 'expired';
  const statusConfig = contractStatusConfig[contractStatus] || contractStatusConfig.expired;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Avatar */}
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-lg sm:text-xl font-semibold text-muted-foreground">
                {tenant.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <h3 className="font-semibold text-foreground truncate">{tenant.name}</h3>
                <Badge variant="outline" className={cn("w-fit", statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Contact */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground mb-3">
                <a href={`mailto:${tenant.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors truncate">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{tenant.email}</span>
                </a>
                {tenant.phone && (
                  <a href={`tel:${tenant.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{tenant.phone}</span>
                  </a>
                )}
              </div>

              {/* Property */}
              {tenant.property && (
                <div className="flex items-start gap-1.5 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">{tenant.property.title}</p>
                    <p className="text-muted-foreground text-xs">{tenant.property.address}</p>
                  </div>
                </div>
              )}

              {/* Email History Button */}
              <div className="mt-3 flex items-center gap-2">
                <EmailHistoryDialog tenantId={tenant.id} tenantName={tenant.name} />
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(tenant)}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                )}
              </div>
            </div>

            {/* Rent Amount */}
            {activeContract && (
              <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                <span className="text-xl sm:text-2xl font-bold text-foreground">
                  {Number(activeContract.rent_amount).toLocaleString('fr-FR')} <span className="text-sm font-normal">F CFA</span>
                </span>
                <span className="text-xs text-muted-foreground">/mois</span>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTenant, setEditingTenant] = useState<TenantWithDetails | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { data: tenants, isLoading, error } = useTenants();
  const { canCreate, canEdit } = usePermissions();

  const handleEditTenant = (tenant: TenantWithDetails) => {
    setEditingTenant(tenant);
    setEditDialogOpen(true);
  };

  const filteredTenants = (tenants || []).filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.property?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="pt-8 sm:pt-0">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Locataires
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gérez vos locataires, contrats et paiements
            </p>
          </div>
          <div className="flex gap-2">
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
            {canCreate && <ImportTenantsDialog />}
            {canEdit && <MergeTenantsDialog />}
            {canCreate && <AddTenantDialog />}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un locataire..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-muted", stat.color)}>
                    <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-lg sm:text-2xl font-bold text-foreground">{stat.value}</p>
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
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Liste des locataires ({filteredTenants.length})
            </h2>
            <div className="grid gap-4">
              {filteredTenants.map((tenant) => (
                <TenantCard 
                  key={tenant.id} 
                  tenant={tenant} 
                  onEdit={handleEditTenant}
                  canEdit={canEdit}
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
