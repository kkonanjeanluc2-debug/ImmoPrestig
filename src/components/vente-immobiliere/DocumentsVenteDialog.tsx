import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VenteWithDetails } from "@/hooks/useVentesImmobilieres";
import { useEcheancesVentes } from "@/hooks/useEcheancesVentes";
import { generatePromesseVenteImmo, generateRecuVenteImmo } from "@/lib/generateVenteImmoPDF";
import { useAgency } from "@/hooks/useAgency";
import { FileText, Receipt, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatCurrency } from "@/lib/pdfFormat";

interface DocumentsVenteDialogProps {
  vente: VenteWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentsVenteDialog({ vente, open, onOpenChange }: DocumentsVenteDialogProps) {
  const { data: agency } = useAgency();
  const { data: echeances } = useEcheancesVentes();

  const venteEcheances = echeances?.filter((e) => e.vente_id === vente.id && e.status === "paid") || [];

  const handleDownloadPromesse = () => {
    if (!agency || !vente.bien || !vente.acquereur) {
      toast.error("Informations manquantes pour générer le document");
      return;
    }

    try {
      const doc = generatePromesseVenteImmo(
        {
          bien: vente.bien,
          acquereur: vente.acquereur,
          sale_date: vente.sale_date,
          total_price: vente.total_price,
          payment_type: vente.payment_type,
          down_payment: vente.down_payment,
          monthly_payment: vente.monthly_payment,
          total_installments: vente.total_installments,
        },
        agency
      );
      doc.save(`promesse-vente-${vente.bien.title}.pdf`);
      toast.success("Promesse de vente téléchargée");
    } catch (error) {
      toast.error("Erreur lors de la génération du document");
    }
  };

  const handleDownloadRecu = (echeance: { amount: number; paid_date: string | null; payment_method?: string | null; receipt_number?: string | null }) => {
    if (!agency || !vente.bien || !vente.acquereur || !echeance.paid_date) {
      toast.error("Informations manquantes pour générer le reçu");
      return;
    }

    try {
      const doc = generateRecuVenteImmo(
        {
          amount: echeance.amount,
          paid_date: echeance.paid_date,
          payment_method: echeance.payment_method,
          receipt_number: echeance.receipt_number,
        },
        {
          bien: vente.bien,
          acquereur: vente.acquereur,
          sale_date: vente.sale_date,
          total_price: vente.total_price,
          payment_type: vente.payment_type,
          down_payment: vente.down_payment,
          monthly_payment: vente.monthly_payment,
          total_installments: vente.total_installments,
        },
        agency
      );
      doc.save(`recu-paiement-${vente.bien.title}.pdf`);
      toast.success("Reçu de paiement téléchargé");
    } catch (error) {
      toast.error("Erreur lors de la génération du reçu");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Documents de la vente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Promesse de vente */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Promesse de vente</p>
                <p className="text-sm text-muted-foreground">Document officiel de la transaction</p>
              </div>
            </div>
            <Button className="w-full" onClick={handleDownloadPromesse}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>

          {/* Reçus de paiement */}
          {venteEcheances.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Reçus de paiement</h4>
              {venteEcheances.map((echeance, index) => (
                <div key={echeance.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Receipt className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Échéance {index + 1}</p>
                        <p className="text-xs text-muted-foreground">
                          {echeance.paid_date
                            ? format(new Date(echeance.paid_date), "dd MMM yyyy", { locale: fr })
                            : "-"}{" "}
                          • {formatCurrency(echeance.paid_amount || echeance.amount)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadRecu({
                        amount: echeance.paid_amount || echeance.amount,
                        paid_date: echeance.paid_date,
                        payment_method: echeance.payment_method,
                        receipt_number: echeance.receipt_number,
                      })}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {vente.payment_type === "comptant" && (
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Reçu de paiement</p>
                  <p className="text-sm text-muted-foreground">Paiement comptant intégral</p>
                </div>
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() =>
                  handleDownloadRecu({
                    amount: vente.total_price,
                    paid_date: vente.sale_date,
                    payment_method: vente.payment_method,
                    receipt_number: null,
                  })
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>
          )}

          {venteEcheances.length === 0 && vente.payment_type === "echelonne" && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Aucun paiement enregistré pour le moment
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
