import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Phone, 
  Mail, 
  Building2, 
  MapPin,
  Loader2,
  Users,
  Pencil,
  Eye,
  Banknote
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOwners, useDeleteOwner, Owner } from "@/hooks/useOwners";
import { useProperties, Property } from "@/hooks/useProperties";
import { usePayments } from "@/hooks/usePayments";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { toast } from "sonner";
import { AddOwnerDialog } from "@/components/owner/AddOwnerDialog";
import { EditOwnerDialog } from "@/components/owner/EditOwnerDialog";
import { ImportOwnersDialog } from "@/components/owner/ImportOwnersDialog";
import { MergeOwnersDialog } from "@/components/owner/MergeOwnersDialog";
import { OwnerPropertiesList } from "@/components/owner/OwnerPropertiesList";
import { OwnerTrashDialog } from "@/components/owner/OwnerTrashDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const Owners = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { data: currentUserRole } = useCurrentUserRole();
  const { data: owners, isLoading, error } = useOwners();
  const { data: properties } = useProperties();
  const { data: payments } = usePayments();
  const deleteOwner = useDeleteOwner();
  const { hasPermission, role, isLoading: permLoading } = usePermissions();

  if (!permLoading && role !== "super_admin" && role !== "admin" && !hasPermission("can_view_owners")) {
    return <Navigate to="/dashboard" replace />;
  }

  const canCreate = hasPermission("can_create_owners");
  const canEdit = hasPermission("can_edit_owners");
  const canDelete = hasPermission("can_delete_owners");
  
  const isGestionnaire = currentUserRole?.role === "gestionnaire";

  const filteredOwners = (owners || []).filter(owner =>
    owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    owner.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter properties for gestionnaires - only show assigned properties
  const filteredProperties = isGestionnaire && user
    ? (properties || []).filter(p => p.assigned_to === user.id)
    : (properties || []);

  type OwnerPayment = {
    amount: number;
    paid_amount: number | null;
    paid_date: string | null;
    status: string;
    tenant?: {
      property_id?: string | null;
      property?: {
        id?: string;
        owner_id: string | null;
        assigned_to: string | null;
      } | null;
    } | null;
  };

  // RLS already filters payments by role, no need for client-side filter
  const allPayments = (payments || []) as OwnerPayment[];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Build a map of property_id -> owner_id from our already-loaded properties
  const propertyOwnerMap = (properties || []).reduce((acc, p) => {
    if (p.owner_id) acc[p.id] = p.owner_id;
    return acc;
  }, {} as Record<string, string>);

  const monthlyCollectedByOwner = allPayments
    .filter((payment) => {
      if (!payment.paid_date) return false;
      const paidDate = new Date(payment.paid_date);
      return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
    })
    .reduce((acc, payment) => {
      // Try to get owner_id from nested property, or fallback to our local map
      const ownerId = payment.tenant?.property?.owner_id 
        || (payment.tenant?.property_id ? propertyOwnerMap[payment.tenant.property_id] : null);
      if (!ownerId) return acc;

      const collectedAmount = payment.status === "paid"
        ? Number(payment.amount || 0)
        : Math.min(Number(payment.paid_amount || 0), Number(payment.amount || 0));

      acc[ownerId] = (acc[ownerId] || 0) + collectedAmount;
      return acc;
    }, {} as Record<string, number>);

  // Group properties by owner
  const propertiesByOwner = filteredProperties.reduce((acc, property) => {
    if (property.owner_id) {
      if (!acc[property.owner_id]) {
        acc[property.owner_id] = [];
      }
      acc[property.owner_id].push(property);
    }
    return acc;
  }, {} as Record<string, Property[]>);

  // Compute stats
  const totalOwners = owners?.length || 0;
  const activeOwners = owners?.filter(o => o.status === "actif").length || 0;
  const totalProperties = properties?.length || 0;
  const totalMonthlyCollected = Object.values(monthlyCollectedByOwner).reduce((sum, amount) => sum + amount, 0);

  // Calculate monthly collected revenue per owner
  const getOwnerRevenue = (ownerId: string) => monthlyCollectedByOwner[ownerId] || 0;

  const toggleExpanded = (ownerId: string) => {
    setExpandedOwners(prev => {
      const next = new Set(prev);
      if (next.has(ownerId)) {
        next.delete(ownerId);
      } else {
        next.add(ownerId);
      }
      return next;
    });
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteOwner.mutateAsync({ id, name });
      toast.success("Propriétaire supprimé avec succès");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner);
    setEditDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground">
              Propriétaires
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Gérez vos propriétaires et leurs biens
            </p>
          </div>
          
          {/* Action buttons - scrollable on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap">
            <OwnerTrashDialog />
            {canCreate && <ImportOwnersDialog />}
            {canEdit && <MergeOwnersDialog />}
            {canCreate && <AddOwnerDialog />}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un propriétaire..."
            className="pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total propriétaires</p>
              <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">{totalOwners}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Actifs</p>
              <p className="text-base sm:text-xl font-bold text-emerald mt-0.5">{activeOwners}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total biens</p>
              <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">{totalProperties}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Revenus mensuels encaissés</p>
              <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">{totalMonthlyCollected.toLocaleString('fr-FR')} F</p>
            </CardContent>
          </Card>
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
            <p className="text-destructive">Erreur lors du chargement des propriétaires.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredOwners.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {owners?.length === 0 
                  ? "Aucun propriétaire enregistré. Ajoutez votre premier propriétaire !"
                  : "Aucun propriétaire trouvé."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Owners Table */}
        {!isLoading && !error && filteredOwners.length > 0 && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Propriétaire</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Téléphone</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">E-mail</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      <span className="flex items-center justify-center gap-1"><Building2 className="h-3.5 w-3.5" /> Biens</span>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      <span className="flex items-center justify-end gap-1"><Banknote className="h-3.5 w-3.5" /> Loyers/mois</span>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOwners.map((owner) => {
                    const ownerProperties = propertiesByOwner[owner.id] || [];
                    const propertyCount = ownerProperties.length;
                    const monthlyRevenue = getOwnerRevenue(owner.id);
                    const initials = owner.name.split(' ').map(n => n[0]).join('').slice(0, 2);

                    // Generate a color based on initials
                    const colors = [
                      "bg-amber-500", "bg-emerald-500", "bg-blue-500", "bg-purple-500",
                      "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500",
                    ];
                    const colorIndex = owner.name.charCodeAt(0) % colors.length;

                    return (
                      <tr
                        key={owner.id}
                        className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/owners/${owner.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full ${colors[colorIndex]} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white font-semibold text-xs">{initials}</span>
                            </div>
                            <span className="font-medium text-foreground">{owner.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {owner.phone || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="truncate max-w-[200px] block">{owner.email || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary" className="font-semibold">
                            {propertyCount}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                          {monthlyRevenue.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(owner);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/owners/${owner.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Owner Dialog */}
        <EditOwnerDialog
          owner={editingOwner}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
};

export default Owners;
