import { useState } from "react";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, User, Banknote, Building2, Smartphone, CreditCard } from "lucide-react";
import { VenteWithDetails } from "@/hooks/useVentesParcelles";
import { DocumentsParcelleDialog } from "./DocumentsParcelleDialog";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";

interface VentesListProps {
  ventes: VenteWithDetails[];
  lotissementId: string;
}

export function VentesList({ ventes, lotissementId }: VentesListProps) {
  const [selectedVente, setSelectedVente] = useState<VenteWithDetails | null>(null);
  const { data: assignableUsers } = useAssignableUsers();
  
  const filteredVentes = ventes.filter(
    v => v.parcelle?.lotissement?.name
  );

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
      <Card>
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
              <TableHead className="w-[80px]">Documents</TableHead>
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {selectedVente && (
        <DocumentsParcelleDialog
          vente={selectedVente}
          open={!!selectedVente}
          onOpenChange={(open) => !open && setSelectedVente(null)}
        />
      )}
    </>
  );
}
