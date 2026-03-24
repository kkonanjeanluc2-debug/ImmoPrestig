import { useState } from "react";
import { Card } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
  Bookmark,
  Pencil,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfiles } from "@/hooks/useAssignedUserProfile";
import { useIsAgencyOwner } from "@/hooks/useAssignableUsers";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  disponible: { label: "Disponible", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  reserve: { label: "Réservé", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  vendu: { label: "Vendu", color: "bg-primary/10 text-primary border-primary/30" },
};

const TYPE_COLORS: Record<string, string> = {
  appartement: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  villa: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  terrain: "bg-green-500/10 text-green-600 border-green-500/30",
  bureau: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  maison: "bg-teal-500/10 text-teal-600 border-teal-500/30",
  studio: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
  immeuble: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  duplex: "bg-pink-500/10 text-pink-600 border-pink-500/30",
};

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    appartement: "Appart.",
    villa: "Villa",
    terrain: "Terrain",
    bureau: "Bureau",
    maison: "Maison",
    studio: "Studio",
    immeuble: "Immeuble",
    duplex: "Duplex",
  };
  return map[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

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
  const { hasPermission } = usePermissions();
  const { isAdmin } = useIsAgencyOwner();
  const canDelete = hasPermission("can_delete_ventes");
  const canEdit = hasPermission("can_edit_biens_vente");

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
      <Card>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
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

      {/* Table */}
      {filteredBiens?.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun bien trouvé</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bien</TableHead>
                  {isAdmin && <TableHead>Gestionnaire</TableHead>}
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBiens?.map((bien) => {
                  const statusConfig = STATUS_CONFIG[bien.status] || STATUS_CONFIG.disponible;
                  const typeColor = TYPE_COLORS[bien.property_type] || "bg-muted text-muted-foreground";

                  return (
                    <TableRow
                      key={bien.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/ventes-immobilieres/${bien.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{bien.title}</p>
                          <p className="text-sm text-muted-foreground">{bien.address}</p>
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <span className="text-sm">
                            {bien.assigned_to && profilesMap?.get(bien.assigned_to)
                              ? profilesMap.get(bien.assigned_to)
                              : "-"}
                          </span>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className={typeColor}>
                          {getTypeLabel(bien.property_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(bien.price)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/ventes-immobilieres/${bien.id}`)}
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/ventes-immobilieres/${bien.id}`)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              {bien.status === "disponible" && canEdit && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleReserve(bien)}>
                                    <Bookmark className="h-4 w-4 mr-2" />
                                    Réserver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSell(bien)}>
                                    <HandCoins className="h-4 w-4 mr-2" />
                                    Vendre
                                  </DropdownMenuItem>
                                </>
                              )}
                              {bien.status === "reserve" && canEdit && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleSell(bien)}>
                                    <HandCoins className="h-4 w-4 mr-2" />
                                    Finaliser la vente
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDelete(bien)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
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
