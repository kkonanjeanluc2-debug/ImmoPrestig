import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  PenTool, CheckCircle2, Clock, Wallet, Calendar, AlertCircle, Loader2 
} from "lucide-react";
import { SignatureTypeSelector } from "@/components/signature/SignatureTypeSelector";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";

function usePayoutSignatureByToken(token?: string) {
  return useQuery({
    queryKey: ["payout-signature-by-token", token],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-payout-signature-by-token?token=${encodeURIComponent(token!)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur");
      }
      const result = await response.json();
      return result.data;
    },
    enabled: !!token,
  });
}

function useCompletePayoutSignature() {
  return useMutation({
    mutationFn: async ({ token, signatureData, signatureText, signatureType }: {
      token: string;
      signatureData?: string;
      signatureText?: string;
      signatureType: "drawn" | "typed";
    }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-payout-signature`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ token, signatureData, signatureText, signatureType }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur");
      }
      return (await response.json()).data;
    },
  });
}

export default function SignPayout() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { toast } = useToast();
  
  const { data: signatureRequest, isLoading, error } = usePayoutSignatureByToken(token || undefined);
  const completeSigning = useCompletePayoutSignature();
  
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
      toast({ title: "Reversement confirmé", description: "Votre signature a été enregistrée avec succès." });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la signature.", variant: "destructive" });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle className="text-center text-destructive">Lien invalide</CardTitle></CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Ce lien de signature est invalide.</AlertDescription>
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
            <p className="text-muted-foreground">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !signatureRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle className="text-center text-destructive">Lien expiré</CardTitle></CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Ce lien a expiré ou a déjà été utilisé. Contactez votre agence pour un nouveau lien.</AlertDescription>
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
            <h2 className="text-2xl font-bold text-green-700">Reversement confirmé !</h2>
            <p className="text-muted-foreground">Votre signature a été enregistrée. La réception du reversement est confirmée.</p>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Signé le {new Date().toLocaleDateString("fr-FR")} à {new Date().toLocaleTimeString("fr-FR")}
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  const payout = signatureRequest.owner_payouts as any;

  return (
    <div className="min-h-screen p-4 bg-muted/30">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center py-6">
          <Wallet className="h-12 w-12 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold">Confirmation de reversement</h1>
          <p className="text-muted-foreground mt-2">Vous êtes invité(e) à confirmer la réception de votre reversement</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Détails du reversement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Destinataire :</span>
                <p className="font-medium">{signatureRequest.signer_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Montant :</span>
                <p className="font-medium">{payout?.amount?.toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mode :</span>
                <p className="font-medium capitalize">{payout?.payment_method}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date :</span>
                <p className="font-medium">{payout?.payout_date ? new Date(payout.payout_date).toLocaleDateString("fr-FR") : "N/A"}</p>
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
            <CardDescription>Signez pour confirmer la réception du reversement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SignatureTypeSelector
              signerName={signatureRequest.signer_name}
              onSignatureComplete={setSignatureData}
            />
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>En signant, vous confirmez avoir reçu le montant indiqué ci-dessus.</AlertDescription>
            </Alert>
            <Button onClick={handleSign} className="w-full" size="lg" disabled={!signatureData || completeSigning.isPending}>
              {completeSigning.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signature en cours...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" />Confirmer la réception</>
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
