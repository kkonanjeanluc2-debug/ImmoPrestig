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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreateEmailLog } from "@/hooks/useEmailLogs";
import { useLogWhatsAppMessage } from "@/hooks/useWhatsAppLogs";
import { useAgency } from "@/hooks/useAgency";
import { Loader2, FileText, Mail, Download, ChevronDown, MessageCircle } from "lucide-react";
import { generateRentReceipt, generateRentReceiptBase64, getPaymentPeriod } from "@/lib/generateReceipt";
import { generateReceiptMessage, openWhatsApp, formatPhoneForWhatsApp } from "@/lib/whatsapp";

interface ReceiptActionsProps {
  paymentId: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string | null;
  tenantPhone?: string | null;
  propertyTitle: string;
  propertyAddress?: string;
  amount: number;
  paidDate: string;
  dueDate: string;
  method?: string;
}

export function ReceiptActions({
  paymentId,
  tenantId,
  tenantName,
  tenantEmail,
  tenantPhone,
  propertyTitle,
  propertyAddress,
  amount,
  paidDate,
  dueDate,
  method,
}: ReceiptActionsProps) {
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const createEmailLog = useCreateEmailLog();
  const logWhatsAppMessage = useLogWhatsAppMessage();
  const { data: agency } = useAgency();

  const period = getPaymentPeriod(dueDate);

  const getReceiptData = () => ({
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
    agency: agency ? {
      name: agency.name,
      email: agency.email,
      phone: agency.phone || undefined,
      address: agency.address || undefined,
      city: agency.city || undefined,
      country: agency.country || undefined,
      logo_url: agency.logo_url,
    } : undefined,
  });

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await generateRentReceipt(getReceiptData());
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
    } finally {
      setIsDownloading(false);
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
      const pdfBase64 = await generateRentReceiptBase64(getReceiptData());

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
        // Log the email
        await createEmailLog.mutateAsync({
          tenant_id: tenantId,
          email_type: "receipt",
          recipient_email: tenantEmail!,
          subject: `Quittance de loyer - ${period} - ${propertyTitle}`,
          status: "sent",
          payment_id: paymentId,
        });

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

  const handleSendWhatsApp = async () => {
    if (!tenantPhone) {
      toast({
        title: "Erreur",
        description: "Ce locataire n'a pas de numéro de téléphone enregistré.",
        variant: "destructive",
      });
      return;
    }

    const message = generateReceiptMessage({
      tenantName,
      propertyTitle,
      amount,
      period,
      paidDate,
    });

    // Log the WhatsApp message
    try {
      await logWhatsAppMessage.mutateAsync({
        tenantId,
        paymentId,
        messageType: "receipt",
        recipientPhone: formatPhoneForWhatsApp(tenantPhone),
        messagePreview: message,
      });
    } catch (error) {
      console.error("Failed to log WhatsApp message:", error);
    }

    openWhatsApp(tenantPhone, message);

    toast({
      title: "WhatsApp ouvert",
      description: "Le message a été pré-rempli dans WhatsApp.",
    });
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
        <DropdownMenuContent align="end" className="bg-popover">
          <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Télécharger PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setDialogOpen(true)}
            disabled={!tenantEmail}
          >
            <Mail className="h-4 w-4 mr-2" />
            Envoyer par email
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleSendWhatsApp}
            disabled={!tenantPhone}
            className="text-green-600 focus:text-green-600"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Envoyer via WhatsApp
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
