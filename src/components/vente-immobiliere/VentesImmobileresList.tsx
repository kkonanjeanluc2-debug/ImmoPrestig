import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVentesImmobilieres, useDeleteVenteImmobiliere } from "@/hooks/useVentesImmobilieres";
import { formatCurrency } from "@/lib/pdfFormat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Search,
  MoreVertical,
  Eye,
  FileText,
  Trash2,
  Receipt,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";

const STATUS_CONFIG = {
  en_cours: { label: "En cours", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  complete: { label: "Complété", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  annule: { label: "Annulé", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function VentesImmobilieresList() {
  const [search, setSearch] = useState("");
  const { data: ventes, isLoading } = useVentesImmobilieres();
  const deleteVente = useDeleteVenteImmobiliere();
  const navigate = useNavigate();
  const { canDelete } = usePermissions();

  const filteredVentes = ventes?.filter((vente) => {
    const searchLower = search.toLowerCase();
    return (
      vente.bien?.title?.toLowerCase().includes(searchLower) ||
      vente.acquereur?.name?.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteVente.mutateAsync(id);
      toast.success("Vente supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ventes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Historique des ventes</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredVentes?.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune vente enregistrée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bien</TableHead>
                  <TableHead>Acquéreur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Prix total</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVentes?.map((vente) => {
                  const statusConfig = STATUS_CONFIG[vente.status] || STATUS_CONFIG.en_cours;
                  const progress = vente.payment_type === "echelonne" && vente.total_installments
                    ? ((vente.paid_installments || 0) / vente.total_installments) * 100
                    : vente.status === "complete" ? 100 : 0;

                  return (
                    <TableRow key={vente.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{vente.bien?.title}</p>
                          <p className="text-sm text-muted-foreground">{vente.bien?.address}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{vente.acquereur?.name}</p>
                          <p className="text-sm text-muted-foreground">{vente.acquereur?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(vente.sale_date), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(vente.total_price)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {vente.payment_type === "comptant" ? "Comptant" : "Échelonné"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {vente.payment_type === "echelonne" ? (
                          <div className="space-y-1">
                            <Progress value={progress} className="h-2 w-24" />
                            <p className="text-xs text-muted-foreground">
                              {vente.paid_installments || 0}/{vente.total_installments} échéances
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/ventes-immobilieres/vente/${vente.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              Documents
                            </DropdownMenuItem>
                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(vente.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
