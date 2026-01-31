import { useState, useCallback } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useUpdatePayment } from "@/hooks/usePayments";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";
import { Loader2, CheckCircle, Banknote, Mail, FileText, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateRentReceiptBase64WithTemplate, getPaymentPeriod, getPaymentPeriodsFromMonths } from "@/lib/generateReceipt";
import { ReceiptTemplateSelector } from "./ReceiptTemplateSelector";
import { type ReceiptTemplate } from "@/hooks/useReceiptTemplates";
import { Badge } from "@/components/ui/badge";

interface CollectPaymentDialogProps {
  paymentId: string;
  tenantName: string;
  tenantEmail?: string | null;
  amount: number;
  dueDate: string;
  propertyTitle?: string;
  propertyAddress?: string;
  ownerName?: string;
  currentMethod?: string | null;
  commissionPercentage?: number;
  commissionAmount?: number;
  paymentMonths?: string[] | null; // New field for multi-month
  onSuccess?: () => void;
}

const paymentMethods = [
  { value: "especes", label: "Espèces" },
  { value: "virement", label: "Virement bancaire" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cheque", label: "Chèque" },
];

const methodLabels: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement bancaire",
  mobile_money: "Mobile Money",
  cheque: "Chèque",
};

export function CollectPaymentDialog({
  paymentId,
  tenantName,
  tenantEmail,
  amount,
  dueDate,
  propertyTitle = "Bien immobilier",
  propertyAddress,
  ownerName,
  currentMethod,
  commissionPercentage = 0,
  commissionAmount = 0,
  paymentMonths,
  onSuccess,
}: CollectPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState(currentMethod || "especes");
  const [sendReceipt, setSendReceipt] = useState(!!tenantEmail);
  const [isSendingReceipt, setIsSendingReceipt] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReceiptTemplate | null>(null);
  const updatePayment = useUpdatePayment();
  const { data: agency } = useAgency();
  const { toast } = useToast();

  const handleTemplateChange = useCallback((templateId: string | null, template: ReceiptTemplate | null) => {
    setSelectedTemplateId(templateId);
    setSelectedTemplate(template);
  }, []);

  const handleCollect = async () => {
    const paidDate = new Date().toISOString().split("T")[0];
    
    try {
      await updatePayment.mutateAsync({
        id: paymentId,
        status: "paid",
        paid_date: paidDate,
        method: method,
        tenantName: tenantName,
      });

      toast({
        title: "Paiement encaissé",
        description: `Le paiement de ${tenantName} a été enregistré avec succès.`,
      });

      // Send receipt automatically if enabled
      if (sendReceipt && tenantEmail) {
        setIsSendingReceipt(true);
        try {
          // Use payment months if available, otherwise use due date
          const period = paymentMonths && paymentMonths.length > 0
            ? getPaymentPeriodsFromMonths(paymentMonths)
            : getPaymentPeriod(dueDate);
            
          const pdfBase64 = await generateRentReceiptBase64WithTemplate({
            paymentId,
            tenantName,
            tenantEmail,
            propertyTitle,
            propertyAddress,
            amount,
            paidDate,
            dueDate,
            period,
            method: methodLabels[method] || method,
            ownerName,
            agency: agency ? {
              name: agency.name,
              email: agency.email,
              phone: agency.phone || undefined,
              address: agency.address || undefined,
              city: agency.city || undefined,
              country: agency.country || undefined,
              logo_url: agency.logo_url,
            } : undefined,
            template: selectedTemplate,
            paymentMonths: paymentMonths || undefined,
          });

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
          } else {
            throw new Error(data?.error || "Erreur lors de l'envoi");
          }
        } catch (receiptError: any) {
          console.error("Error sending receipt:", receiptError);
          toast({
            title: "Paiement enregistré",
            description: `Le paiement a été encaissé mais l'envoi de la quittance a échoué: ${receiptError.message}`,
            variant: "destructive",
          });
        } finally {
          setIsSendingReceipt(false);
        }
      }

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'encaisser le paiement.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("fr-FR") + " F CFA";

  const isLoading = updatePayment.isPending || isSendingReceipt;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs">
          <Banknote className="h-3 w-3 mr-1" />
          Encaisser
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald" />
            Confirmer l'encaissement
          </DialogTitle>
          <DialogDescription>
            Vous allez enregistrer le paiement suivant comme encaissé.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Locataire</span>
              <span className="font-medium">{tenantName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Montant</span>
              <span className="text-lg font-bold text-emerald">
                {formatCurrency(amount)}
              </span>
            </div>
            {paymentMonths && paymentMonths.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-sm text-muted-foreground">Mois :</span>
                {paymentMonths.map((month) => (
                  <Badge key={month} variant="secondary" className="text-xs">
                    {month}
                  </Badge>
                ))}
              </div>
            )}
            {commissionPercentage > 0 && (
              <>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Commission ({commissionPercentage}%)
                  </span>
                  <span className="font-medium text-primary">
                    {formatCurrency(commissionAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Net propriétaire</span>
                  <span className="font-medium">
                    {formatCurrency(amount - commissionAmount)}
                  </span>
                </div>
              </>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="font-medium">
                {new Date().toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Mode de paiement</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="method">
                <SelectValue placeholder="Sélectionner un mode" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template selector */}
          {sendReceipt && (
            <ReceiptTemplateSelector
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              disabled={!tenantEmail}
            />
          )}

          {/* Auto receipt option */}
          <div className="flex items-center space-x-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <Checkbox
              id="send-receipt"
              checked={sendReceipt}
              onCheckedChange={(checked) => setSendReceipt(checked === true)}
              disabled={!tenantEmail}
            />
            <div className="flex-1">
              <Label 
                htmlFor="send-receipt" 
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4 text-primary" />
                Envoyer la quittance automatiquement
              </Label>
              {tenantEmail ? (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {tenantEmail}
                </p>
              ) : (
                <p className="text-xs text-destructive mt-0.5">
                  Aucun email disponible pour ce locataire
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleCollect}
            disabled={isLoading}
            className="bg-emerald hover:bg-emerald/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isSendingReceipt ? "Envoi quittance..." : "Encaissement..."}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmer l'encaissement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
