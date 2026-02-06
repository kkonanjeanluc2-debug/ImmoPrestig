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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDownToLine, Loader2, Zap } from "lucide-react";
import { useCreateWithdrawalRequest } from "@/hooks/useWithdrawalRequests";
import { useAgency, PAYMENT_OPERATORS } from "@/hooks/useAgency";
import { useProcessWithdrawal } from "@/hooks/useProcessWithdrawal";
import { Checkbox } from "@/components/ui/checkbox";

interface RequestWithdrawalDialogProps {
  availableBalance: number;
}

export function RequestWithdrawalDialog({ availableBalance }: RequestWithdrawalDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("wave");
  const [notes, setNotes] = useState("");
  const [processImmediately, setProcessImmediately] = useState(true);

  const { data: agency } = useAgency();
  const createRequest = useCreateWithdrawalRequest();
  const processWithdrawal = useProcessWithdrawal();

  // Pre-fill with agency's mobile money number if available
  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && agency?.mobile_money_number) {
      setRecipientPhone(agency.mobile_money_number);
    }
    if (isOpen && agency?.mobile_money_provider) {
      setPaymentMethod(agency.mobile_money_provider);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = Number(amount);
    if (numAmount <= 0 || numAmount > availableBalance) {
      return;
    }

    try {
      // Create the withdrawal request
      const result = await createRequest.mutateAsync({
        amount: numAmount,
        recipient_phone: recipientPhone,
        recipient_name: recipientName || undefined,
        payment_method: paymentMethod,
        notes: notes || undefined,
      });

      // If immediate processing is enabled, trigger the payout
      if (processImmediately && result?.id) {
        await processWithdrawal.mutateAsync(result.id);
      }

      setOpen(false);
      setAmount("");
      setRecipientPhone("");
      setRecipientName("");
      setNotes("");
    } catch (error) {
      // Error is handled by the mutation hooks
      console.error("Withdrawal error:", error);
    }
  };

  const isProcessing = createRequest.isPending || processWithdrawal.isPending;

  const formatCurrency = (value: number) => {
    return value.toLocaleString("fr-FR") + " F CFA";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ArrowDownToLine className="h-4 w-4" />
          Demander un reversement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Demande de reversement</DialogTitle>
          <DialogDescription>
            Demandez un reversement des fonds reçus sur votre compte KKiaPay.
            <br />
            <span className="font-medium text-foreground">
              Solde disponible: {formatCurrency(availableBalance)}
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Montant à retirer *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Ex: 100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={availableBalance}
              min={1}
              required
            />
            {Number(amount) > availableBalance && (
              <p className="text-xs text-destructive">
                Le montant dépasse le solde disponible
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Mode de réception *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un opérateur" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient_phone">Numéro de téléphone *</Label>
            <Input
              id="recipient_phone"
              type="tel"
              placeholder="Ex: 0700000000"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient_name">Nom du bénéficiaire</Label>
            <Input
              id="recipient_name"
              placeholder="Ex: Jean Dupont"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Informations supplémentaires..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="process_immediately"
              checked={processImmediately}
              onCheckedChange={(checked) => setProcessImmediately(checked === true)}
            />
            <Label 
              htmlFor="process_immediately" 
              className="text-sm cursor-pointer flex items-center gap-2"
            >
              <Zap className="h-4 w-4 text-amber-500" />
              Traiter immédiatement via KKiaPay
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isProcessing}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                isProcessing ||
                Number(amount) <= 0 ||
                Number(amount) > availableBalance ||
                !recipientPhone
              }
            >
              {isProcessing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {processImmediately ? "Envoyer le reversement" : "Soumettre la demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
