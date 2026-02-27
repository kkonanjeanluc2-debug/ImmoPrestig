import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useEcheancesAchats, usePayEcheanceAchat } from "@/hooks/useEcheancesAchats";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateEcheanceReceipt } from "@/lib/generateEcheanceReceipt";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "virement", label: "Virement bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "carte", label: "Carte bancaire" },
];

export function EcheancesAchatsList() {
  const { data: echeances, isLoading } = useEcheancesAchats();
  const { data: agency } = useAgency();
  const { user } = useAuth();
  const payMutation = usePayEcheanceAchat();
  const [payDialog, setPayDialog] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [userName, setUserName] = useState<string>("");

  // Fetch current user name
  const fetchUserName = async () => {
    if (!user) return "";
    const { data } = await supabase.from("profiles").select("full_name, email").eq("user_id", user.id).single();
    return data?.full_name || data?.email || "";
  };

  const handleOpenPayDialog = async (ech: any) => {
    setPaymentMethod("especes");
    const name = await fetchUserName();
    setUserName(name);
    setPayDialog(ech);
  };

  const handleDownloadReceipt = async (ech: any, validatedByName?: string) => {
    try {
      const sameAchat = echeances?.filter(e => e.achat_id === ech.achat_id).sort((a, b) => a.due_date.localeCompare(b.due_date)) || [];
      const echeanceNumber = sameAchat.findIndex(e => e.id === ech.id) + 1;

      // If no name passed, fetch it
      let name = validatedByName;
      if (!name) {
        name = await fetchUserName();
      }

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
        validatedBy: name,
      });
    } catch (e) {
      toast.error("Erreur lors de la génération du reçu");
    }
  };

  const handleConfirmPay = async () => {
    if (!payDialog) return;
    const methodLabel = PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod;
    await payMutation.mutateAsync({ id: payDialog.id, paid_amount: Number(payDialog.amount), payment_method: paymentMethod });
    const updatedEch = { ...payDialog, status: "paye", paid_amount: payDialog.amount, paid_date: new Date().toISOString().split("T")[0], payment_method: methodLabel };
    setPayDialog(null);
    await handleDownloadReceipt(updatedEch, userName);
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
    <>
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
                    onClick={() => handleOpenPayDialog(ech)}
                    disabled={payMutation.isPending}
                  >
                    Payer
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Payment confirmation dialog */}
      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer le paiement</DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="font-semibold">{payDialog.achats_immobiliers?.biens_achat?.title || "Bien"}</p>
                <p className="text-sm text-muted-foreground">
                  Échéance: {format(new Date(payDialog.due_date), "dd MMMM yyyy", { locale: fr })}
                </p>
                <p className="text-lg font-bold">{Number(payDialog.amount).toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {userName && (
                <p className="text-sm text-muted-foreground">
                  Validé par : <span className="font-medium text-foreground">{userName}</span>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Annuler</Button>
            <Button onClick={handleConfirmPay} disabled={payMutation.isPending}>
              {payMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
