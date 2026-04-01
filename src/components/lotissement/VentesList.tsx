import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, User, Banknote, Building2, Smartphone, CreditCard, Search, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { VenteWithDetails, useCancelVenteParcelle } from "@/hooks/useVentesParcelles";
import { DocumentsParcelleDialog } from "./DocumentsParcelleDialog";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import type { PeriodValue } from "@/components/dashboard/PeriodFilter";
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
import { toast } from "sonner";

interface VentesListProps {
  ventes: VenteWithDetails[];
  lotissementId: string;
  period?: PeriodValue;
}

export function VentesList({ ventes, lotissementId, period }: VentesListProps) {
  const [selectedVente, setSelectedVente] = useState<VenteWithDetails | null>(null);
  const { data: assignableUsers } = useAssignableUsers();
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelTarget, setCancelTarget] = useState<VenteWithDetails | null>(null);
  const cancelVente = useCancelVenteParcelle();
  
  const filteredVentes = useMemo(() => {
    return ventes.filter((v) => {
      if (!v.parcelle?.lotissement?.name) return false;
      if (period) {
        const saleDate = new Date(v.sale_date);
        if (!isWithinInterval(saleDate, { start: period.from, end: period.to })) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = v.acquereur?.name?.toLowerCase() || "";
        const phone = v.acquereur?.phone?.toLowerCase() || "";
        const plot = v.parcelle?.plot_number?.toLowerCase() || "";
        if (!name.includes(q) && !phone.includes(q) && !plot.includes(q)) return false;
      }
      return true;
    });
  }, [ventes, period, searchQuery]);

  const getSoldByName = (soldBy: string | null | undefined) => {
    if (!soldBy) return null;
    const user = assignableUsers?.find(u => u.user_id === soldBy);
    return user?.full_name || user?.email || null;
  };

  const getPaymentMethodIcon = (method: string | null | undefined) => {
    switch (method) {
      case "especes": return <Banknote className="h-3 w-3" />;
      case "virement": return <Building2 className="h-3 w-3" />;
      case "mobile_money": return <Smartphone className="h-3 w-3" />;
      case "cheque": return <CreditCard className="h-3 w-3" />;
      default: return null;
    }
  };

  const getPaymentMethodLabel = (method: string | null | undefined) => {
    switch (method) {
      case "especes": return "Espèces";
      case "virement": return "Virement";
      case "mobile_money": return "Mobile Money";
      case "cheque": return "Chèque";
      default: return null;
    }
  };

  if (filteredVentes.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <p className="text-muted-foreground">Aucune vente enregistrée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un acquéreur, téléphone ou lot..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <Card>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parcelle</TableHead>
              <TableHead>Acquéreur</TableHead>
              <TableHead>Date de vente</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Paiement</TableHead>
              <TableHead>Commercial</TableHead>
              <TableHead>Progression</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVentes.map((vente) => {
              const progress = vente.payment_type === "echelonne" 
                ? `${vente.paid_installments || 0}/${vente.total_installments || 0}`
                : "Complet";
              const soldByName = getSoldByName((vente as any).sold_by);
              const paymentMethod = (vente as any).payment_method;
              
              return (
                <TableRow key={vente.id}>
                  <TableCell className="font-medium">
                    Lot {vente.parcelle?.plot_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{vente.acquereur?.name}</p>
                      {vente.acquereur?.phone && (
                        <p className="text-sm text-muted-foreground">{vente.acquereur.phone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(vente.sale_date), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {vente.total_price.toLocaleString("fr-FR")} F CFA
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {vente.payment_type === "comptant" ? "Comptant" : "Échelonné"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {paymentMethod ? (
                      <Badge variant="secondary" className="gap-1">
                        {getPaymentMethodIcon(paymentMethod)}
                        {getPaymentMethodLabel(paymentMethod)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {soldByName ? (
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{soldByName}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {vente.payment_type === "echelonne" ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[60px]">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ 
                              width: `${((vente.paid_installments || 0) / (vente.total_installments || 1)) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{progress}</span>
                      </div>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        Payé
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedVente(vente)}
                      title="Télécharger les documents"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCancelTarget(vente)}
                      title="Annuler la vente"
                      className="text-destructive hover:text-destructive"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </Card>

      {selectedVente && (
        <DocumentsParcelleDialog
          vente={selectedVente}
          open={!!selectedVente}
          onOpenChange={(open) => !open && setSelectedVente(null)}
        />
      )}

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette vente ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va supprimer la vente du lot {cancelTarget?.parcelle?.plot_number}, 
              toutes les échéances associées, et remettre le lot en statut "Disponible".
              {cancelTarget?.down_payment && cancelTarget.down_payment > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  Montant déjà payé à rembourser : {cancelTarget.down_payment.toLocaleString("fr-FR")} F CFA
                </span>
              )}
              <span className="block mt-2 font-semibold">Cette action est irréversible.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, garder</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!cancelTarget) return;
                cancelVente.mutate(
                  { venteId: cancelTarget.id, parcelleId: cancelTarget.parcelle_id },
                  {
                    onSuccess: () => {
                      toast.success("Vente annulée — lot remis en disponible");
                      setCancelTarget(null);
                    },
                    onError: (err) => {
                      toast.error("Erreur lors de l'annulation : " + (err as Error).message);
                    },
                  }
                );
              }}
            >
              Oui, annuler la vente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
