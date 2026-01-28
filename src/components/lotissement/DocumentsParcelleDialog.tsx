import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAgency } from "@/hooks/useAgency";
import {
  generateFicheReservation,
  generateContratVente,
  generateAttestationPaiement,
  generatePromesseVente,
  downloadPDF,
} from "@/lib/generateLotissementPDF";
import { VenteWithDetails } from "@/hooks/useVentesParcelles";
import { useEcheancesParcelles } from "@/hooks/useEcheancesParcelles";

interface DocumentsParcelleDialogProps {
  vente: VenteWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentsParcelleDialog({
  vente,
  open,
  onOpenChange,
}: DocumentsParcelleDialogProps) {
  const { data: agency } = useAgency();
  const { data: echeances } = useEcheancesParcelles(vente.id);
  const [generating, setGenerating] = useState<string | null>(null);

  const depositPercentage = agency?.reservation_deposit_percentage ?? 30;

  const agencyInfo = agency
    ? {
        name: agency.name,
        email: agency.email || undefined,
        phone: agency.phone || undefined,
        address: agency.address || undefined,
        city: agency.city || undefined,
        country: agency.country || undefined,
        logo_url: agency.logo_url,
        siret: agency.siret || undefined,
      }
    : null;

  const parcelleInfo = {
    plot_number: vente.parcelle?.plot_number || "N/A",
    area: (vente.parcelle as any)?.area || 0,
    price: vente.total_price,
  };

  const lotissementInfo = {
    name: vente.parcelle?.lotissement?.name || "N/A",
    location: (vente.parcelle?.lotissement as any)?.location || "",
    city: (vente.parcelle?.lotissement as any)?.city || null,
  };

  const acquereurInfo = {
    name: vente.acquereur?.name || "N/A",
    phone: vente.acquereur?.phone,
    email: (vente.acquereur as any)?.email || null,
    address: (vente.acquereur as any)?.address || null,
    cni_number: (vente.acquereur as any)?.cni_number || null,
    birth_date: (vente.acquereur as any)?.birth_date || null,
    birth_place: (vente.acquereur as any)?.birth_place || null,
    profession: (vente.acquereur as any)?.profession || null,
  };

  const handleGenerateFicheReservation = async () => {
    setGenerating("reservation");
    try {
      const doc = await generateFicheReservation(
        parcelleInfo,
        lotissementInfo,
        acquereurInfo,
        agencyInfo,
        vente.sale_date,
        depositPercentage
      );
      downloadPDF(doc, `fiche-reservation-${parcelleInfo.plot_number}.pdf`);
      toast.success("Fiche de réservation générée");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setGenerating(null);
    }
  };

  const handleGeneratePromesseVente = async () => {
    setGenerating("promesse");
    try {
      const depositAmount = vente.down_payment || Math.round(vente.total_price * depositPercentage / 100);
      const doc = await generatePromesseVente(
        parcelleInfo,
        lotissementInfo,
        acquereurInfo,
        agencyInfo,
        vente.sale_date,
        depositPercentage,
        depositAmount
      );
      downloadPDF(doc, `promesse-vente-${parcelleInfo.plot_number}.pdf`);
      toast.success("Promesse de vente générée");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateContratVente = async () => {
    setGenerating("contrat");
    try {
      const venteInfo = {
        id: vente.id,
        sale_date: vente.sale_date,
        total_price: vente.total_price,
        payment_type: vente.payment_type as "comptant" | "echelonne",
        down_payment: vente.down_payment,
        monthly_payment: vente.monthly_payment,
        total_installments: vente.total_installments,
      };
      
      const doc = await generateContratVente(
        venteInfo,
        parcelleInfo,
        lotissementInfo,
        acquereurInfo,
        agencyInfo
      );
      downloadPDF(doc, `contrat-vente-${parcelleInfo.plot_number}.pdf`);
      toast.success("Contrat de vente généré");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAttestation = async (echeanceId: string) => {
    setGenerating(echeanceId);
    try {
      const echeance = echeances?.find((e) => e.id === echeanceId);
      if (!echeance) {
        toast.error("Échéance non trouvée");
        return;
      }

      const echeanceIndex = echeances?.findIndex((e) => e.id === echeanceId) ?? 0;
      const totalEcheances = echeances?.length ?? 1;

      const venteInfo = {
        id: vente.id,
        sale_date: vente.sale_date,
        total_price: vente.total_price,
        payment_type: vente.payment_type as "comptant" | "echelonne",
        down_payment: vente.down_payment,
        monthly_payment: vente.monthly_payment,
        total_installments: vente.total_installments,
      };

      const echeanceInfo = {
        id: echeance.id,
        due_date: echeance.due_date,
        amount: echeance.amount,
        paid_date: echeance.paid_date || undefined,
        paid_amount: echeance.paid_amount || undefined,
        payment_method: echeance.payment_method || undefined,
        receipt_number: echeance.receipt_number || undefined,
      };

      const doc = await generateAttestationPaiement(
        echeanceInfo,
        venteInfo,
        parcelleInfo,
        lotissementInfo,
        acquereurInfo,
        agencyInfo,
        echeanceIndex + 1,
        totalEcheances
      );
      downloadPDF(doc, `attestation-paiement-${parcelleInfo.plot_number}-${echeanceIndex + 1}.pdf`);
      toast.success("Attestation de paiement générée");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setGenerating(null);
    }
  };

  const paidEcheances = echeances?.filter((e) => e.status === "paid") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents - Parcelle {vente.parcelle?.plot_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Promesse de vente - Only for reserved or sold parcels */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
            <div>
              <p className="font-medium text-sm">Promesse de vente</p>
              <p className="text-xs text-muted-foreground">
                Document juridique de pré-vente
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePromesseVente}
              disabled={generating === "promesse"}
            >
              {generating === "promesse" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Fiche de réservation */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium text-sm">Fiche de réservation</p>
              <p className="text-xs text-muted-foreground">
                Document de réservation de la parcelle
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateFicheReservation}
              disabled={generating === "reservation"}
            >
              {generating === "reservation" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Contrat de vente */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium text-sm">Contrat de vente</p>
              <p className="text-xs text-muted-foreground">
                Contrat de cession de terrain
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateContratVente}
              disabled={generating === "contrat"}
            >
              {generating === "contrat" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Attestations de paiement */}
          {paidEcheances.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Attestations de paiement
              </p>
              {paidEcheances.map((echeance, index) => (
                <div
                  key={echeance.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950/20"
                >
                  <div>
                    <p className="font-medium text-sm">
                      Échéance {index + 1} - {echeance.amount.toLocaleString("fr-FR")} F
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Payé le{" "}
                      {echeance.paid_date
                        ? new Date(echeance.paid_date).toLocaleDateString("fr-FR")
                        : "N/A"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateAttestation(echeance.id)}
                    disabled={generating === echeance.id}
                  >
                    {generating === echeance.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {paidEcheances.length === 0 && vente.payment_type === "echelonne" && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Aucune échéance payée pour générer une attestation
            </p>
          )}

          {/* Paiement comptant - attestation */}
          {vente.payment_type === "comptant" && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
              <div>
                <p className="font-medium text-sm">Attestation de paiement</p>
                <p className="text-xs text-muted-foreground">
                  Paiement comptant - {vente.total_price.toLocaleString("fr-FR")} F
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setGenerating("comptant");
                  try {
                    const venteInfo = {
                      id: vente.id,
                      sale_date: vente.sale_date,
                      total_price: vente.total_price,
                      payment_type: "comptant" as const,
                      down_payment: vente.total_price,
                      monthly_payment: null,
                      total_installments: null,
                    };
                    const echeanceInfo = {
                      id: vente.id,
                      due_date: vente.sale_date,
                      amount: vente.total_price,
                      paid_date: vente.sale_date,
                      paid_amount: vente.total_price,
                      payment_method: "Comptant",
                      receipt_number: `ATT-${vente.id.substring(0, 8).toUpperCase()}`,
                    };
                    const doc = await generateAttestationPaiement(
                      echeanceInfo,
                      venteInfo,
                      parcelleInfo,
                      lotissementInfo,
                      acquereurInfo,
                      agencyInfo,
                      1,
                      1
                    );
                    downloadPDF(doc, `attestation-paiement-${parcelleInfo.plot_number}.pdf`);
                    toast.success("Attestation de paiement générée");
                  } catch (error) {
                    console.error("Error generating PDF:", error);
                    toast.error("Erreur lors de la génération du PDF");
                  } finally {
                    setGenerating(null);
                  }
                }}
                disabled={generating === "comptant"}
              >
                {generating === "comptant" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
