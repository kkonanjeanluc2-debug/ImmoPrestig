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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Mail, Download, ChevronDown } from "lucide-react";
import { generateRentReceipt, generateRentReceiptBase64, getPaymentPeriod } from "@/lib/generateReceipt";

interface ReceiptActionsProps {
  paymentId: string;
  tenantName: string;
  tenantEmail: string | null;
  propertyTitle: string;
  propertyAddress?: string;
  amount: number;
  paidDate: string;
  dueDate: string;
  method?: string;
}

export function ReceiptActions({
  paymentId,
  tenantName,
  tenantEmail,
  propertyTitle,
  propertyAddress,
  amount,
  paidDate,
  dueDate,
  method,
}: ReceiptActionsProps) {
  const [isSending, setIsSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const period = getPaymentPeriod(dueDate);

  const receiptData = {
    paymentId,
    tenantName,
    tenantEmail,
    propertyTitle,
    propertyAddress,
    amount,
    paidDate,
    dueDate,
    period,
    method,
  };

  const handleDownload = () => {
    try {
      generateRentReceipt(receiptData);
      toast({
        title: "Quittance générée",
        description: "Le PDF a été téléchargé avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer la quittance.",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = async () => {
    if (!tenantEmail) {
      toast({
        title: "Erreur",
        description: "Ce locataire n'a pas d'adresse email enregistrée.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const pdfBase64 = generateRentReceiptBase64(receiptData);

      const { data, error } = await supabase.functions.invoke("send-receipt-email", {
        body: {
          tenantName,
          tenantEmail,
          propertyTitle,
          amount,
          period,
          pdfBase64,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Quittance envoyée",
          description: `La quittance a été envoyée à ${tenantEmail}.`,
        });
        setDialogOpen(false);
      } else {
        throw new Error(data?.error || "Erreur inconnue");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la quittance.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Quittance
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger PDF
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setDialogOpen(true)}
            disabled={!tenantEmail}
          >
            <Mail className="h-4 w-4 mr-2" />
            Envoyer par email
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Envoyer la quittance par email
            </DialogTitle>
            <DialogDescription>
              La quittance sera envoyée en pièce jointe au locataire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Destinataire</span>
                <span className="font-medium">{tenantName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="font-medium text-sm">{tenantEmail}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Période</span>
                <span className="font-medium">{period}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Montant</span>
                <span className="font-bold text-emerald">
                  {amount.toLocaleString("fr-FR")} F CFA
                </span>
              </div>
            </div>

            <div className="bg-primary/5 rounded-lg p-3 text-sm flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 text-primary" />
              <span>
                Un PDF de la quittance sera généré et envoyé en pièce jointe.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSendEmail} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
