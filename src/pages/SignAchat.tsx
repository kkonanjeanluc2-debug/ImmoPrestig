import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, PenTool } from "lucide-react";
import { SignatureTypeSelector } from "@/components/signature/SignatureTypeSelector";
import { useAchatSignatureByToken, useCompleteAchatBuyerSignature } from "@/hooks/useAchatSignatures";
import { useToast } from "@/hooks/use-toast";

export default function SignAchat() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { toast } = useToast();

  const { data: signatureData, isLoading, error } = useAchatSignatureByToken(token || undefined);
  const completeSignature = useCompleteAchatBuyerSignature();

  const [signed, setSigned] = useState(false);
  const [signature, setSignature] = useState<{
    type: "drawn" | "typed";
    signatureData?: string;
    signatureText?: string;
  } | null>(null);

  const handleSign = async () => {
    if (!signature || !token) return;

    try {
      await completeSignature.mutateAsync({
        token,
        signatureData: signature.signatureData,
        signatureText: signature.signatureText,
        signatureType: signature.type,
      });
      setSigned(true);
      toast({ title: "Signature enregistrée ✓", description: "Le document a été signé avec succès." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium">Lien invalide</p>
            <p className="text-muted-foreground">Le lien de signature est manquant ou invalide.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium">Erreur</p>
            <p className="text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-xl font-bold mb-2">Document signé !</h2>
            <p className="text-muted-foreground">Votre signature a été enregistrée avec horodatage sécurisé.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const achat = signatureData?.achats_immobiliers;
  const docLabel = signatureData?.document_type === "acte_achat" ? "Acte d'achat" : "Compromis d'achat";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-2">
            <PenTool className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Signature - {docLabel}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Vous êtes invité(e) à signer ce document en tant que {signatureData?.signer_type === "vendor" ? "vendeur" : "acquéreur"}.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {achat && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Bien :</span>
                <span className="font-medium">{achat.biens_achat?.title}</span>
                <span className="text-muted-foreground">Adresse :</span>
                <span className="font-medium">{achat.biens_achat?.address}</span>
                <span className="text-muted-foreground">Prix :</span>
                <span className="font-medium">{Number(achat.sale_price).toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              En signant ce document, vous confirmez avoir lu et accepté les termes du {docLabel.toLowerCase()}.
              Votre signature sera horodatée avec votre adresse IP.
            </AlertDescription>
          </Alert>

          <SignatureTypeSelector
            signerName={signatureData?.signer_name || "L'Acquéreur"}
            onSignatureComplete={setSignature}
          />

          <Button
            className="w-full"
            size="lg"
            onClick={handleSign}
            disabled={!signature || completeSignature.isPending}
          >
            {completeSignature.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signature en cours...
              </>
            ) : (
              <>
                <PenTool className="h-4 w-4 mr-2" />
                Signer le document
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
