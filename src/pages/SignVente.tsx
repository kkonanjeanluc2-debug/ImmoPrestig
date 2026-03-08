import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  PenTool,
  CheckCircle2,
  Clock,
  Building,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { SignatureTypeSelector } from "@/components/signature/SignatureTypeSelector";
import {
  useVenteSignatureByToken,
  useCompleteVenteBuyerSignature,
} from "@/hooks/useVenteSignatures";
import { useToast } from "@/hooks/use-toast";

export default function SignVente() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { toast } = useToast();

  const { data: signatureRequest, isLoading, error } = useVenteSignatureByToken(token || undefined);
  const completeSigning = useCompleteVenteBuyerSignature();

  const [signed, setSigned] = useState(false);
  const [signatureData, setSignatureData] = useState<{
    type: "drawn" | "typed";
    signatureData?: string;
    signatureText?: string;
  } | null>(null);

  const handleSign = async () => {
    if (!signatureData || !token) {
      toast({ title: "Signature requise", description: "Veuillez signer avant de valider.", variant: "destructive" });
      return;
    }

    try {
      await completeSigning.mutateAsync({
        token,
        signatureData: signatureData.signatureData,
        signatureText: signatureData.signatureText,
        signatureType: signatureData.type,
      });

      setSigned(true);
      toast({ title: "Document signé", description: "Votre signature a été enregistrée avec succès." });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la signature.", variant: "destructive" });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Lien invalide</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Ce lien de signature est invalide ou n'existe pas.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement du document...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !signatureRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Lien expiré</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ce lien de signature a expiré ou a déjà été utilisé. Veuillez contacter le vendeur pour obtenir un nouveau lien.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700">Document signé !</h2>
            <p className="text-muted-foreground">
              Votre signature a été enregistrée avec succès. Le document est maintenant validé par les deux parties.
            </p>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Signé le {new Date().toLocaleDateString("fr-FR")} à {new Date().toLocaleTimeString("fr-FR")}
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vente = signatureRequest.ventes_immobilieres as any;
  const docLabel = signatureRequest.document_type === "contrat_vente" ? "contrat de vente" : "promesse de vente";

  return (
    <div className="min-h-screen p-4 bg-muted/30">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center py-6">
          <PenTool className="h-12 w-12 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold">Signature de {docLabel}</h1>
          <p className="text-muted-foreground mt-2">
            Vous avez été invité(e) à signer un {docLabel}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Détails de la vente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Bien :</span>
                <p className="font-medium">{vente?.biens_vente?.title}</p>
                <p className="text-xs text-muted-foreground">{vente?.biens_vente?.address}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Acquéreur :</span>
                <p className="font-medium">{signatureRequest.signer_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Prix total :</span>
                <p className="font-medium">{vente?.total_price?.toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type de paiement :</span>
                <p className="font-medium">{vente?.payment_type === "comptant" ? "Comptant" : "Échelonné"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Votre signature
            </CardTitle>
            <CardDescription>
              Signez en dessinant ou en tapant votre nom. Votre signature sera horodatée automatiquement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SignatureTypeSelector
              signerName={signatureRequest.signer_name}
              onSignatureComplete={setSignatureData}
            />

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                En signant ce document, vous confirmez avoir lu et accepté les termes du {docLabel}. Cette signature électronique a une valeur juridique.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleSign}
              className="w-full"
              size="lg"
              disabled={!signatureData || completeSigning.isPending}
            >
              {completeSigning.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signature en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Signer le document
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Ce lien expire le {new Date(signatureRequest.token_expires_at!).toLocaleDateString("fr-FR")}
        </p>
      </div>
    </div>
  );
}
