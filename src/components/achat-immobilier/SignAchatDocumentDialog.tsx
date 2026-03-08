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
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SignatureTypeSelector } from "@/components/signature/SignatureTypeSelector";
import {
  useAchatSignatures,
  useCreateAchatSignature,
  useCreateAchatSignatureRequest,
} from "@/hooks/useAchatSignatures";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import type { AchatImmobilier } from "@/hooks/useAchatsImmobiliers";

interface SignAchatDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achat: AchatImmobilier;
  documentType: "acte_achat" | "compromis_achat";
}

type StepType = "overview" | "sign-vendor" | "sign-buyer" | "invite-vendor" | "invite-buyer";

export function SignAchatDocumentDialog({
  open,
  onOpenChange,
  achat,
  documentType,
}: SignAchatDocumentDialogProps) {
  const { toast } = useToast();
  const { data: agency } = useAgency();
  const { data: signatures, isLoading } = useAchatSignatures(achat.id, documentType);
  const createSignature = useCreateAchatSignature();
  const createSignatureRequest = useCreateAchatSignatureRequest();

  const [step, setStep] = useState<StepType>("overview");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [signatureData, setSignatureData] = useState<{
    type: "drawn" | "typed";
    signatureData?: string;
    signatureText?: string;
  } | null>(null);

  const docLabel = documentType === "acte_achat" ? "Acte d'achat" : "Compromis d'achat";

  const vendorSignature = signatures?.find(
    (s) => s.signer_type === "vendor" && (s.signature_data || s.signature_text)
  );
  const buyerSignature = signatures?.find(
    (s) => s.signer_type === "buyer" && (s.signature_data || s.signature_text)
  );
  const pendingVendorRequest = signatures?.find(
    (s) => s.signer_type === "vendor" && !s.signature_data && !s.signature_text
  );
  const pendingBuyerRequest = signatures?.find(
    (s) => s.signer_type === "buyer" && !s.signature_data && !s.signature_text
  );

  const handleDirectSign = async (signerType: "vendor" | "buyer") => {
    if (!signatureData) {
      toast({ title: "Signature requise", description: "Veuillez signer avant de continuer.", variant: "destructive" });
      return;
    }

    const isVendor = signerType === "vendor";
    try {
      await createSignature.mutateAsync({
        achat_id: achat.id,
        document_type: documentType,
        signer_type: signerType,
        signer_name: isVendor
          ? (achat.vendeurs?.name || agency?.name || "Le Vendeur")
          : (achat.acquereurs?.name || "L'Acquéreur"),
        signer_email: isVendor ? agency?.email : undefined,
        signature_data: signatureData.signatureData,
        signature_text: signatureData.signatureText,
        signature_type: signatureData.type,
      });

      toast({ title: "Document signé", description: "La signature a été enregistrée avec horodatage." });
      setStep("overview");
      setSignatureData(null);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la signature.", variant: "destructive" });
    }
  };

  const handleSendInvite = async (signerType: "vendor" | "buyer") => {
    if (!inviteEmail) {
      toast({ title: "Email requis", description: "Veuillez saisir l'email.", variant: "destructive" });
      return;
    }

    const isVendor = signerType === "vendor";
    const signerName = isVendor
      ? (achat.vendeurs?.name || agency?.name || "Le Vendeur")
      : (achat.acquereurs?.name || "L'Acquéreur");

    setIsSendingEmail(true);
    try {
      const result = await createSignatureRequest.mutateAsync({
        achatId: achat.id,
        documentType,
        signerType,
        signerName,
        signerEmail: inviteEmail,
      });

      const appOrigin = "https://property-grace.lovable.app";
      const signatureLink = `${appOrigin}/sign-achat?token=${result.token}`;

      const { error: emailError } = await supabase.functions.invoke("send-achat-signature-invite", {
        body: {
          signerName,
          signerEmail: inviteEmail,
          signerType,
          signatureLink,
          propertyTitle: achat.biens_achat?.title || "Bien",
          salePrice: achat.sale_price,
          documentType,
          agencyName: agency?.name || "L'agence",
          agencyEmail: agency?.email,
        },
      });

      if (emailError) {
        await navigator.clipboard.writeText(signatureLink);
        toast({
          title: "Demande créée",
          description: "L'email n'a pas pu être envoyé, mais le lien de signature a été copié.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invitation envoyée ✉️",
          description: `Un email d'invitation à signer a été envoyé à ${inviteEmail}.`,
        });
      }

      setStep("overview");
      setInviteEmail("");
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de créer la demande de signature.", variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCopyLink = async (token?: string) => {
    if (token) {
      const appOrigin = "https://property-grace.lovable.app";
      const signatureLink = `${appOrigin}/sign-achat?token=${token}`;
      await navigator.clipboard.writeText(signatureLink);
      toast({ title: "Lien copié", description: "Le lien de signature a été copié." });
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

  const renderSignerRow = (
    label: string,
    name: string,
    signature: any,
    pendingRequest: any,
    signStep: StepType,
    inviteStep: StepType,
    disabled: boolean,
  ) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${signature ? "bg-green-100" : "bg-muted"}`}>
          <User className={`h-4 w-4 ${signature ? "text-green-600" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{name}</p>
        </div>
      </div>
      {signature ? (
        <div className="text-right">
          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            Signé
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3 inline mr-1" />
            {formatDate(signature.signed_at)}
          </p>
        </div>
      ) : pendingRequest ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Mail className="h-3 w-3" />
            Invité
          </Badge>
          <Button size="icon" variant="ghost" onClick={() => handleCopyLink(pendingRequest.signature_token)} title="Copier le lien">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            onClick={() => setStep(signStep)}
            size="sm"
            variant="outline"
            disabled={disabled}
          >
            <PenTool className="h-4 w-4 mr-2" />
            Signer ici
          </Button>
          <Button
            onClick={() => setStep(inviteStep)}
            size="sm"
            variant="outline"
            disabled={disabled}
          >
            <Send className="h-4 w-4 mr-2" />
            Envoyer lien
          </Button>
        </div>
      )}
    </div>
  );

  const isSignStep = step === "sign-vendor" || step === "sign-buyer";
  const isInviteStep = step === "invite-vendor" || step === "invite-buyer";
  const currentSignerType = step.includes("vendor") ? "vendor" : "buyer";
  const signerLabel = currentSignerType === "vendor" ? "du Vendeur" : "de l'Acquéreur";
  const signerName = currentSignerType === "vendor"
    ? (achat.vendeurs?.name || agency?.name || "Le Vendeur")
    : (achat.acquereurs?.name || "L'Acquéreur");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Signature électronique - {docLabel}
          </DialogTitle>
          <DialogDescription>
            Signez électroniquement l'{docLabel.toLowerCase()} avec horodatage sécurisé.
          </DialogDescription>
        </DialogHeader>

        {step === "overview" && (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Détails de l'achat
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Bien :</span>
                <span className="font-medium">{achat.biens_achat?.title}</span>
                <span className="text-muted-foreground">Acquéreur :</span>
                <span className="font-medium">{achat.acquereurs?.name}</span>
                <span className="text-muted-foreground">Vendeur :</span>
                <span className="font-medium">{achat.vendeurs?.name || "-"}</span>
                <span className="text-muted-foreground">Prix :</span>
                <span className="font-medium">{Number(achat.sale_price).toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Statut des signatures</h4>

              {renderSignerRow(
                "Vendeur",
                achat.vendeurs?.name || agency?.name || "Vendeur",
                vendorSignature,
                pendingVendorRequest,
                "sign-vendor",
                "invite-vendor",
                false,
              )}

              {renderSignerRow(
                "Acquéreur",
                achat.acquereurs?.name || "Acquéreur",
                buyerSignature,
                pendingBuyerRequest,
                "sign-buyer",
                "invite-buyer",
                !vendorSignature,
              )}

              {!vendorSignature && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Vous devez d'abord signer le document (vendeur) avant d'inviter l'acquéreur.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {vendorSignature && buyerSignature && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  L'{docLabel.toLowerCase()} a été signé par les deux parties.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {isSignStep && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Signature {signerLabel}</Label>
              <p className="text-sm text-muted-foreground">
                Signez en dessinant ou en tapant votre nom. La signature sera horodatée automatiquement.
              </p>
            </div>

            <SignatureTypeSelector
              signerName={signerName}
              onSignatureComplete={setSignatureData}
            />

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setStep("overview"); setSignatureData(null); }}>
                Retour
              </Button>
              <Button
                onClick={() => handleDirectSign(currentSignerType)}
                disabled={!signatureData || createSignature.isPending}
              >
                {createSignature.isPending ? "Signature en cours..." : "Valider ma signature"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {isInviteStep && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">
                  Email {currentSignerType === "vendor" ? "du vendeur" : "de l'acquéreur"}
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemple.com"
                />
              </div>

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Un email contenant un lien de signature sécurisé sera envoyé. Le lien expire dans 7 jours.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setStep("overview"); setInviteEmail(""); }}>
                Retour
              </Button>
              <Button onClick={() => handleSendInvite(currentSignerType)} disabled={!inviteEmail || isSendingEmail}>
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
      </DialogContent>
    </Dialog>
  );
}
