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
  MoreVertical,
  Loader2,
  Users,
  Pencil,
  ChevronDown,
  ChevronUp,
  Eye
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
  const deleteOwner = useDeleteOwner();
  const { hasPermission } = usePermissions();
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

  // Calculate monthly revenue per owner (from location properties)
  const getOwnerRevenue = (ownerId: string) => {
    const ownerProperties = propertiesByOwner[ownerId] || [];
    return ownerProperties
      .filter(p => p.type === "location")
      .reduce((sum, p) => sum + (p.price || 0), 0);
  };

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
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Revenus mensuels</p>
              <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">0 F</p>
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

        {/* Owners List */}
        {!isLoading && !error && filteredOwners.length > 0 && (
          <div className="grid gap-3 sm:gap-4">
            {filteredOwners.map((owner) => {
              const ownerProperties = propertiesByOwner[owner.id] || [];
              const propertyCount = ownerProperties.length;
              const monthlyRevenue = getOwnerRevenue(owner.id);
              const isExpanded = expandedOwners.has(owner.id);

              return (
                <Collapsible key={owner.id} open={isExpanded} onOpenChange={() => toggleExpanded(owner.id)}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4 md:p-6">
                      <div className="flex flex-col gap-3">
                        {/* Owner Info - Clickable */}
                        <div 
                          className="flex items-start gap-3 cursor-pointer group"
                          onClick={() => navigate(`/owners/${owner.id}`)}
                        >
                          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-navy flex items-center justify-center flex-shrink-0 group-hover:ring-2 group-hover:ring-primary/20 transition-all">
                            <span className="text-primary-foreground font-semibold text-xs sm:text-sm">
                              {owner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors truncate max-w-[150px] sm:max-w-none">{owner.name}</h3>
                              <Badge 
                                variant={owner.status === "actif" ? "default" : "secondary"}
                                className={`text-[10px] sm:text-xs ${owner.status === "actif" ? "bg-emerald text-primary-foreground" : ""}`}
                              >
                                {owner.status}
                              </Badge>
                            </div>
                            <div className="mt-1.5 space-y-0.5">
                              <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{owner.email}</span>
                              </p>
                              {owner.phone && (
                                <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span>{owner.phone}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stats & Actions */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                          <CollapsibleTrigger asChild>
                            <button className="text-center hover:bg-muted p-1.5 sm:p-2 rounded-lg transition-colors">
                              <p className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                {propertyCount}
                                {propertyCount > 0 && (
                                  isExpanded 
                                    ? <ChevronUp className="h-3 w-3" />
                                    : <ChevronDown className="h-3 w-3" />
                                )}
                              </p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Bien{propertyCount > 1 ? "s" : ""}</p>
                            </button>
                          </CollapsibleTrigger>
                          <div className="text-center">
                            <p className="text-sm sm:text-base font-bold text-emerald">
                              {monthlyRevenue.toLocaleString('fr-FR')} F
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Revenus/mois</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border border-border z-50">
                              <DropdownMenuItem onClick={() => navigate(`/owners/${owner.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir les détails
                              </DropdownMenuItem>
                              {canEdit && (
                                <DropdownMenuItem onClick={() => handleEdit(owner)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                              )}
                              {propertyCount > 0 && (
                                <DropdownMenuItem onClick={() => toggleExpanded(owner.id)}>
                                  <Building2 className="h-4 w-4 mr-2" />
                                  {isExpanded ? "Masquer les biens" : "Voir les biens"}
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDelete(owner.id, owner.name)}
                                >
                                  Supprimer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Properties List (Collapsible) */}
                      <CollapsibleContent>
                        {propertyCount > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-2">
                              Biens de {owner.name}
                            </p>
                            <OwnerPropertiesList properties={ownerProperties} maxDisplay={5} />
                          </div>
                        )}
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              );
            })}
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
