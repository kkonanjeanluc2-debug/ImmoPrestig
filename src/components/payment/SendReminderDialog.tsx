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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Send } from "lucide-react";

interface SendReminderDialogProps {
  paymentId: string;
  tenantName: string;
  tenantEmail: string | null;
  propertyTitle: string;
  amount: number;
  dueDate: string;
  status: string;
}

export function SendReminderDialog({
  paymentId,
  tenantName,
  tenantEmail,
  propertyTitle,
  amount,
  dueDate,
  status,
}: SendReminderDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const isLate = status === "late";

  const handleSendReminder = async () => {
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
      const { data, error } = await supabase.functions.invoke("send-payment-reminder", {
        body: {
          paymentId,
          tenantName,
          tenantEmail,
          propertyTitle,
          amount,
          dueDate,
          isLate,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Rappel envoyé",
          description: `Un email de rappel a été envoyé à ${tenantEmail}.`,
        });
        setOpen(false);
      } else {
        throw new Error(data?.error || "Erreur inconnue");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le rappel.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("fr-FR") + " F CFA";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-8 px-2"
          disabled={!tenantEmail}
          title={!tenantEmail ? "Email du locataire non disponible" : "Envoyer un rappel"}
        >
          <Mail className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Envoyer un rappel de paiement
          </DialogTitle>
          <DialogDescription>
            Un email de rappel sera envoyé au locataire pour ce paiement {isLate ? "en retard" : "en attente"}.
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
              <span className="text-sm text-muted-foreground">Bien</span>
              <span className="font-medium text-sm truncate max-w-[180px]">{propertyTitle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Montant</span>
              <span className={`font-bold ${isLate ? "text-destructive" : "text-primary"}`}>
                {formatCurrency(amount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Échéance</span>
              <span className="font-medium">
                {new Date(dueDate).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>

          {isLate && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              ⚠️ Ce paiement est en retard. Le locataire recevra un rappel urgent.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSendReminder} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer le rappel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
