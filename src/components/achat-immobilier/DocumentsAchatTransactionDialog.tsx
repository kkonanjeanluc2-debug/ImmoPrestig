import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAgency } from "@/hooks/useAgency";
import { useAchatSignatures } from "@/hooks/useAchatSignatures";
import { useEcheancesAchats } from "@/hooks/useEcheancesAchats";
import { generateDossierAchatPDF } from "@/lib/generateAchatPDF";
import { generateActeAchatPDF, type AchatSignatureForPDF } from "@/lib/generateActeAchatPDF";
import { FileText, Download, FileCheck, PenTool, CheckCircle2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { SignAchatDocumentDialog } from "./SignAchatDocumentDialog";
import type { AchatImmobilier } from "@/hooks/useAchatsImmobiliers";
import type { OffreAchat } from "@/hooks/useOffresAchat";
import type { BienAchat } from "@/hooks/useBiensAchat";

interface DocumentsAchatTransactionDialogProps {
  achat: AchatImmobilier;
  bien: BienAchat | null;
  offres: OffreAchat[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentsAchatTransactionDialog({ achat, bien, offres, open, onOpenChange }: DocumentsAchatTransactionDialogProps) {
  const { data: agency } = useAgency();
  const { data: allSignatures } = useAchatSignatures(achat.id);
  const { data: allEcheances } = useEcheancesAchats();

  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signDocumentType, setSignDocumentType] = useState<"acte_achat" | "compromis_achat">("acte_achat");

  const achatEcheances = allEcheances?.filter((e) => e.achat_id === achat.id) || [];
  const isFullyPaid = achat.payment_type === "comptant" || (achatEcheances.length > 0 && achatEcheances.every((e) => e.status === "paye"));

  const getSignatureStatus = (docType: "acte_achat" | "compromis_achat") => {
    const docSignatures = allSignatures?.filter((s) => s.document_type === docType) || [];
    const vendorSigned = docSignatures.some((s) => s.signer_type === "vendor" && (s.signature_data || s.signature_text));
    const buyerSigned = docSignatures.some((s) => s.signer_type === "buyer" && (s.signature_data || s.signature_text));
    return { vendorSigned, buyerSigned, fullySigned: vendorSigned && buyerSigned };
  };

  const acteStatus = getSignatureStatus("acte_achat");
  const compromisStatus = getSignatureStatus("compromis_achat");

  const getSignaturesForPDF = (docType: "acte_achat" | "compromis_achat"): AchatSignatureForPDF[] => {
    return (allSignatures?.filter((s) => s.document_type === docType && (s.signature_data || s.signature_text)) || []).map((s) => ({
      signerType: s.signer_type as "vendor" | "buyer",
      signerName: s.signer_name,
      signatureType: s.signature_type as "drawn" | "typed",
      signatureData: s.signature_data,
      signatureText: s.signature_text,
      signedAt: s.signed_at,
    }));
  };

  const openSignDialog = (docType: "acte_achat" | "compromis_achat") => {
    setSignDocumentType(docType);
    setSignDialogOpen(true);
  };

  const agencyInfo = agency ? {
    name: agency.name,
    email: agency.email,
    phone: agency.phone || undefined,
    address: agency.address || undefined,
    city: agency.city || undefined,
    country: agency.country || undefined,
    logo_url: agency.logo_url,
    siret: agency.siret,
  } : null;

  const handleDownloadActe = async () => {
    if (!bien) {
      toast.error("Informations manquantes");
      return;
    }
    try {
      const sigs = getSignaturesForPDF("acte_achat");
      await generateActeAchatPDF(achat, bien, sigs, agencyInfo);
      toast.success("Acte d'achat téléchargé");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération");
    }
  };

  const handleDownloadCompromis = async () => {
    if (!bien) {
      toast.error("Informations manquantes");
      return;
    }
    try {
      const sigs = getSignaturesForPDF("compromis_achat");
      await generateActeAchatPDF(achat, bien, sigs, agencyInfo, "compromis");
      toast.success("Compromis d'achat téléchargé");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération");
    }
  };

  const handleDownloadDossier = async () => {
    if (!bien) return;
    try {
      const bienOffres = offres.filter(o => o.bien_id === bien.id);
      await generateDossierAchatPDF(bien, bienOffres, achat, achatEcheances, agencyInfo);
      toast.success("Dossier complet téléchargé");
    } catch (error) {
      toast.error("Erreur lors de la génération");
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
            <DialogTitle>Documents de l'achat</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Acte d'achat */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Acte d'achat</p>
                  <p className="text-sm text-muted-foreground">
                    {isFullyPaid
                      ? "Document officiel de cession"
                      : "Disponible après solde complet"}
                  </p>
                  {isFullyPaid && renderSignatureBadge(acteStatus)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleDownloadActe} disabled={!isFullyPaid}>
                  <Download className="h-4 w-4 mr-2" />
                  {isFullyPaid ? "Télécharger" : "En attente du solde"}
                </Button>
                {isFullyPaid && (
                  <Button variant="outline" size="icon" onClick={() => openSignDialog("acte_achat")} title="Signer numériquement">
                    <PenTool className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Compromis d'achat */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Compromis d'achat</p>
                  <p className="text-sm text-muted-foreground">Document préliminaire de la transaction</p>
                  {renderSignatureBadge(compromisStatus)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={handleDownloadCompromis}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
                <Button variant="outline" size="icon" onClick={() => openSignDialog("compromis_achat")} title="Signer numériquement">
                  <PenTool className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Dossier complet */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Dossier d'achat complet</p>
                  <p className="text-sm text-muted-foreground">Récapitulatif avec négociations et échéancier</p>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={handleDownloadDossier}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SignAchatDocumentDialog
        open={signDialogOpen}
        onOpenChange={setSignDialogOpen}
        achat={achat}
        documentType={signDocumentType}
      />
    </>
  );
}
