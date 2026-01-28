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
import { FileText } from "lucide-react";
import { VenteWithDetails } from "@/hooks/useVentesParcelles";
import { DocumentsParcelleDialog } from "./DocumentsParcelleDialog";

interface VentesListProps {
  ventes: VenteWithDetails[];
  lotissementId: string;
}

export function VentesList({ ventes, lotissementId }: VentesListProps) {
  const [selectedVente, setSelectedVente] = useState<VenteWithDetails | null>(null);
  
  const filteredVentes = ventes.filter(
    v => v.parcelle?.lotissement?.name
  );

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
              <TableHead>Progression</TableHead>
              <TableHead className="w-[80px]">Documents</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVentes.map((vente) => {
              const progress = vente.payment_type === "echelonne" 
                ? `${vente.paid_installments || 0}/${vente.total_installments || 0}`
                : "Complet";
              
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
                    {vente.payment_type === "echelonne" ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
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
