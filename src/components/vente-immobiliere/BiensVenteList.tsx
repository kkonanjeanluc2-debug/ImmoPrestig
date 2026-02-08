import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBiensVente, useDeleteBienVente, type BienVente } from "@/hooks/useBiensVente";
import { SellBienDialog } from "./SellBienDialog";
import { ReserveBienDialog } from "./ReserveBienDialog";
import { formatCurrency } from "@/lib/pdfFormat";
import { toast } from "sonner";
import {
  Building2,
  Search,
  MoreVertical,
  Eye,
  HandCoins,
  Trash2,
  MapPin,
  Bed,
  Bath,
  Ruler,
  Bookmark,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfiles } from "@/hooks/useAssignedUserProfile";
import { useIsAgencyOwner } from "@/hooks/useAssignableUsers";

const STATUS_CONFIG = {
  disponible: { label: "Disponible", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  reserve: { label: "Réservé", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  vendu: { label: "Vendu", color: "bg-primary/10 text-primary border-primary/30" },
};

export function BiensVenteList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedBien, setSelectedBien] = useState<BienVente | null>(null);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);

  const { data: biens, isLoading } = useBiensVente();
  const deleteBien = useDeleteBienVente();
  const navigate = useNavigate();
  const { hasPermission, role } = usePermissions();
  const { isAdmin } = useIsAgencyOwner();
  const canDelete = hasPermission("can_delete_ventes");
  const canEdit = hasPermission("can_edit_biens_vente");

  // Get all assigned_to user ids for profile lookup
  const assignedUserIds = biens?.map(b => b.assigned_to).filter(Boolean) || [];
  const { data: profilesMap } = useUserProfiles(assignedUserIds);

  const filteredBiens = biens?.filter((bien) => {
    const matchesSearch =
      bien.title.toLowerCase().includes(search.toLowerCase()) ||
      bien.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || bien.status === statusFilter;
    const matchesType = typeFilter === "all" || bien.property_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleDelete = async (bien: BienVente) => {
    try {
      await deleteBien.mutateAsync({ id: bien.id, title: bien.title });
      toast.success("Bien déplacé vers la corbeille");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSell = (bien: BienVente) => {
    setSelectedBien(bien);
    setSellDialogOpen(true);
  };

  const handleReserve = (bien: BienVente) => {
    setSelectedBien(bien);
    setReserveDialogOpen(true);
  };

  const propertyTypes = [...new Set(biens?.map((b) => b.property_type))];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-muted rounded-t-lg" />
            <CardContent className="p-4 space-y-3">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un bien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="disponible">Disponible</SelectItem>
            <SelectItem value="reserve">Réservé</SelectItem>
            <SelectItem value="vendu">Vendu</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {propertyTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filteredBiens?.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun bien trouvé</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBiens?.map((bien) => {
            const statusConfig = STATUS_CONFIG[bien.status];
            return (
              <Card 
                key={bien.id} 
                className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/ventes-immobilieres/${bien.id}`)}
              >
                <div className="relative h-48 bg-muted">
                  {bien.image_url ? (
                    <img
                      src={bien.image_url}
                      alt={bien.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}
                  <Badge
                    variant="outline"
                    className={`absolute top-2 right-2 ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{bien.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {bien.address}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/ventes-immobilieres/${bien.id}`);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir détails
                        </DropdownMenuItem>
                        {bien.status === "disponible" && canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleReserve(bien);
                            }}>
                              <Bookmark className="h-4 w-4 mr-2" />
                              Réserver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleSell(bien);
                            }}>
                              <HandCoins className="h-4 w-4 mr-2" />
                              Vendre
                            </DropdownMenuItem>
                          </>
                        )}
                        {bien.status === "reserve" && canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleSell(bien);
                            }}>
                              <HandCoins className="h-4 w-4 mr-2" />
                              Finaliser la vente
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(bien);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    {bien.bedrooms && (
                      <span className="flex items-center gap-1">
                        <Bed className="h-3.5 w-3.5" />
                        {bien.bedrooms}
                      </span>
                    )}
                    {bien.bathrooms && (
                      <span className="flex items-center gap-1">
                        <Bath className="h-3.5 w-3.5" />
                        {bien.bathrooms}
                      </span>
                    )}
                    {bien.area && (
                      <span className="flex items-center gap-1">
                        <Ruler className="h-3.5 w-3.5" />
                        {bien.area} m²
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(bien.price)}
                    </span>
                    <div className="flex items-center gap-2">
                      {isAdmin && bien.assigned_to && profilesMap?.get(bien.assigned_to) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs gap-1">
                                <User className="h-3 w-3" />
                                <span className="truncate max-w-[60px]">
                                  {profilesMap.get(bien.assigned_to)}
                                </span>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Gestionnaire: {profilesMap.get(bien.assigned_to)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Badge variant="secondary">
                        {bien.property_type.charAt(0).toUpperCase() + bien.property_type.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedBien && (
        <SellBienDialog
          bien={selectedBien}
          open={sellDialogOpen}
          onOpenChange={setSellDialogOpen}
        />
      )}

      {selectedBien && (
        <ReserveBienDialog
          bien={selectedBien}
          open={reserveDialogOpen}
          onOpenChange={setReserveDialogOpen}
        />
      )}
    </div>
  );
}
