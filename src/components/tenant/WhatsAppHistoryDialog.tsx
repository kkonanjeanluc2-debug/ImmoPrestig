import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useWhatsAppLogs } from "@/hooks/useWhatsAppLogs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageCircle, FileText, Receipt, Clock, AlertTriangle, Loader2 } from "lucide-react";

interface WhatsAppHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

const MESSAGE_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  receipt: {
    label: "Quittance",
    icon: <Receipt className="h-3 w-3" />,
    variant: "default",
  },
  reminder: {
    label: "Rappel",
    icon: <Clock className="h-3 w-3" />,
    variant: "secondary",
  },
  late_reminder: {
    label: "Retard",
    icon: <AlertTriangle className="h-3 w-3" />,
    variant: "destructive",
  },
  document: {
    label: "Document",
    icon: <FileText className="h-3 w-3" />,
    variant: "outline",
  },
};

export function WhatsAppHistoryDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: WhatsAppHistoryDialogProps) {
  const { data: logs, isLoading } = useWhatsAppLogs(tenantId);

  const formatPhone = (phone: string) => {
    if (phone.startsWith("221")) {
      return `+${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
    }
    return `+${phone}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Historique WhatsApp - {tenantName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
            <p>Aucun message WhatsApp envoyé</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => {
                const config = MESSAGE_TYPE_CONFIG[log.message_type] || MESSAGE_TYPE_CONFIG.document;
                
                return (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={config.variant} className="flex items-center gap-1">
                        {config.icon}
                        {config.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Envoyé au {formatPhone(log.recipient_phone)}
                    </div>
                    
                    <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg p-3 text-sm">
                      <p className="whitespace-pre-wrap line-clamp-4">{log.message_preview}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
