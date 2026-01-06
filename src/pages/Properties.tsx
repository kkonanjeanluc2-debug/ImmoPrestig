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
import { Plus, Search, Filter, Grid3X3, List } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const allProperties = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    title: "Villa Belle Époque",
    address: "16 Avenue Foch, Paris 16ème",
    price: 3500,
    type: "location" as const,
    propertyType: "maison" as const,
    bedrooms: 5,
    bathrooms: 3,
    area: 280,
    status: "disponible" as const,
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    title: "Appartement Haussmannien",
    address: "42 Boulevard Saint-Germain, Paris 5ème",
    price: 1850,
    type: "location" as const,
    propertyType: "appartement" as const,
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    status: "occupé" as const,
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    title: "Loft Design Bastille",
    address: "8 Rue de la Roquette, Paris 11ème",
    price: 2200,
    type: "location" as const,
    propertyType: "appartement" as const,
    bedrooms: 2,
    bathrooms: 1,
    area: 95,
    status: "en attente" as const,
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
    title: "Terrain Constructible",
    address: "Chemin des Vignes, Fontainebleau",
    price: 185000,
    type: "vente" as const,
    propertyType: "terrain" as const,
    area: 1200,
    status: "disponible" as const,
  },
  {
    id: "5",
    image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
    title: "Studio Moderne",
    address: "25 Rue du Temple, Paris 3ème",
    price: 950,
    type: "location" as const,
    propertyType: "appartement" as const,
    bedrooms: 1,
    bathrooms: 1,
    area: 35,
    status: "occupé" as const,
  },
  {
    id: "6",
    image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80",
    title: "Maison de Maître",
    address: "12 Rue Victor Hugo, Versailles",
    price: 4200,
    type: "location" as const,
    propertyType: "maison" as const,
    bedrooms: 6,
    bathrooms: 4,
    area: 350,
    status: "disponible" as const,
  },
];

const Properties = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredProperties = allProperties.filter((property) => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || property.propertyType === typeFilter;
    const matchesStatus = statusFilter === "all" || property.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

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
          <Button className="bg-emerald hover:bg-emerald-dark text-primary-foreground gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un bien
          </Button>
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
          <div className="flex gap-3">
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

        {/* Properties Grid */}
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
              <PropertyCard {...property} />
            </div>
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Aucun bien ne correspond à vos critères de recherche.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Properties;
