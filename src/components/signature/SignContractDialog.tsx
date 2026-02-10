import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  PenTool, 
  Clock, 
  CheckCircle2, 
  Send, 
  User,
  Building,
  Mail,
  AlertCircle,
  Loader2,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SignatureTypeSelector } from "./SignatureTypeSelector";
import { 
  useContractSignatures, 
  useCreateSignature,
  useCreateTenantSignatureRequest 
} from "@/hooks/useContractSignatures";
import { useAgency } from "@/hooks/useAgency";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";

interface ContractData {
  contractId: string;
  tenantName: string;
  tenantEmail?: string;
  tenantHasPortalAccess?: boolean;
  propertyTitle: string;
  rentAmount: number;
  startDate: string;
  endDate: string;
}

interface SignContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractData: ContractData;
}

export function SignContractDialog({
  open,
  onOpenChange,
  contractData,
}: SignContractDialogProps) {
  const { toast } = useToast();
  const { data: agency } = useAgency();
  const { data: userRole } = useCurrentUserRole();
  const { data: signatures, isLoading } = useContractSignatures(contractData.contractId);
  const createSignature = useCreateSignature();
  const createTenantRequest = useCreateTenantSignatureRequest();

  const isLocataire = userRole?.role === "locataire";

  // For tenants, start directly with sign step if landlord has signed
  const [step, setStep] = useState<"overview" | "sign" | "invite">("overview");
  const [tenantEmail, setTenantEmail] = useState(contractData.tenantEmail || "");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [signatureData, setSignatureData] = useState<{
    type: "drawn" | "typed";
    signatureData?: string;
    signatureText?: string;
  } | null>(null);

  const landlordSignature = signatures?.find(s => s.signer_type === "landlord" && (s.signature_data || s.signature_text));
  const tenantSignature = signatures?.find(s => s.signer_type === "tenant" && (s.signature_data || s.signature_text));
  const pendingTenantRequest = signatures?.find(s => s.signer_type === "tenant" && !s.signature_data && !s.signature_text);

  // Redirect tenant directly to sign step when dialog opens
  useEffect(() => {
    if (isLocataire && landlordSignature && !tenantSignature && open) {
      setStep("sign");
    }
  }, [isLocataire, landlordSignature, tenantSignature, open]);

  const handleLandlordSign = async () => {
    if (!signatureData) {
      toast({
        title: "Signature requise",
        description: "Veuillez signer avant de continuer.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createSignature.mutateAsync({
        contract_id: contractData.contractId,
        signer_type: "landlord",
        signer_name: agency?.name || "Le Bailleur",
        signer_email: agency?.email,
        signature_data: signatureData.signatureData,
        signature_text: signatureData.signatureText,
        signature_type: signatureData.type,
      });

      toast({
        title: "Contrat signé",
        description: "Votre signature a été enregistrée avec horodatage.",
      });
      setStep("overview");
      setSignatureData(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la signature.",
        variant: "destructive",
      });
    }
  };

  const handleTenantSign = async () => {
    if (!signatureData) {
      toast({
        title: "Signature requise",
        description: "Veuillez signer avant de continuer.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createSignature.mutateAsync({
        contract_id: contractData.contractId,
        signer_type: "tenant",
        signer_name: contractData.tenantName,
        signer_email: contractData.tenantEmail,
        signature_data: signatureData.signatureData,
        signature_text: signatureData.signatureText,
        signature_type: signatureData.type,
      });

      toast({
        title: "Contrat signé",
        description: "Votre signature a été enregistrée avec succès.",
      });
      onOpenChange(false);
      setSignatureData(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la signature.",
        variant: "destructive",
      });
    }
  };

  const handleSendToTenant = async () => {
    if (!tenantEmail) {
      toast({
        title: "Email requis",
        description: "Veuillez saisir l'email du locataire.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const result = await createTenantRequest.mutateAsync({
        contractId: contractData.contractId,
        tenantName: contractData.tenantName,
        tenantEmail,
      });

      // Construire le lien de signature - utiliser l'URL publiée pour les emails
      const appOrigin = "https://property-grace.lovable.app";
      const signatureLink = `${appOrigin}/sign-contract?token=${result.token}`;
      
      // Envoyer l'email automatiquement
      const { error: emailError } = await supabase.functions.invoke("send-signature-invite", {
        body: {
          contractId: contractData.contractId,
          tenantName: contractData.tenantName,
          tenantEmail,
          signatureToken: result.token,
          signatureLink,
          propertyTitle: contractData.propertyTitle,
          rentAmount: contractData.rentAmount,
          startDate: contractData.startDate,
          endDate: contractData.endDate,
          agencyName: agency?.name || "L'agence",
          agencyEmail: agency?.email,
          hasPortalAccess: contractData.tenantHasPortalAccess,
        },
      });

      if (emailError) {
        console.error("Email send error:", emailError);
        // Email failed, but signature request was created - copy link as fallback
        await navigator.clipboard.writeText(signatureLink);
        toast({
          title: "Demande créée",
          description: "L'email n'a pas pu être envoyé, mais le lien de signature a été copié dans votre presse-papier.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invitation envoyée ✉️",
          description: `Un email d'invitation à signer a été envoyé à ${tenantEmail}.`,
        });
      }
      
      setStep("overview");
    } catch (error) {
      console.error("Error creating signature request:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la demande de signature.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCopyLink = async () => {
    if (pendingTenantRequest?.signature_token) {
      const appOrigin = "https://property-grace.lovable.app";
      const signatureLink = `${appOrigin}/sign-contract?token=${pendingTenantRequest.signature_token}`;
      await navigator.clipboard.writeText(signatureLink);
      toast({
        title: "Lien copié",
        description: "Le lien de signature a été copié dans votre presse-papier.",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Signature électronique du contrat
          </DialogTitle>
          <DialogDescription>
            Signez électroniquement le contrat de location avec horodatage sécurisé.
          </DialogDescription>
        </DialogHeader>

        {step === "overview" && (
          <div className="space-y-6">
            {/* Résumé du contrat */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Détails du contrat
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Bien :</span>
                <span className="font-medium">{contractData.propertyTitle}</span>
                <span className="text-muted-foreground">Locataire :</span>
                <span className="font-medium">{contractData.tenantName}</span>
                <span className="text-muted-foreground">Loyer :</span>
                <span className="font-medium">{contractData.rentAmount.toLocaleString("fr-FR")} FCFA</span>
                <span className="text-muted-foreground">Période :</span>
                <span className="font-medium">
                  {new Date(contractData.startDate).toLocaleDateString("fr-FR")} - {new Date(contractData.endDate).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>

            <Separator />

            {/* Statut des signatures */}
            <div className="space-y-4">
              <h4 className="font-medium">Statut des signatures</h4>
              
              {/* Signature bailleur */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${landlordSignature ? "bg-green-100" : "bg-muted"}`}>
                    <User className={`h-4 w-4 ${landlordSignature ? "text-green-600" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium">Bailleur</p>
                    <p className="text-sm text-muted-foreground">
                      {agency?.name || "Votre agence"}
                    </p>
                  </div>
                </div>
                {landlordSignature ? (
                  <div className="text-right">
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Signé
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatDate(landlordSignature.signed_at)}
                    </p>
                  </div>
                ) : (
                  <Button onClick={() => setStep("sign")} size="sm">
                    <PenTool className="h-4 w-4 mr-2" />
                    Signer
                  </Button>
                )}
              </div>

              {/* Signature locataire */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${tenantSignature ? "bg-green-100" : "bg-muted"}`}>
                    <User className={`h-4 w-4 ${tenantSignature ? "text-green-600" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium">Locataire</p>
                    <p className="text-sm text-muted-foreground">
                      {contractData.tenantName}
                    </p>
                  </div>
                </div>
                {tenantSignature ? (
                  <div className="text-right">
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Signé
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatDate(tenantSignature.signed_at)}
                    </p>
                  </div>
                ) : pendingTenantRequest ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Mail className="h-3 w-3" />
                      Invité
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCopyLink}
                      title="Copier le lien"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => setStep("invite")} 
                    size="sm" 
                    variant="outline"
                    disabled={!landlordSignature}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Inviter à signer
                  </Button>
                )}
              </div>

              {!landlordSignature && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Vous devez d'abord signer le contrat avant d'inviter le locataire.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Statut global */}
            {landlordSignature && tenantSignature && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Le contrat a été signé par les deux parties. Il est maintenant juridiquement valide.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === "sign" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{isLocataire ? "Votre signature" : "Signature du Bailleur"}</Label>
              <p className="text-sm text-muted-foreground">
                Signez en dessinant ou en tapant votre nom. La signature sera horodatée automatiquement.
              </p>
            </div>

            {/* Contract summary for tenant */}
            {isLocataire && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Détails du contrat
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Bien :</span>
                  <span className="font-medium">{contractData.propertyTitle}</span>
                  <span className="text-muted-foreground">Loyer :</span>
                  <span className="font-medium">{contractData.rentAmount.toLocaleString("fr-FR")} FCFA</span>
                  <span className="text-muted-foreground">Période :</span>
                  <span className="font-medium">
                    {new Date(contractData.startDate).toLocaleDateString("fr-FR")} - {new Date(contractData.endDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            )}

            <SignatureTypeSelector
              signerName={isLocataire ? contractData.tenantName : (agency?.name || "Le Bailleur")}
              onSignatureComplete={setSignatureData}
            />

            {isLocataire && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  En signant ce document, vous confirmez avoir lu et accepté les termes du contrat de location. Cette signature électronique a une valeur juridique.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2">
              {!isLocataire && (
                <Button variant="outline" onClick={() => setStep("overview")}>
                  Retour
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {isLocataire ? "Annuler" : "Fermer"}
              </Button>
              <Button 
                onClick={isLocataire ? handleTenantSign : handleLandlordSign} 
                disabled={!signatureData || createSignature.isPending}
              >
                {createSignature.isPending ? "Signature en cours..." : "Valider ma signature"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "invite" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-email">Email du locataire</Label>
                <Input
                  id="tenant-email"
                  type="email"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  placeholder="locataire@email.com"
                />
              </div>

              {contractData.tenantHasPortalAccess && (
                <Alert className="border-blue-200 bg-blue-50">
                  <User className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    Ce locataire a accès à son espace personnel. Il pourra également signer le contrat depuis son portail locataire.
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Un email d'invitation avec le lien de signature sera envoyé automatiquement au locataire. Le lien expire dans 7 jours.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("overview")}>
                Retour
              </Button>
              <Button 
                onClick={handleSendToTenant}
                disabled={!tenantEmail || isSendingEmail}
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer l'invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "overview" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
