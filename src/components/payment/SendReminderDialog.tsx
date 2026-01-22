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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreateEmailLog } from "@/hooks/useEmailLogs";
import { Loader2, Mail, MessageSquare, Send } from "lucide-react";

interface SendReminderDialogProps {
  paymentId: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string | null;
  tenantPhone?: string | null;
  propertyTitle: string;
  amount: number;
  dueDate: string;
  status: string;
}

export function SendReminderDialog({
  paymentId,
  tenantId,
  tenantName,
  tenantEmail,
  tenantPhone,
  propertyTitle,
  amount,
  dueDate,
  status,
}: SendReminderDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"email" | "sms">("email");
  const { toast } = useToast();
  const createEmailLog = useCreateEmailLog();

  const isLate = status === "late";
  const canSendEmail = !!tenantEmail;
  const canSendSms = !!tenantPhone;

  const handleSendReminder = async () => {
    if (activeTab === "email") {
      await handleSendEmail();
    } else {
      await handleSendSms();
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
        await createEmailLog.mutateAsync({
          tenant_id: tenantId,
          email_type: isLate ? "late_payment" : "reminder",
          recipient_email: tenantEmail,
          subject: isLate 
            ? `Rappel urgent : Loyer en retard - ${propertyTitle}`
            : `Rappel : Échéance de loyer à venir - ${propertyTitle}`,
          status: "sent",
          payment_id: paymentId,
        });

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

  const handleSendSms = async () => {
    if (!tenantPhone) {
      toast({
        title: "Erreur",
        description: "Ce locataire n'a pas de numéro de téléphone enregistré.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms-reminder", {
        body: {
          tenantId,
          tenantName,
          tenantPhone,
          propertyTitle,
          amount,
          dueDate,
          status,
          paymentId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "SMS envoyé",
          description: `Un SMS de rappel a été envoyé au ${tenantPhone}.`,
        });
        setOpen(false);
      } else {
        throw new Error(data?.error || "Erreur inconnue");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le SMS.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("fr-FR") + " F CFA";

  const hasAnyContact = canSendEmail || canSendSms;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-8 px-2"
          disabled={!hasAnyContact}
          title={!hasAnyContact ? "Aucun contact disponible" : "Envoyer un rappel"}
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
            Choisissez le mode d'envoi du rappel pour ce paiement {isLate ? "en retard" : "en attente"}.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "sms")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" disabled={!canSendEmail} className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" disabled={!canSendSms} className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 pt-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Destinataire</span>
                <span className="font-medium">{tenantName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="font-medium text-sm">{tenantEmail || "Non disponible"}</span>
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
          </TabsContent>

          <TabsContent value="sms" className="space-y-4 pt-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Destinataire</span>
                <span className="font-medium">{tenantName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Téléphone</span>
                <span className="font-medium text-sm">{tenantPhone || "Non disponible"}</span>
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
            
            <div className="bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-lg p-3 text-sm">
              📱 Un SMS sera envoyé via Twilio au numéro indiqué.
            </div>
          </TabsContent>
        </Tabs>

        {isLate && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            ⚠️ Ce paiement est en retard. Le locataire recevra un rappel urgent.
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSendReminder} 
            disabled={isSending || (activeTab === "email" && !canSendEmail) || (activeTab === "sms" && !canSendSms)}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer {activeTab === "email" ? "l'email" : "le SMS"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
