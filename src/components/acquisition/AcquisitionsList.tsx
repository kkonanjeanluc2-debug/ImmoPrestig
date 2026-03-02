import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Edit, Gift, Users, Building, ArrowLeftRight, FileText, ChevronDown } from "lucide-react";
import { useAcquisitions, useDeleteAcquisition, TYPE_ACQUISITION_LABELS, ACQUISITION_STATUS_LABELS } from "@/hooks/useAcquisitions";
import { AcquisitionFormDialog } from "./AcquisitionFormDialog";
import { AcquisitionEditDialog } from "./AcquisitionEditDialog";
import { formatCurrency } from "@/lib/pdfFormat";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAgency } from "@/hooks/useAgency";
import type { Acquisition } from "@/hooks/useAcquisitions";
import {
  generateFicheAcquisitionPDF,
  generateActeDonationPDF,
  generateAttestationSuccessionPDF,
  generateActeApportSocietePDF,
  generateActeEchangePDF,
  generateAttestationMutationPDF,
} from "@/lib/generateAcquisitionPDF";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, typeof Gift> = {
  donation: Gift,
  heritage: Users,
  apport_societe: Building,
  echange: ArrowLeftRight,
};

const STATUS_COLORS: Record<string, string> = {
  en_cours: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  acte_signe: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  enregistre: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  termine: "bg-green-500/10 text-green-500 border-green-500/20",
  annule: "bg-destructive/10 text-destructive border-destructive/20",
};

const ACTE_LABELS: Record<string, string> = {
  donation: "Acte de donation",
  heritage: "Attestation de succession",
  apport_societe: "Acte d'apport en société",
  echange: "Acte d'échange",
};

export function AcquisitionsList() {
  const { data: acquisitions = [], isLoading } = useAcquisitions();
  const deleteAcquisition = useDeleteAcquisition();
  const { data: agency } = useAgency();
  const [editItem, setEditItem] = useState<Acquisition | null>(null);

  const getAgencyInfo = () => agency ? { name: agency.name, email: agency.email, phone: agency.phone || undefined, address: agency.address || undefined } : null;

  const handleGenerateFiche = async (acq: Acquisition) => {
    try {
      await generateFicheAcquisitionPDF(acq, getAgencyInfo());
      toast.success("Fiche récapitulative générée");
    } catch { toast.error("Erreur lors de la génération du PDF"); }
  };

  const handleGenerateActe = async (acq: Acquisition) => {
    try {
      const agencyInfo = getAgencyInfo();
      switch (acq.type_acquisition) {
        case "donation": await generateActeDonationPDF(acq, agencyInfo); break;
        case "heritage": await generateAttestationSuccessionPDF(acq, agencyInfo); break;
        case "apport_societe": await generateActeApportSocietePDF(acq, agencyInfo); break;
        case "echange": await generateActeEchangePDF(acq, agencyInfo); break;
      }
      toast.success("Document généré");
    } catch { toast.error("Erreur lors de la génération du PDF"); }
  };

  const handleGenerateMutation = async (acq: Acquisition) => {
    try {
      await generateAttestationMutationPDF(acq, getAgencyInfo());
      toast.success("Attestation de mutation générée");
    } catch { toast.error("Erreur lors de la génération du PDF"); }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Acquisitions ({acquisitions.length})</h2>
        <AcquisitionFormDialog />
      </div>

      {acquisitions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune acquisition enregistrée. Cliquez sur "Nouvelle acquisition" pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {acquisitions.map((acq) => {
            const TypeIcon = TYPE_ICONS[acq.type_acquisition] || Gift;
            return (
              <Card key={acq.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <TypeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{acq.biens_achat?.title || "Bien supprimé"}</h3>
                        <p className="text-sm text-muted-foreground">{acq.biens_achat?.address}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className={STATUS_COLORS[acq.status] || ""}>
                            {ACQUISITION_STATUS_LABELS[acq.status] || acq.status}
                          </Badge>
                          <Badge variant="secondary">
                            {TYPE_ACQUISITION_LABELS[acq.type_acquisition] || acq.type_acquisition}
                          </Badge>
                          {acq.counterpart_name && (
                            <span className="text-xs text-muted-foreground">
                              {acq.type_acquisition === "heritage" ? "Défunt" : acq.type_acquisition === "donation" ? "Donateur" : "Contrepartie"}: {acq.counterpart_name}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                          <span>Date: {new Date(acq.date_acquisition).toLocaleDateString("fr-FR")}</span>
                          {acq.valeur_estimee > 0 && <span>Valeur: {formatCurrency(acq.valeur_estimee)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            PDF
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleGenerateFiche(acq)}>
                            Fiche récapitulative
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGenerateActe(acq)}>
                            {ACTE_LABELS[acq.type_acquisition] || "Acte"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleGenerateMutation(acq)}>
                            Attestation de mutation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button size="sm" variant="outline" onClick={() => setEditItem(acq)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette acquisition ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAcquisition.mutate(acq.id)}>
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editItem && (
        <AcquisitionEditDialog
          acquisition={editItem}
          open={!!editItem}
          onOpenChange={(open) => !open && setEditItem(null)}
        />
      )}
    </div>
  );
}
