import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VenteWithDetails } from "@/hooks/useVentesImmobilieres";
import { useEcheancesVentes } from "@/hooks/useEcheancesVentes";
import { generatePromesseVenteImmo, generateRecuVenteImmo, generateContratVenteImmo, VenteSignatureForPDF } from "@/lib/generateVenteImmoPDF";
import { useAgency } from "@/hooks/useAgency";
import { useVenteSignatures } from "@/hooks/useVenteSignatures";
import { FileText, Receipt, Download, FileCheck, PenTool, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatCurrency } from "@/lib/pdfFormat";
import { Badge } from "@/components/ui/badge";
import { SignVenteDocumentDialog } from "./SignVenteDocumentDialog";

interface DocumentsVenteDialogProps {
  vente: VenteWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentsVenteDialog({ vente, open, onOpenChange }: DocumentsVenteDialogProps) {
  const { data: agency } = useAgency();
  const { data: echeances } = useEcheancesVentes();
  const { data: allSignatures } = useVenteSignatures(vente.id);

  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signDocumentType, setSignDocumentType] = useState<"contrat_vente" | "promesse_vente">("contrat_vente");

  const venteEcheances = echeances?.filter((e) => e.vente_id === vente.id && e.status === "paid") || [];
  const allEcheances = echeances?.filter((e) => e.vente_id === vente.id) || [];
  const isFullyPaid = vente.payment_type === "comptant" || (allEcheances.length > 0 && allEcheances.every((e) => e.status === "paid"));

  // Signature status helpers
  const getSignatureStatus = (docType: "contrat_vente" | "promesse_vente") => {
    const docSignatures = allSignatures?.filter((s) => s.document_type === docType) || [];
    const vendorSigned = docSignatures.some((s) => s.signer_type === "vendor" && (s.signature_data || s.signature_text));
    const buyerSigned = docSignatures.some((s) => s.signer_type === "buyer" && (s.signature_data || s.signature_text));
    return { vendorSigned, buyerSigned, fullySigned: vendorSigned && buyerSigned };
  };

  const contratStatus = getSignatureStatus("contrat_vente");
  const promesseStatus = getSignatureStatus("promesse_vente");

  const getSignaturesForPDF = (docType: "contrat_vente" | "promesse_vente"): VenteSignatureForPDF[] => {
    return (allSignatures?.filter((s) => s.document_type === docType && (s.signature_data || s.signature_text)) || []).map((s) => ({
      signerType: s.signer_type as "vendor" | "buyer",
      signerName: s.signer_name,
      signatureType: s.signature_type as "drawn" | "typed",
      signatureData: s.signature_data,
      signatureText: s.signature_text,
      signedAt: s.signed_at,
    }));
  };

  const openSignDialog = (docType: "contrat_vente" | "promesse_vente") => {
    setSignDocumentType(docType);
    setSignDialogOpen(true);
  };

  const handleDownloadPromesse = async () => {
    if (!agency || !vente.bien || !vente.acquereur) {
      toast.error("Informations manquantes pour générer le document");
      return;
    }

    try {
      const sigs = getSignaturesForPDF("promesse_vente");
      const doc = await generatePromesseVenteImmo(
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
        agency,
        90,
        sigs
      );
      doc.save(`promesse-vente-${vente.bien.title}.pdf`);
      toast.success("Promesse de vente téléchargée");
    } catch (error) {
      toast.error("Erreur lors de la génération du document");
    }
  };

  const handleDownloadContratVente = async () => {
    if (!agency || !vente.bien || !vente.acquereur) {
      toast.error("Informations manquantes pour générer le contrat");
      return;
    }

    try {
      const sigs = getSignaturesForPDF("contrat_vente");
      const doc = await generateContratVenteImmo(
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
        agency,
        sigs
      );
      doc.save(`contrat-vente-${vente.bien.title}.pdf`);
      toast.success("Contrat de vente téléchargé");
    } catch (error) {
      toast.error("Erreur lors de la génération du contrat");
    }
  };

  const handleDownloadRecu = async (echeance: { amount: number; paid_date: string | null; payment_method?: string | null; receipt_number?: string | null }) => {
    if (!agency || !vente.bien || !vente.acquereur || !echeance.paid_date) {
      toast.error("Informations manquantes pour générer le reçu");
      return;
    }

    try {
      const doc = await generateRecuVenteImmo(
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

  const renderSignatureBadge = (status: { vendorSigned: boolean; buyerSigned: boolean; fullySigned: boolean }) => {
    if (status.fullySigned) {
      return (
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Signé par les 2 parties
        </Badge>
      );
    }
    if (status.vendorSigned) {
      return (
        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
          <PenTool className="h-3 w-3" />
          Vendeur signé
        </Badge>
      );
    }
    return null;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Documents de la vente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Contrat de vente */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Contrat de vente</p>
                  <p className="text-sm text-muted-foreground">
                    {isFullyPaid
                      ? "Document officiel de cession du bien"
                      : "Disponible uniquement après solde complet du bien"}
                  </p>
                  {isFullyPaid && renderSignatureBadge(contratStatus)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleDownloadContratVente} disabled={!isFullyPaid}>
                  <Download className="h-4 w-4 mr-2" />
                  {isFullyPaid ? "Télécharger" : "En attente du solde complet"}
                </Button>
                {isFullyPaid && (
                  <Button variant="outline" size="icon" onClick={() => openSignDialog("contrat_vente")} title="Signer numériquement">
                    <PenTool className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Promesse de vente */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Promesse de vente</p>
                  <p className="text-sm text-muted-foreground">Document préliminaire de la transaction</p>
                  {renderSignatureBadge(promesseStatus)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={handleDownloadPromesse}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
                <Button variant="outline" size="icon" onClick={() => openSignDialog("promesse_vente")} title="Signer numériquement">
                  <PenTool className="h-4 w-4" />
                </Button>
              </div>
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

      <SignVenteDocumentDialog
        open={signDialogOpen}
        onOpenChange={setSignDialogOpen}
        vente={vente}
        documentType={signDocumentType}
      />
    </>
  );
}
