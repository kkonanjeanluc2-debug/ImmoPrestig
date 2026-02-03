import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";
import { Loader2, Download } from "lucide-react";
import { generateRentReceipt, getPaymentPeriod, getPaymentPeriodsFromMonths } from "@/lib/generateReceipt";

interface TenantReceiptDownloadProps {
  paymentId: string;
  tenantName: string;
  tenantEmail?: string | null;
  propertyTitle: string;
  propertyAddress?: string;
  amount: number;
  paidDate: string;
  dueDate: string;
  method?: string;
  paymentMonths?: string[] | null;
}

export function TenantReceiptDownload({
  paymentId,
  tenantName,
  tenantEmail,
  propertyTitle,
  propertyAddress,
  amount,
  paidDate,
  dueDate,
  method,
  paymentMonths,
}: TenantReceiptDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const { data: agency } = useAgency();

  // Use payment months if available, otherwise derive from due date
  const period = paymentMonths && paymentMonths.length > 0
    ? getPaymentPeriodsFromMonths(paymentMonths)
    : getPaymentPeriod(dueDate);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await generateRentReceipt({
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
        paymentMonths: paymentMonths || undefined,
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
      toast({
        title: "Quittance téléchargée",
        description: "Le PDF a été téléchargé avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la quittance.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button 
      size="sm" 
      variant="outline" 
      className="text-xs"
      onClick={handleDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      ) : (
        <Download className="h-3 w-3 mr-1" />
      )}
      Quittance
    </Button>
  );
}
