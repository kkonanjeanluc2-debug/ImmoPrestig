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
  useCreateAchatBuyerSignatureRequest,
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
  const createBuyerRequest = useCreateAchatBuyerSignatureRequest();

  const [step, setStep] = useState<"overview" | "sign" | "invite">("overview");
  const [buyerEmail, setBuyerEmail] = useState(achat.acquereurs?.phone ? "" : "");
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
  const pendingBuyerRequest = signatures?.find(
    (s) => s.signer_type === "buyer" && !s.signature_data && !s.signature_text
  );

  const handleVendorSign = async () => {
    if (!signatureData) {
      toast({ title: "Signature requise", description: "Veuillez signer avant de continuer.", variant: "destructive" });
      return;
    }

    try {
      await createSignature.mutateAsync({
        achat_id: achat.id,
        document_type: documentType,
        signer_type: "vendor",
        signer_name: agency?.name || "Le Vendeur",
        signer_email: agency?.email,
        signature_data: signatureData.signatureData,
        signature_text: signatureData.signatureText,
        signature_type: signatureData.type,
      });

      toast({ title: "Document signé", description: "Votre signature a été enregistrée avec horodatage." });
      setStep("overview");
      setSignatureData(null);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la signature.", variant: "destructive" });
    }
  };

  const handleBuyerDirectSign = async () => {
    if (!signatureData) {
      toast({ title: "Signature requise", description: "Veuillez signer avant de continuer.", variant: "destructive" });
      return;
    }

    try {
      await createSignature.mutateAsync({
        achat_id: achat.id,
        document_type: documentType,
        signer_type: "buyer",
        signer_name: achat.acquereurs?.name || "L'Acquéreur",
        signature_data: signatureData.signatureData,
        signature_text: signatureData.signatureText,
        signature_type: signatureData.type,
      });

      toast({ title: "Document signé", description: "La signature de l'acquéreur a été enregistrée." });
      setStep("overview");
      setSignatureData(null);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la signature.", variant: "destructive" });
    }
  };

  const handleSendToBuyer = async () => {
    if (!buyerEmail) {
      toast({ title: "Email requis", description: "Veuillez saisir l'email de l'acquéreur.", variant: "destructive" });
      return;
    }

    setIsSendingEmail(true);
    try {
      const result = await createBuyerRequest.mutateAsync({
        achatId: achat.id,
        documentType,
        buyerName: achat.acquereurs?.name || "L'Acquéreur",
        buyerEmail,
      });

      const appOrigin = "https://property-grace.lovable.app";
      const signatureLink = `${appOrigin}/sign-achat?token=${result.token}`;

      const { error: emailError } = await supabase.functions.invoke("send-achat-signature-invite", {
        body: {
          achatId: achat.id,
          buyerName: achat.acquereurs?.name || "L'Acquéreur",
          buyerEmail,
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
          description: `Un email d'invitation à signer a été envoyé à ${buyerEmail}.`,
        });
      }

      setStep("overview");
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de créer la demande de signature.", variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCopyLink = async () => {
    if (pendingBuyerRequest?.signature_token) {
      const appOrigin = "https://property-grace.lovable.app";
      const signatureLink = `${appOrigin}/sign-achat?token=${pendingBuyerRequest.signature_token}`;
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

              {/* Vendor signature */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${vendorSignature ? "bg-green-100" : "bg-muted"}`}>
                    <User className={`h-4 w-4 ${vendorSignature ? "text-green-600" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium">Vendeur</p>
                    <p className="text-sm text-muted-foreground">{achat.vendeurs?.name || agency?.name || "Vendeur"}</p>
                  </div>
                </div>
                {vendorSignature ? (
                  <div className="text-right">
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Signé
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatDate(vendorSignature.signed_at)}
                    </p>
                  </div>
                ) : (
                  <Button onClick={() => setStep("sign")} size="sm">
                    <PenTool className="h-4 w-4 mr-2" />
                    Signer
                  </Button>
                )}
              </div>

              {/* Buyer signature */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${buyerSignature ? "bg-green-100" : "bg-muted"}`}>
                    <User className={`h-4 w-4 ${buyerSignature ? "text-green-600" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium">Acquéreur</p>
                    <p className="text-sm text-muted-foreground">{achat.acquereurs?.name}</p>
                  </div>
                </div>
                {buyerSignature ? (
                  <div className="text-right">
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Signé
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatDate(buyerSignature.signed_at)}
                    </p>
                  </div>
                ) : pendingBuyerRequest ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Mail className="h-3 w-3" />
                      Invité
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={handleCopyLink} title="Copier le lien">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setStep("sign")}
                      size="sm"
                      variant="outline"
                      disabled={!vendorSignature}
                      title="Signer directement"
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Signer ici
                    </Button>
                    <Button
                      onClick={() => setStep("invite")}
                      size="sm"
                      variant="outline"
                      disabled={!vendorSignature}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer lien
                    </Button>
                  </div>
                )}
              </div>

              {!vendorSignature && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Vous devez d'abord signer le document avant d'inviter l'acquéreur.
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

        {step === "sign" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>
                {vendorSignature ? "Signature de l'Acquéreur" : "Signature du Vendeur"}
              </Label>
              <p className="text-sm text-muted-foreground">
                Signez en dessinant ou en tapant votre nom. La signature sera horodatée automatiquement.
              </p>
            </div>

            <SignatureTypeSelector
              signerName={vendorSignature ? (achat.acquereurs?.name || "L'Acquéreur") : (achat.vendeurs?.name || agency?.name || "Le Vendeur")}
              onSignatureComplete={setSignatureData}
            />

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setStep("overview"); setSignatureData(null); }}>
                Retour
              </Button>
              <Button
                onClick={vendorSignature ? handleBuyerDirectSign : handleVendorSign}
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
                <Label htmlFor="buyer-email">Email de l'acquéreur</Label>
                <Input
                  id="buyer-email"
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="email@exemple.com"
                />
              </div>

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Un email contenant un lien de signature sécurisé sera envoyé à l'acquéreur. Le lien expire dans 7 jours.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("overview")}>
                Retour
              </Button>
              <Button onClick={handleSendToBuyer} disabled={!buyerEmail || isSendingEmail}>
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
