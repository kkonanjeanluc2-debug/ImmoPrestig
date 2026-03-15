import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageCircle, Send } from "lucide-react";
import { formatPhoneForWhatsApp, openWhatsApp } from "@/lib/whatsapp";
import { formatCurrency } from "@/lib/pdfFormat";

interface SendAchatReminderDialogProps {
  echeanceId: string;
  vendeurName: string;
  vendeurPhone?: string | null;
  vendeurEmail?: string | null;
  bienTitle: string;
  amount: number;
  dueDate: string;
  isLate: boolean;
  trigger?: React.ReactNode;
}

export function SendAchatReminderDialog({
  echeanceId,
  vendeurName,
  vendeurPhone,
  vendeurEmail,
  bienTitle,
  amount,
  dueDate,
  isLate,
  trigger,
}: SendAchatReminderDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp">("whatsapp");
  const { toast } = useToast();

  const canSendEmail = !!vendeurEmail;
  const canSendWhatsApp = !!vendeurPhone;
  const hasAnyContact = canSendEmail || canSendWhatsApp;

  const generateReminderMessage = () => {
    const formattedDate = new Date(dueDate).toLocaleDateString("fr-FR");
    const formattedAmount = formatCurrency(amount);

    if (isLate) {
      return `Bonjour ${vendeurName},

Nous vous informons que l'échéance de paiement pour le bien "${bienTitle}" du ${formattedDate} d'un montant de ${formattedAmount} est en retard.

Nous vous prions de bien vouloir régulariser cette situation dans les plus brefs délais.

Merci de votre compréhension.
Cordialement`;
    }

    return `Bonjour ${vendeurName},

Nous vous rappelons que vous avez une échéance de paiement à venir pour le bien "${bienTitle}".

📅 Date d'échéance : ${formattedDate}
💰 Montant : ${formattedAmount}

Merci de préparer le règlement pour cette date.
Cordialement`;
  };

  const handleSendWhatsApp = () => {
    if (!vendeurPhone) return;
    const message = generateReminderMessage();
    openWhatsApp(vendeurPhone, message);
    toast({ title: "WhatsApp ouvert", description: "Le message de rappel a été pré-rempli dans WhatsApp." });
    setOpen(false);
  };

  const handleSendEmail = () => {
    if (!vendeurEmail) return;
    const subject = isLate
      ? `Rappel urgent : Échéance en retard - ${bienTitle}`
      : `Rappel : Échéance de paiement à venir - ${bienTitle}`;
    const body = encodeURIComponent(generateReminderMessage());
    window.open(`mailto:${vendeurEmail}?subject=${encodeURIComponent(subject)}&body=${body}`);
    toast({ title: "Email ouvert", description: "Votre client email a été ouvert avec le message pré-rempli." });
    setOpen(false);
  };

  const handleSend = () => {
    if (activeTab === "whatsapp") handleSendWhatsApp();
    else handleSendEmail();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="ghost" className="text-xs h-8 px-2" disabled={!hasAnyContact} title={!hasAnyContact ? "Aucun contact disponible" : "Envoyer un rappel"}>
            <Mail className="h-3 w-3" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Relancer le vendeur
          </DialogTitle>
          <DialogDescription>
            Envoyez un rappel pour l'échéance {isLate ? "en retard" : "à venir"}.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "whatsapp")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="whatsapp" disabled={!canSendWhatsApp} className="flex items-center gap-1 text-xs text-green-600">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email" disabled={!canSendEmail} className="flex items-center gap-1 text-xs">
              <Mail className="h-3.5 w-3.5" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="space-y-4 pt-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Vendeur</span>
                <span className="font-medium">{vendeurName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Téléphone</span>
                <span className="font-medium text-sm">{vendeurPhone || "Non disponible"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Bien</span>
                <span className="font-medium text-sm truncate max-w-[180px]">{bienTitle}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Montant</span>
                <span className={`font-bold ${isLate ? "text-destructive" : "text-primary"}`}>{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Échéance</span>
                <span className="font-medium">{new Date(dueDate).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
            <div className="bg-green-500/10 text-green-700 dark:text-green-300 rounded-lg p-3 text-sm">
              📱 WhatsApp s'ouvrira avec un message pré-rempli. Envoyez-le manuellement.
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 pt-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Vendeur</span>
                <span className="font-medium">{vendeurName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="font-medium text-sm">{vendeurEmail || "Non disponible"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Bien</span>
                <span className="font-medium text-sm truncate max-w-[180px]">{bienTitle}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Montant</span>
                <span className={`font-bold ${isLate ? "text-destructive" : "text-primary"}`}>{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Échéance</span>
                <span className="font-medium">{new Date(dueDate).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
            <div className="bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-lg p-3 text-sm">
              📧 Votre client email s'ouvrira avec le message pré-rempli.
            </div>
          </TabsContent>
        </Tabs>

        {isLate && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            ⚠️ Cette échéance est en retard. Le vendeur recevra un rappel urgent.
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            onClick={handleSend}
            disabled={(activeTab === "email" && !canSendEmail) || (activeTab === "whatsapp" && !canSendWhatsApp)}
            className={activeTab === "whatsapp" ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {activeTab === "whatsapp" ? (
              <><MessageCircle className="h-4 w-4 mr-2" />Ouvrir WhatsApp</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />Ouvrir Email</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
