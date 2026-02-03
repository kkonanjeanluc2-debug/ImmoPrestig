import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ScrollText,
  PenTool,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Calendar,
  Wallet,
  Loader2,
} from "lucide-react";
import { useContracts } from "@/hooks/useContracts";
import { useContractSignatures, useCreateSignature } from "@/hooks/useContractSignatures";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { SignatureTypeSelector } from "@/components/signature/SignatureTypeSelector";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TenantContractsTabProps {
  tenantId: string;
  tenantName: string;
}

export function TenantContractsTab({ tenantId, tenantName }: TenantContractsTabProps) {
  const { user } = useAuth();
  const { data: userRole } = useCurrentUserRole();
  const { data: contracts = [], isLoading: contractsLoading } = useContracts();
  const { toast } = useToast();
  const createSignature = useCreateSignature();

  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<{
    type: "drawn" | "typed";
    signatureData?: string;
    signatureText?: string;
  } | null>(null);

  const isLocataire = userRole?.role === "locataire";

  // Filter contracts for this tenant
  const tenantContracts = contracts.filter(
    (c) => c.tenant_id === tenantId
  );

  const handleOpenSignDialog = (contractId: string) => {
    setSelectedContractId(contractId);
    setSignDialogOpen(true);
    setSignatureData(null);
  };

  const handleSign = async () => {
    if (!signatureData || !selectedContractId || !user) {
      toast({
        title: "Signature requise",
        description: "Veuillez signer avant de continuer.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createSignature.mutateAsync({
        contract_id: selectedContractId,
        signer_type: "tenant",
        signer_name: tenantName,
        signature_data: signatureData.signatureData,
        signature_text: signatureData.signatureText,
        signature_type: signatureData.type,
      });

      toast({
        title: "Contrat signé",
        description: "Votre signature a été enregistrée avec horodatage.",
      });
      setSignDialogOpen(false);
      setSelectedContractId(null);
      setSignatureData(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la signature.",
        variant: "destructive",
      });
    }
  };

  if (contractsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Contrats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tenantContracts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun contrat associé à ce locataire.
            </p>
          ) : (
            tenantContracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                tenantName={tenantName}
                isLocataire={isLocataire}
                onSign={() => handleOpenSignDialog(contract.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Sign Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Signer le contrat
            </DialogTitle>
            <DialogDescription>
              Signez électroniquement votre contrat de location. Votre signature sera horodatée.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <SignatureTypeSelector
              signerName={tenantName}
              onSignatureComplete={setSignatureData}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSign}
              disabled={!signatureData || createSignature.isPending}
            >
              {createSignature.isPending ? "Signature en cours..." : "Valider ma signature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ContractCardProps {
  contract: any;
  tenantName: string;
  isLocataire: boolean;
  onSign: () => void;
}

function ContractCard({ contract, tenantName, isLocataire, onSign }: ContractCardProps) {
  const { data: signatures = [], isLoading: signaturesLoading } = useContractSignatures(contract.id);

  const landlordSignature = signatures.find(
    (s) => s.signer_type === "landlord" && (s.signature_data || s.signature_text)
  );
  const tenantSignature = signatures.find(
    (s) => s.signer_type === "tenant" && (s.signature_data || s.signature_text)
  );
  const pendingTenantRequest = signatures.find(
    (s) => s.signer_type === "tenant" && !s.signature_data && !s.signature_text
  );

  const canTenantSign = isLocataire && landlordSignature && !tenantSignature;

  const statusConfig = {
    active: { label: "Actif", className: "bg-emerald/10 text-emerald border-emerald/20" },
    ending_soon: { label: "Fin proche", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    expired: { label: "Expiré", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  };

  const status = statusConfig[contract.status as keyof typeof statusConfig] || statusConfig.expired;

  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* Contract Info */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{contract.property?.title || "Bien"}</span>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(contract.start_date), "dd/MM/yyyy")} - {format(new Date(contract.end_date), "dd/MM/yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" />
              {Number(contract.rent_amount).toLocaleString("fr-FR")} F CFA/mois
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Signatures Status */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Signatures</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Landlord Signature */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className={`p-1.5 rounded-full ${landlordSignature ? "bg-green-100" : "bg-muted"}`}>
              {landlordSignature ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Bailleur</p>
              <p className="text-xs text-muted-foreground truncate">
                {landlordSignature
                  ? `Signé le ${format(new Date(landlordSignature.signed_at), "dd/MM/yyyy à HH:mm", { locale: fr })}`
                  : "En attente"}
              </p>
            </div>
          </div>

          {/* Tenant Signature */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className={`p-1.5 rounded-full ${tenantSignature ? "bg-green-100" : "bg-muted"}`}>
              {tenantSignature ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Locataire</p>
              <p className="text-xs text-muted-foreground truncate">
                {tenantSignature
                  ? `Signé le ${format(new Date(tenantSignature.signed_at), "dd/MM/yyyy à HH:mm", { locale: fr })}`
                  : pendingTenantRequest
                  ? "Invitation envoyée"
                  : "En attente"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action for tenant to sign */}
      {canTenantSign && (
        <Alert className="bg-primary/5 border-primary/20">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span>Le bailleur a signé. C'est à votre tour de signer le contrat.</span>
            <Button size="sm" onClick={onSign} className="ml-4">
              <PenTool className="h-4 w-4 mr-2" />
              Signer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Fully signed status */}
      {landlordSignature && tenantSignature && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Le contrat a été signé par les deux parties.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
