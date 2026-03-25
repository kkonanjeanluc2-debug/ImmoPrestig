import React from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PropertyCard } from "@/components/dashboard/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Grid3X3, List, Loader2, User, UserCheck, DoorOpen, Pencil, Eye, ChevronDown, ChevronRight, Users, Navigation } from "lucide-react";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useProperties, useDeleteProperty, Property } from "@/hooks/useProperties";
import { useOwners } from "@/hooks/useOwners";
import { AddPropertyDialog } from "@/components/property/AddPropertyDialog";
import { EditPropertyDialog } from "@/components/property/EditPropertyDialog";
import { PropertyTrashDialog } from "@/components/property/PropertyTrashDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useAssignableUsers, useIsAgencyOwner } from "@/hooks/useAssignableUsers";
import { usePropertyUnitsSummary } from "@/hooks/usePropertyUnitsSummary";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { usePropertyTenants, usePropertyTenantsAll } from "@/hooks/usePropertyTenants";
import { usePropertyUnits, PropertyUnit } from "@/hooks/usePropertyUnits";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Properties = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);
  const { hasPermission, role, isLoading: permLoading } = usePermissions();

  if (!permLoading && role !== "super_admin" && role !== "admin" && !hasPermission("can_view_properties")) {
    return <Navigate to="/dashboard" replace />;
  }

  const canCreate = hasPermission("can_create_properties");
  const canCreate = hasPermission("can_create_properties");
  const canEdit = hasPermission("can_edit_properties");
  const canDelete = hasPermission("can_delete_properties");
  
  const { data: properties, isLoading, error } = useProperties();
  const { data: owners = [] } = useOwners();
  const { data: assignableUsers = [] } = useAssignableUsers();
  const { isOwner: isAgencyOwner } = useIsAgencyOwner();
  const deleteProperty = useDeleteProperty();
  const { data: unitsSummary = {} } = usePropertyUnitsSummary();
  const { user } = useAuth();
  const { data: userRole } = useCurrentUserRole();
  const { data: propertyTenantsMap = {} } = usePropertyTenants();
  const { data: propertyTenantsAllMap = {} } = usePropertyTenantsAll();
  const navigate = useNavigate();
  const { data: expandedUnits = [], isLoading: unitsLoading } = usePropertyUnits(expandedPropertyId || undefined);

  // Check if user is a gestionnaire (manager) - filter data to show only their assigned items
  const isGestionnaire = userRole?.role === "gestionnaire";

  // Filter properties based on role - gestionnaires only see their assigned properties
  const roleFilteredProperties = useMemo(() => {
    if (!properties) return [];
    if (!isGestionnaire || !user) return properties;
    // For gestionnaire, show only properties assigned to them
    return properties.filter(p => p.assigned_to === user.id);
  }, [properties, isGestionnaire, user]);

  // Only show rental properties (location)
  const rentalProperties = roleFilteredProperties.filter((property) => property.type === "location");
  
  const filteredProperties = rentalProperties.filter((property) => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || property.property_type === typeFilter;
    const matchesStatus = statusFilter === "all" || property.status === statusFilter;
    const matchesOwner = ownerFilter === "all" 
      ? true 
      : ownerFilter === "none" 
        ? !property.owner_id 
        : property.owner_id === ownerFilter;
    const assignedTo = (property as any).assigned_to;
    const matchesAssigned = assignedFilter === "all"
      ? true
      : assignedFilter === "unassigned"
        ? !assignedTo
        : assignedTo === assignedFilter;
    
    // Filter by unit availability
    const summary = unitsSummary[property.id];
    const hasUnits = summary && summary.total_units > 0;
    const matchesAvailability = availabilityFilter === "all"
      ? true
      : availabilityFilter === "with_available"
        ? hasUnits && summary.available_units > 0
        : availabilityFilter === "fully_occupied"
          ? hasUnits && summary.available_units === 0
          : availabilityFilter === "no_units"
            ? !hasUnits
            : true;
    
    return matchesSearch && matchesType && matchesStatus && matchesOwner && matchesAssigned && matchesAvailability;
  });

  const handleDelete = async () => {
    if (!deletingProperty) return;
    try {
      await deleteProperty.mutateAsync({ id: deletingProperty.id, title: deletingProperty.title });
      toast.success("Bien supprimé avec succès");
      setDeletingProperty(null);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground">
              Biens immobiliers
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gérez l'ensemble de votre patrimoine immobilier
            </p>
          </div>
          <div className="flex gap-2">
            <ExportDropdown
              data={properties || []}
              filename="biens"
              columns={[
                { key: 'title', label: 'Titre' },
                { key: 'address', label: 'Adresse' },
                { key: 'property_type', label: 'Type', format: (v) => ({ maison: 'Maison', appartement: 'Appartement', villa: 'Villa', bureau: 'Bureau', commerce: 'Commerce', immeuble: 'Immeuble', meuble: 'Location meublée' }[v as string] || v) },
                { key: 'type', label: 'Mode', format: (v) => v === 'location' ? 'Location' : 'Vente' },
                { key: 'price', label: 'Prix (F CFA)', format: (v) => Number(v).toString() },
                { key: 'area', label: 'Surface (m²)', format: (v) => v ? Number(v).toString() : '' },
                { key: 'bedrooms', label: 'Chambres', format: (v) => v ? v.toString() : '' },
                { key: 'bathrooms', label: 'Salles de bain', format: (v) => v ? v.toString() : '' },
                { key: 'status', label: 'Statut', format: (v) => v === 'disponible' ? 'Disponible' : v === 'loué' ? 'Loué' : v === 'vendu' ? 'Vendu' : 'En attente' },
              ]}
            />
            <PropertyTrashDialog />
            {canCreate && <AddPropertyDialog />}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 p-3 sm:p-4 bg-card rounded-xl border border-border/50 shadow-card">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher..." 
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px] sm:w-[160px]">
                <SelectValue placeholder="Type de bien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="appartement">Appartement</SelectItem>
                <SelectItem value="maison">Maison à porte multiple</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="bureau">Bureau</SelectItem>
                <SelectItem value="commerce">Commerce</SelectItem>
                <SelectItem value="immeuble">Immeuble</SelectItem>
                <SelectItem value="meuble">Location meublée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] sm:w-[160px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="loué">Loué</SelectItem>
                <SelectItem value="en attente">En attente</SelectItem>
              </SelectContent>
            </Select>
            {/* Additional filters hidden on mobile */}
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-[140px] sm:w-[180px] hidden md:flex">
                <SelectValue placeholder="Propriétaire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les propriétaires</SelectItem>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Sans propriétaire</span>
                </SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {owner.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Availability Filter - hidden on mobile */}
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="w-[140px] sm:w-[180px] hidden lg:flex">
                <SelectValue placeholder="Disponibilité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes disponibilités</SelectItem>
                <SelectItem value="with_available">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="h-3 w-3 text-green-600" />
                    Portes disponibles
                  </div>
                </SelectItem>
                <SelectItem value="fully_occupied">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="h-3 w-3 text-orange-600" />
                    Complet (0 porte)
                  </div>
                </SelectItem>
                <SelectItem value="no_units">
                  <span className="text-muted-foreground">Sans unités</span>
                </SelectItem>
              </SelectContent>
            </Select>
            {/* Assigned Filter - Only for agency owner/admin, hidden on small screens */}
            {isAgencyOwner && (
              <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                <SelectTrigger className="w-[140px] sm:w-[180px] hidden lg:flex">
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
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-none",
                  viewMode === "grid" && "bg-muted"
                )}
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-none",
                  viewMode === "list" && "bg-muted"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground">
          {filteredProperties.length} bien{filteredProperties.length > 1 ? "s" : ""} trouvé{filteredProperties.length > 1 ? "s" : ""}
        </p>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Erreur lors du chargement des biens.</p>
          </div>
        )}

        {/* Properties Grid/Table */}
        {!isLoading && !error && filteredProperties.length > 0 && (
          viewMode === "grid" ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredProperties.map((property, index) => (
                <div 
                  key={property.id} 
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="animate-fade-in"
                >
                  <PropertyCard 
                    property={property}
                    onEdit={setEditingProperty}
                    onDelete={setDeletingProperty}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    unitsSummary={unitsSummary[property.id]}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bien</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Propriétaire</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Loyer</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Statut</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Locataire</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProperties.map((property) => {
                      const ownerName = owners.find(o => o.id === property.owner_id)?.name;
                      const tenantName = propertyTenantsMap[property.id];
                      const summary = unitsSummary[property.id];
                      const hasUnits = summary && summary.total_units > 0;
                      const displayPrice = hasUnits ? summary.total_rent : property.price;

                      const typeLabels: Record<string, string> = {
                        appartement: "Appart.",
                        maison: "Maison à porte multiple",
                        villa: "Villa",
                        bureau: "Bureau",
                        commerce: "Commerce",
                        immeuble: "Immeuble",
                        meuble: "Meublé",
                        terrain: "Terrain",
                        studio: "Studio",
                      };

                      const typeBadgeColors: Record<string, string> = {
                        appartement: "bg-blue-100 text-blue-700 border-blue-200",
                        maison: "bg-emerald-100 text-emerald-700 border-emerald-200",
                        villa: "bg-purple-100 text-purple-700 border-purple-200",
                        bureau: "bg-orange-100 text-orange-700 border-orange-200",
                        commerce: "bg-pink-100 text-pink-700 border-pink-200",
                        immeuble: "bg-indigo-100 text-indigo-700 border-indigo-200",
                        meuble: "bg-teal-100 text-teal-700 border-teal-200",
                        terrain: "bg-amber-100 text-amber-700 border-amber-200",
                        studio: "bg-cyan-100 text-cyan-700 border-cyan-200",
                      };

                      const statusConfig: Record<string, { label: string; className: string }> = {
                        disponible: { label: "Disponible", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
                        loué: { label: "Loué", className: "bg-destructive/10 text-destructive border-destructive/20" },
                        partiellement_loué: { label: "Partiellement loué", className: "bg-blue-100 text-blue-700 border-blue-200" },
                        "en attente": { label: "En attente", className: "bg-amber-100 text-amber-700 border-amber-200" },
                        vendu: { label: "Vendu", className: "bg-muted text-muted-foreground border-muted-foreground/20" },
                      };

                      // For multi-unit properties, derive status from units
                      let effectiveStatus = property.status;
                      if ((property.property_type === "maison" || property.property_type === "immeuble") && hasUnits) {
                        if (summary.available_units === summary.total_units) {
                          effectiveStatus = "disponible";
                        } else if (summary.available_units === 0) {
                          effectiveStatus = "loué";
                        } else {
                          effectiveStatus = "partiellement_loué";
                        }
                      }

                      const statusInfo = statusConfig[effectiveStatus] || { label: effectiveStatus, className: "" };

                      const isMultiUnit = (property.property_type === "maison" || property.property_type === "immeuble") && hasUnits;
                      const isExpanded = expandedPropertyId === property.id;

                      const handleRowClick = () => {
                        if (isMultiUnit) {
                          setExpandedPropertyId(isExpanded ? null : property.id);
                        } else {
                          navigate(`/properties/${property.id}`);
                        }
                      };

                      // Get unit type label from rooms_count
                      const getUnitTypeLabel = (unit: PropertyUnit) => {
                        if (unit.rooms_count <= 1) return "Studio";
                        return `${unit.rooms_count}P`;
                      };
                      const getUnitTypeBadgeColor = (unit: PropertyUnit) => {
                        if (unit.rooms_count <= 1) return "bg-cyan-100 text-cyan-700 border-cyan-200";
                        if (unit.rooms_count === 2) return "bg-blue-100 text-blue-700 border-blue-200";
                        if (unit.rooms_count === 3) return "bg-purple-100 text-purple-700 border-purple-200";
                        return "bg-orange-100 text-orange-700 border-orange-200";
                      };

                      // Find tenant for a specific unit
                      const getUnitTenant = (unit: PropertyUnit) => {
                        const allTenants = propertyTenantsAllMap[property.id] || [];
                        return allTenants.find((t: any) => 
                          (t.unit_id && t.unit_id === unit.id) || 
                          (t.unit && t.unit === unit.unit_number)
                        );
                      };

                      return (
                        <React.Fragment key={property.id}>
                          <tr 
                            className={cn(
                              "border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer",
                              isExpanded && "bg-muted/30"
                            )}
                            onClick={handleRowClick}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 max-w-[220px]">
                                {isMultiUnit && (
                                  <span className="text-muted-foreground shrink-0">
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </span>
                                )}
                                <div>
                                  <p className="font-medium text-foreground break-words">{property.title}</p>
                                  <p className="text-xs text-muted-foreground break-words">{property.address}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {ownerName || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className={cn("text-xs w-fit", typeBadgeColors[property.property_type] || "")}>
                                  {typeLabels[property.property_type] || property.property_type}
                                </Badge>
                                {isMultiUnit && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <DoorOpen className="h-3 w-3" />
                                    {summary.available_units}/{summary.total_units} disponible{summary.available_units > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">
                              {displayPrice.toLocaleString("fr-FR")} FCFA
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="outline" className={cn("text-xs", statusInfo.className)}>
                                {statusInfo.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {isMultiUnit ? (
                                (() => {
                                  const allTenants = propertyTenantsAllMap[property.id] || [];
                                  if (allTenants.length === 0) return <span className="text-muted-foreground">-</span>;
                                  return (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-auto py-1 px-2 text-foreground gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                          {allTenants.length} locataire{allTenants.length > 1 ? "s" : ""}
                                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-56 p-2" align="start">
                                        <div className="space-y-1">
                                          {allTenants.map((t, idx) => (
                                            <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted">
                                              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                              <div className="min-w-0">
                                                <p className="font-medium truncate">{t.name}</p>
                                                {t.unit && <p className="text-xs text-muted-foreground">Porte: {t.unit}</p>}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  );
                                })()
                              ) : tenantName ? (
                                <div className="flex items-center gap-1.5 text-foreground">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  {tenantName}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {property.latitude && property.longitude && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    title="Suivre l'itinéraire"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(
                                        `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`,
                                        "_blank"
                                      );
                                    }}
                                  >
                                    <Navigation className="h-4 w-4" />
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingProperty(property);
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
                                    navigate(`/properties/${property.id}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {/* Expandable units sub-table */}
                          {isExpanded && isMultiUnit && (
                            <tr>
                              <td colSpan={7} className="p-0">
                                <div className="bg-muted/20 border-b border-border/50">
                                  {unitsLoading ? (
                                    <div className="flex items-center justify-center py-6">
                                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                  ) : (
                                    <table className="w-full">
                                      <thead>
                                        <tr className="border-b border-border/30">
                                          <th className="text-left px-6 py-2.5 font-medium text-primary text-sm">Unité</th>
                                          <th className="text-left px-4 py-2.5 font-medium text-primary text-sm">Type</th>
                                          <th className="text-right px-4 py-2.5 font-medium text-primary text-sm">Loyer</th>
                                          <th className="text-center px-4 py-2.5 font-medium text-primary text-sm">Statut</th>
                                          <th className="text-left px-4 py-2.5 font-medium text-primary text-sm">Locataire</th>
                                          <th className="text-right px-6 py-2.5 font-medium text-primary text-sm">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {expandedUnits.map((unit) => {
                                          const unitTenant = getUnitTenant(unit);
                                          const unitStatusConfig: Record<string, { label: string; className: string }> = {
                                            disponible: { label: "Disponible", className: "bg-primary/10 text-primary border-primary/30" },
                                            "loué": { label: "Loué", className: "bg-destructive/10 text-destructive border-destructive/20" },
                                          };
                                          const unitStatus = unitStatusConfig[unit.status] || { label: unit.status, className: "" };

                                          return (
                                            <tr key={unit.id} className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors">
                                              <td className="px-6 py-3">
                                                <span className="font-medium text-foreground">{unit.unit_number}</span>
                                              </td>
                                              <td className="px-4 py-3">
                                                <Badge variant="outline" className={cn("text-xs", getUnitTypeBadgeColor(unit))}>
                                                  {getUnitTypeLabel(unit)}
                                                </Badge>
                                              </td>
                                              <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">
                                                {unit.rent_amount.toLocaleString("fr-FR")} FCFA
                                              </td>
                                              <td className="px-4 py-3 text-center">
                                                <Badge variant="outline" className={cn("text-xs", unitStatus.className)}>
                                                  {unitStatus.label}
                                                </Badge>
                                              </td>
                                              <td className="px-4 py-3">
                                                {unitTenant ? (
                                                  <span className="text-foreground text-sm">{unitTenant.name}</span>
                                                ) : (
                                                  <span className="text-muted-foreground">-</span>
                                                )}
                                              </td>
                                              <td className="px-6 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                  {canEdit && (
                                                    <Button
                                                      size="icon"
                                                      variant="ghost"
                                                      className="h-8 w-8"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingProperty(property);
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
                                                      navigate(`/properties/${property.id}`);
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
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {!isLoading && !error && filteredProperties.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {properties?.length === 0 
                ? "Aucun bien enregistré. Ajoutez votre premier bien !"
                : "Aucun bien ne correspond à vos critères de recherche."}
            </p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingProperty && (
        <EditPropertyDialog
          property={editingProperty}
          open={!!editingProperty}
          onOpenChange={(open) => !open && setEditingProperty(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProperty} onOpenChange={(open) => !open && setDeletingProperty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bien ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{deletingProperty?.title}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Properties;
