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
import { Banknote, CreditCard, Smartphone, Building, Download, CheckCircle2 } from "lucide-react";
import { generateEcheanceReceipt } from "@/lib/generateEcheanceReceipt";
import { useAgency } from "@/hooks/useAgency";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

const methodLabels: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement bancaire",
  mobile_money: "Mobile Money",
  cheque: "Chèque",
};

export function PayEcheanceDialog({ echeance, open, onOpenChange }: PayEcheanceDialogProps) {
  const payEcheance = usePayEcheance();
  const { data: agency } = useAgency();
  const { user } = useAuth();
  const { data: userProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paidData, setPaidData] = useState<PaymentFormData | null>(null);
  const [generating, setGenerating] = useState(false);
  
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
      setPaidData(data);
      setPaymentSuccess(true);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement du paiement");
    }
  };

  const handleDownloadReceipt = async () => {
    if (!paidData) return;
    setGenerating(true);
    try {
      const lotName = echeance.vente?.parcelle?.lotissement?.name || "";
      const plotNumber = echeance.vente?.parcelle?.plot_number || "";
      const propertyTitle = lotName ? `${lotName} - Parcelle ${plotNumber}` : `Parcelle ${plotNumber}`;

      await generateEcheanceReceipt({
        echeanceId: echeance.id,
        propertyTitle,
        amount: paidData.paid_amount,
        paidDate: paidData.paid_date,
        dueDate: echeance.due_date,
        paymentMethod: methodLabels[paidData.payment_method] || paidData.payment_method,
        totalSalePrice: echeance.amount,
        agencyName: agency?.name,
        agencyPhone: agency?.phone || undefined,
        agencyEmail: agency?.email,
        agencyAddress: agency?.address || undefined,
        agencyLogoUrl: agency?.logo_url,
        validatedBy: userProfile?.full_name || undefined,
        acquereur: echeance.vente?.acquereur ? {
          name: echeance.vente.acquereur.name,
          phone: echeance.vente.acquereur.phone,
        } : undefined,
      });
      toast.success("Reçu téléchargé");
    } catch (error) {
      toast.error("Erreur lors de la génération du reçu");
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setPaymentSuccess(false);
      setPaidData(null);
      reset();
    }
    onOpenChange(open);
  };

  if (paymentSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex flex-col items-center text-center py-6 space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Paiement enregistré</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {paidData?.paid_amount.toLocaleString("fr-FR")} F CFA encaissés pour la parcelle {echeance.vente?.parcelle?.plot_number}
              </p>
            </div>
            <Button
              onClick={handleDownloadReceipt}
              disabled={generating}
              className="gap-2 w-full"
            >
              <Download className="h-4 w-4" />
              {generating ? "Génération..." : "Télécharger le reçu"}
            </Button>
            <Button variant="outline" onClick={() => handleClose(false)} className="w-full">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
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
