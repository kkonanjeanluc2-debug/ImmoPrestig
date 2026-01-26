import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, Printer, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useContractTemplates, useDefaultContractTemplate } from "@/hooks/useContractTemplates";
import { useAgency } from "@/hooks/useAgency";
import {
  downloadContractPDF,
  printContractPDF,
  DEFAULT_CONTRACT_TEMPLATE,
} from "@/lib/generateContract";
import { useToast } from "@/hooks/use-toast";

interface ContractData {
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  propertyTitle: string;
  propertyAddress?: string;
  unitNumber?: string;
  rentAmount: number;
  deposit?: number;
  startDate: string;
  endDate: string;
  ownerName?: string;
}

interface GenerateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractData: ContractData;
}

export function GenerateContractDialog({
  open,
  onOpenChange,
  contractData,
}: GenerateContractDialogProps) {
  const { toast } = useToast();
  const { data: templates, isLoading: templatesLoading } = useContractTemplates();
  const { data: defaultTemplate } = useDefaultContractTemplate();
  const { data: agency } = useAgency();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const getSelectedTemplate = () => {
    if (selectedTemplateId && templates) {
      return templates.find((t) => t.id === selectedTemplateId);
    }
    return defaultTemplate;
  };

  const getTemplateContent = () => {
    const template = getSelectedTemplate();
    return template?.content || DEFAULT_CONTRACT_TEMPLATE;
  };

  const fullContractData = {
    ...contractData,
    agency: agency
      ? {
          name: agency.name,
          email: agency.email,
          phone: agency.phone || undefined,
          address: agency.address || undefined,
          city: agency.city || undefined,
          country: agency.country || undefined,
          logo_url: agency.logo_url,
        }
      : null,
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await downloadContractPDF(getTemplateContent(), fullContractData);
      toast({
        title: "Contrat généré",
        description: "Le contrat a été téléchargé avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le contrat.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
      await printContractPDF(getTemplateContent(), fullContractData);
      toast({
        title: "Impression",
        description: "Le contrat a été ouvert pour impression.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'imprimer le contrat.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const hasTemplates = templates && templates.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Générer le contrat
          </DialogTitle>
          <DialogDescription>
            Générez le contrat de location avec les informations du locataire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template selection */}
          <div className="space-y-2">
            <Label>Modèle de contrat</Label>
            {templatesLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : hasTemplates ? (
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      defaultTemplate
                        ? `${defaultTemplate.name} (par défaut)`
                        : "Sélectionner un modèle"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.is_default && " (par défaut)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Aucun modèle de contrat configuré. Un modèle par défaut sera
                  utilisé. Vous pouvez créer vos propres modèles dans les
                  Paramètres &gt; Contrats.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Contract summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <h4 className="font-medium">Résumé du contrat</h4>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <span>Locataire :</span>
              <span className="font-medium text-foreground">
                {contractData.tenantName}
              </span>
              <span>Bien :</span>
              <span className="font-medium text-foreground">
                {contractData.propertyTitle}
              </span>
              {contractData.unitNumber && (
                <>
                  <span>Unité :</span>
                  <span className="font-medium text-foreground">
                    {contractData.unitNumber}
                  </span>
                </>
              )}
              <span>Loyer :</span>
              <span className="font-medium text-foreground">
                {contractData.rentAmount.toLocaleString("fr-FR")} FCFA
              </span>
              <span>Période :</span>
              <span className="font-medium text-foreground">
                Du {new Date(contractData.startDate).toLocaleDateString("fr-FR")}{" "}
                au {new Date(contractData.endDate).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={isGenerating}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          <Button onClick={handleDownload} disabled={isGenerating}>
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? "Génération..." : "Télécharger PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
