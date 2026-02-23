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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PenTool,
  Clock,
  CheckCircle2,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { SignatureTypeSelector } from "@/components/signature/SignatureTypeSelector";
import { useUpdatePropertyInventory, type PropertyInventory } from "@/hooks/usePropertyInventory";
import { useAgency } from "@/hooks/useAgency";

interface SignInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: PropertyInventory;
  propertyTitle: string;
  tenantName?: string;
}

export function SignInventoryDialog({
  open,
  onOpenChange,
  inventory,
  propertyTitle,
  tenantName,
}: SignInventoryDialogProps) {
  const { data: agency } = useAgency();
  const updateInventory = useUpdatePropertyInventory();
  const [step, setStep] = useState<"overview" | "sign-landlord" | "sign-tenant">("overview");
  const [signatureData, setSignatureData] = useState<{
    type: "drawn" | "typed";
    signatureData?: string;
    signatureText?: string;
  } | null>(null);

  const hasLandlordSignature = !!inventory.landlord_signature;
  const hasTenantSignature = !!inventory.tenant_signature;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSign = async (signerType: "landlord" | "tenant") => {
    if (!signatureData) {
      toast.error("Veuillez signer avant de continuer.");
      return;
    }

    const signatureValue = signatureData.signatureData || signatureData.signatureText || "";

    try {
    const updates: { id: string } & Partial<PropertyInventory> = {
        id: inventory.id,
      };

      if (signerType === "landlord") {
        updates.landlord_signature = signatureValue;
        updates.landlord_signed_at = new Date().toISOString();
      } else {
        updates.tenant_signature = signatureValue;
        updates.tenant_signed_at = new Date().toISOString();
      }

      // Update status to "signe" if both parties have signed
      const bothSigned =
        (signerType === "landlord" && hasTenantSignature) ||
        (signerType === "tenant" && hasLandlordSignature);
      if (bothSigned) {
        updates.status = "signe";
      } else {
        updates.status = "valide";
      }

      await updateInventory.mutateAsync(updates);

      toast.success("Signature enregistrée avec succès");
      setSignatureData(null);
      setStep("overview");
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement de la signature");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Signature de l'inventaire
          </DialogTitle>
          <DialogDescription>
            Signez électroniquement l'inventaire avec horodatage sécurisé.
          </DialogDescription>
        </DialogHeader>

        {step === "overview" && (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Détails de l'inventaire</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Bien :</span>
                <span className="font-medium">{propertyTitle}</span>
                <span className="text-muted-foreground">Type :</span>
                <span className="font-medium">{inventory.type === "entree" ? "Entrée" : "Sortie"}</span>
                <span className="text-muted-foreground">Date :</span>
                <span className="font-medium">{new Date(inventory.inventory_date).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Statut des signatures</h4>

              {/* Landlord signature */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${hasLandlordSignature ? "bg-green-100" : "bg-muted"}`}>
                    <User className={`h-4 w-4 ${hasLandlordSignature ? "text-green-600" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium">Bailleur</p>
                    <p className="text-sm text-muted-foreground">{agency?.name || "Le Bailleur"}</p>
                  </div>
                </div>
                {hasLandlordSignature ? (
                  <div className="text-right">
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Signé
                    </Badge>
                    {inventory.landlord_signed_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDate(inventory.landlord_signed_at)}
                      </p>
                    )}
                  </div>
                ) : (
                  <Button onClick={() => setStep("sign-landlord")} size="sm">
                    <PenTool className="h-4 w-4 mr-2" />
                    Signer
                  </Button>
                )}
              </div>

              {/* Tenant signature */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${hasTenantSignature ? "bg-green-100" : "bg-muted"}`}>
                    <User className={`h-4 w-4 ${hasTenantSignature ? "text-green-600" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium">Locataire</p>
                    <p className="text-sm text-muted-foreground">{tenantName || "Le Locataire"}</p>
                  </div>
                </div>
                {hasTenantSignature ? (
                  <div className="text-right">
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Signé
                    </Badge>
                    {inventory.tenant_signed_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDate(inventory.tenant_signed_at)}
                      </p>
                    )}
                  </div>
                ) : (
                  <Button onClick={() => setStep("sign-tenant")} size="sm" variant="outline">
                    <PenTool className="h-4 w-4 mr-2" />
                    Signer (locataire)
                  </Button>
                )}
              </div>

              {hasLandlordSignature && hasTenantSignature && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    L'inventaire a été signé par les deux parties.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        {(step === "sign-landlord" || step === "sign-tenant") && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="font-medium">
                {step === "sign-landlord" ? "Signature du Bailleur" : "Signature du Locataire"}
              </p>
              <p className="text-sm text-muted-foreground">
                Signez en dessinant ou en tapant votre nom. La signature sera horodatée automatiquement.
              </p>
            </div>

            <SignatureTypeSelector
              signerName={step === "sign-landlord" ? (agency?.name || "Le Bailleur") : (tenantName || "Le Locataire")}
              onSignatureComplete={setSignatureData}
            />

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                En signant ce document, vous confirmez l'exactitude de l'inventaire du mobilier. Cette signature électronique a une valeur juridique.
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setStep("overview"); setSignatureData(null); }}>
                Retour
              </Button>
              <Button
                onClick={() => handleSign(step === "sign-landlord" ? "landlord" : "tenant")}
                disabled={!signatureData || updateInventory.isPending}
              >
                {updateInventory.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signature en cours...</>
                ) : (
                  "Valider ma signature"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
