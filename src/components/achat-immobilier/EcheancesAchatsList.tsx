import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2, Download } from "lucide-react";
import { useEcheancesAchats, usePayEcheanceAchat } from "@/hooks/useEcheancesAchats";
import { useAgency } from "@/hooks/useAgency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateEcheanceReceipt } from "@/lib/generateEcheanceReceipt";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  en_attente: "bg-amber-100 text-amber-800",
  paye: "bg-emerald-100 text-emerald-800",
  en_retard: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  paye: "Payé",
  en_retard: "En retard",
};

export function EcheancesAchatsList() {
  const { data: echeances, isLoading } = useEcheancesAchats();
  const { data: agency } = useAgency();
  const payMutation = usePayEcheanceAchat();

  const handleDownloadReceipt = async (ech: any) => {
    try {
      // Find echeance position among all echeances for same achat
      const sameAchat = echeances?.filter(e => e.achat_id === ech.achat_id).sort((a, b) => a.due_date.localeCompare(b.due_date)) || [];
      const echeanceNumber = sameAchat.findIndex(e => e.id === ech.id) + 1;

      await generateEcheanceReceipt({
        echeanceId: ech.id,
        propertyTitle: ech.achats_immobiliers?.biens_achat?.title || "Bien",
        propertyAddress: ech.achats_immobiliers?.biens_achat?.address,
        amount: Number(ech.paid_amount || ech.amount),
        paidDate: ech.paid_date || new Date().toISOString(),
        dueDate: ech.due_date,
        paymentMethod: ech.payment_method || "Espèces",
        totalSalePrice: ech.achats_immobiliers?.sale_price || 0,
        echeanceNumber,
        totalEcheances: sameAchat.length,
        agencyName: agency?.name,
        agencyPhone: agency?.phone || undefined,
        agencyEmail: agency?.email,
        agencyAddress: [agency?.address, agency?.city, agency?.country].filter(Boolean).join(", ") || undefined,
        agencyLogoUrl: agency?.logo_url,
      });
    } catch (e) {
      toast.error("Erreur lors de la génération du reçu");
    }
  };

  const handlePay = async (ech: any) => {
    await payMutation.mutateAsync({ id: ech.id, paid_amount: Number(ech.amount), payment_method: "especes" });
    // Auto-download receipt after successful payment
    const updatedEch = { ...ech, status: "paye", paid_amount: ech.amount, paid_date: new Date().toISOString().split("T")[0], payment_method: "especes" };
    await handleDownloadReceipt(updatedEch);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!echeances?.length) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune échéance d'achat</p>
          <p className="text-sm text-muted-foreground mt-1">Les échéances apparaîtront ici lors d'achats échelonnés</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {echeances.map((ech) => (
        <Card key={ech.id} className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{ech.achats_immobiliers?.biens_achat?.title || "Achat"}</p>
              <p className="text-sm text-muted-foreground">
                Échéance: {format(new Date(ech.due_date), "dd MMM yyyy", { locale: fr })}
              </p>
              <p className="text-lg font-bold mt-1">{Number(ech.amount).toLocaleString("fr-FR")} FCFA</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={STATUS_COLORS[ech.status] || ""}>{STATUS_LABELS[ech.status] || ech.status}</Badge>
              {ech.status === "paye" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownloadReceipt(ech)}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Reçu
                </Button>
              )}
              {ech.status !== "paye" && (
                <Button 
                  size="sm" 
                  onClick={() => handlePay(ech)}
                  disabled={payMutation.isPending}
                >
                  {payMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Payer
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
