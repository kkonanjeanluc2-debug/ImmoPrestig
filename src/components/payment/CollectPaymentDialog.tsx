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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useUpdatePayment } from "@/hooks/usePayments";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Banknote } from "lucide-react";

interface CollectPaymentDialogProps {
  paymentId: string;
  tenantName: string;
  amount: number;
  currentMethod?: string | null;
  onSuccess?: () => void;
}

const paymentMethods = [
  { value: "especes", label: "Espèces" },
  { value: "virement", label: "Virement bancaire" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cheque", label: "Chèque" },
];

export function CollectPaymentDialog({
  paymentId,
  tenantName,
  amount,
  currentMethod,
  onSuccess,
}: CollectPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState(currentMethod || "especes");
  const updatePayment = useUpdatePayment();
  const { toast } = useToast();

  const handleCollect = async () => {
    try {
      await updatePayment.mutateAsync({
        id: paymentId,
        status: "paid",
        paid_date: new Date().toISOString().split("T")[0],
        method: method,
      });

      toast({
        title: "Paiement encaissé",
        description: `Le paiement de ${tenantName} a été enregistré avec succès.`,
      });

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
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleCollect}
            disabled={updatePayment.isPending}
            className="bg-emerald hover:bg-emerald/90"
          >
            {updatePayment.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Encaissement...
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
