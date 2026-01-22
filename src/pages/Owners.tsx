import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Building2, 
  MapPin,
  MoreVertical,
  Loader2,
  Users
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useOwners, useDeleteOwner } from "@/hooks/useOwners";
import { useProperties } from "@/hooks/useProperties";
import { toast } from "sonner";

const Owners = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: owners, isLoading, error } = useOwners();
  const { data: properties } = useProperties();
  const deleteOwner = useDeleteOwner();

  const filteredOwners = (owners || []).filter(owner =>
    owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    owner.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute stats
  const totalOwners = owners?.length || 0;
  const activeOwners = owners?.filter(o => o.status === "actif").length || 0;
  const totalProperties = properties?.length || 0;

  const handleDelete = async (id: string) => {
    try {
      await deleteOwner.mutateAsync(id);
      toast.success("Propriétaire supprimé avec succès");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Propriétaires
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Gérez vos propriétaires et leurs biens
            </p>
          </div>
          <Button className="bg-emerald hover:bg-emerald-dark text-primary-foreground gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Ajouter un propriétaire
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un propriétaire..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Total propriétaires</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{totalOwners}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Actifs</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald mt-1">{activeOwners}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Total biens</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{totalProperties}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Revenus mensuels</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">0 F CFA</p>
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
          <div className="grid gap-4">
            {filteredOwners.map((owner) => (
              <Card key={owner.id} className="overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Owner Info */}
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-foreground font-semibold text-sm sm:text-base">
                          {owner.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm sm:text-base">{owner.name}</h3>
                          <Badge 
                            variant={owner.status === "actif" ? "default" : "secondary"}
                            className={owner.status === "actif" ? "bg-emerald text-primary-foreground" : ""}
                          >
                            {owner.status}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                            <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{owner.email}</span>
                          </p>
                          {owner.phone && (
                            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                              <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span>{owner.phone}</span>
                            </p>
                          )}
                          {owner.address && (
                            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="truncate">{owner.address}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                      <div className="text-center">
                        <p className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          0
                        </p>
                        <p className="text-xs text-muted-foreground">Biens</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg sm:text-xl font-bold text-emerald">
                          0 F CFA
                        </p>
                        <p className="text-xs text-muted-foreground">Revenus/mois</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border border-border z-50">
                          <DropdownMenuItem>Voir les détails</DropdownMenuItem>
                          <DropdownMenuItem>Modifier</DropdownMenuItem>
                          <DropdownMenuItem>Voir les biens</DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(owner.id)}
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Owners;
