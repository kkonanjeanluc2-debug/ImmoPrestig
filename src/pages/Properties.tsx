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
import { Search, Grid3X3, List, Loader2 } from "lucide-react";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useProperties, useDeleteProperty, Property } from "@/hooks/useProperties";
import { AddPropertyDialog } from "@/components/property/AddPropertyDialog";
import { EditPropertyDialog } from "@/components/property/EditPropertyDialog";
import { usePermissions } from "@/hooks/usePermissions";
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const { canCreate, canEdit, canDelete } = usePermissions();
  
  const { data: properties, isLoading, error } = useProperties();
  const deleteProperty = useDeleteProperty();

  const filteredProperties = (properties || []).filter((property) => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || property.property_type === typeFilter;
    const matchesStatus = statusFilter === "all" || property.status === statusFilter;
    const matchesTransaction = transactionFilter === "all" || property.type === transactionFilter;
    return matchesSearch && matchesType && matchesStatus && matchesTransaction;
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
            <h1 className="text-3xl font-display font-bold text-foreground">
              Biens immobiliers
            </h1>
            <p className="text-muted-foreground mt-1">
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
                { key: 'property_type', label: 'Type', format: (v) => v === 'maison' ? 'Maison' : v === 'appartement' ? 'Appartement' : 'Terrain' },
                { key: 'type', label: 'Mode', format: (v) => v === 'location' ? 'Location' : 'Vente' },
                { key: 'price', label: 'Prix (F CFA)', format: (v) => Number(v).toString() },
                { key: 'area', label: 'Surface (m²)', format: (v) => v ? Number(v).toString() : '' },
                { key: 'bedrooms', label: 'Chambres', format: (v) => v ? v.toString() : '' },
                { key: 'bathrooms', label: 'Salles de bain', format: (v) => v ? v.toString() : '' },
                { key: 'status', label: 'Statut', format: (v) => v === 'disponible' ? 'Disponible' : v === 'occupé' ? 'Occupé' : 'En attente' },
              ]}
            />
            {canCreate && <AddPropertyDialog />}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 p-4 bg-card rounded-xl border border-border/50 shadow-card">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom ou adresse..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={transactionFilter} onValueChange={setTransactionFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Transaction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="vente">Vente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type de bien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="maison">Maison</SelectItem>
                <SelectItem value="appartement">Appartement</SelectItem>
                <SelectItem value="terrain">Terrain</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="occupé">Occupé</SelectItem>
                <SelectItem value="en attente">En attente</SelectItem>
              </SelectContent>
            </Select>
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredProperties.length} bien{filteredProperties.length > 1 ? "s" : ""} trouvé{filteredProperties.length > 1 ? "s" : ""}
          </p>
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
            <p className="text-destructive">Erreur lors du chargement des biens.</p>
          </div>
        )}

        {/* Properties Grid */}
        {!isLoading && !error && (
          <div className={cn(
            "grid gap-6",
            viewMode === "grid" 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              : "grid-cols-1"
          )}>
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
                />
              </div>
            ))}
          </div>
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
