import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePayEcheance, EcheanceWithDetails } from "@/hooks/useEcheancesParcelles";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Banknote, CreditCard, Smartphone, Building } from "lucide-react";

const paymentSchema = z.object({
  paid_date: z.string().min(1, "La date de paiement est requise"),
  paid_amount: z.number().min(1, "Le montant doit être supérieur à 0"),
  payment_method: z.string().min(1, "Le mode de paiement est requis"),
  receipt_number: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PayEcheanceDialogProps {
  echeance: EcheanceWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentMethods = [
  { value: "especes", label: "Espèces", icon: Banknote },
  { value: "virement", label: "Virement bancaire", icon: Building },
  { value: "mobile_money", label: "Mobile Money", icon: Smartphone },
  { value: "cheque", label: "Chèque", icon: CreditCard },
];

export function PayEcheanceDialog({ echeance, open, onOpenChange }: PayEcheanceDialogProps) {
  const payEcheance = usePayEcheance();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paid_date: format(new Date(), "yyyy-MM-dd"),
      paid_amount: echeance.amount,
      payment_method: "",
      receipt_number: "",
    },
  });

  const selectedMethod = watch("payment_method");

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await payEcheance.mutateAsync({
        id: echeance.id,
        paid_date: data.paid_date,
        paid_amount: data.paid_amount,
        payment_method: data.payment_method,
        receipt_number: data.receipt_number || undefined,
      });
      
      toast.success("Paiement enregistré avec succès");
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement du paiement");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Encaisser l'échéance</DialogTitle>
          <DialogDescription>
            Parcelle {echeance.vente?.parcelle?.plot_number} - {echeance.vente?.acquereur?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant attendu :</span>
              <span className="font-semibold">{echeance.amount.toLocaleString("fr-FR")} F CFA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Échéance prévue :</span>
              <span>{format(new Date(echeance.due_date), "dd MMMM yyyy", { locale: fr })}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paid_date">Date de paiement</Label>
            <Input
              id="paid_date"
              type="date"
              {...register("paid_date")}
            />
            {errors.paid_date && (
              <p className="text-sm text-destructive">{errors.paid_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paid_amount">Montant payé (F CFA)</Label>
            <Input
              id="paid_amount"
              type="number"
              {...register("paid_amount", { valueAsNumber: true })}
            />
            {errors.paid_amount && (
              <p className="text-sm text-destructive">{errors.paid_amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mode de paiement</Label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.value}
                    type="button"
                    variant={selectedMethod === method.value ? "default" : "outline"}
                    className="justify-start gap-2"
                    onClick={() => setValue("payment_method", method.value)}
                  >
                    <Icon className="h-4 w-4" />
                    {method.label}
                  </Button>
                );
              })}
            </div>
            {errors.payment_method && (
              <p className="text-sm text-destructive">{errors.payment_method.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_number">N° de reçu (optionnel)</Label>
            <Input
              id="receipt_number"
              placeholder="Ex: REC-2024-001"
              {...register("receipt_number")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={payEcheance.isPending}>
              {payEcheance.isPending ? "Enregistrement..." : "Encaisser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
