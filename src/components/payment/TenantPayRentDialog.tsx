import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreditCard, Smartphone, Copy, Check, Phone } from "lucide-react";

interface TenantPayRentDialogProps {
  paymentId: string;
  amount: number;
  dueDate: string;
  propertyTitle: string;
  tenantPhone?: string | null;
  agencyMobileMoneyNumber?: string | null;
  agencyMobileMoneyProvider?: string | null;
  agencyName?: string;
}

const providerLabels: Record<string, { label: string; color: string }> = {
  orange_money: { label: "Orange Money", color: "bg-orange-500" },
  mtn_money: { label: "MTN Mobile Money", color: "bg-yellow-500" },
  wave: { label: "Wave", color: "bg-blue-500" },
  moov: { label: "Moov Money", color: "bg-purple-500" },
};

export function TenantPayRentDialog({
  paymentId,
  amount,
  dueDate,
  propertyTitle,
  agencyMobileMoneyNumber,
  agencyMobileMoneyProvider,
  agencyName,
}: TenantPayRentDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const dueMonth = new Date(dueDate).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const providerInfo = agencyMobileMoneyProvider
    ? providerLabels[agencyMobileMoneyProvider]
    : null;

  const handleCopyNumber = async () => {
    if (!agencyMobileMoneyNumber) return;
    
    try {
      await navigator.clipboard.writeText(agencyMobileMoneyNumber);
      setCopied(true);
      toast.success("Numéro copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le numéro");
    }
  };

  const hasPaymentConfig = agencyMobileMoneyNumber && agencyMobileMoneyProvider;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="text-xs">
          <CreditCard className="h-3 w-3 mr-1" />
          Payer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Payer mon loyer
          </DialogTitle>
          <DialogDescription>
            Réglez votre loyer de {dueMonth} par transfert Mobile Money.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Bien</span>
              <span className="font-medium text-sm">{propertyTitle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Période</span>
              <span className="font-medium capitalize">{dueMonth}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Montant à payer</span>
              <span className="text-lg font-bold text-primary">
                {amount.toLocaleString("fr-FR")} F CFA
              </span>
            </div>
          </div>

          {hasPaymentConfig ? (
            <>
              {/* Agency payment info */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Effectuez un transfert {providerInfo?.label} vers le numéro suivant :
                </p>
                
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                  {/* Provider badge */}
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${providerInfo?.color}`} />
                    <span className="text-sm font-medium">{providerInfo?.label}</span>
                  </div>
                  
                  {/* Phone number with copy */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="text-xl font-bold tracking-wide">
                        {agencyMobileMoneyNumber}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyNumber}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Agency name */}
                  {agencyName && (
                    <p className="text-sm text-muted-foreground">
                      Destinataire : <span className="font-medium">{agencyName}</span>
                    </p>
                  )}
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Important :</strong> Après votre transfert, conservez la confirmation. 
                    Votre paiement sera marqué comme reçu une fois validé par l'agence.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">
                L'agence n'a pas encore configuré ses informations de paiement Mobile Money. 
                Veuillez contacter directement votre gestionnaire.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
