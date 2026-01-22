import { Mail, FileText, Bell, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useEmailLogs } from "@/hooks/useEmailLogs";
import { cn } from "@/lib/utils";

interface EmailHistoryProps {
  tenantId: string;
}

const emailTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  reminder: {
    label: "Rappel de paiement",
    icon: Bell,
    color: "text-amber-500 bg-amber-500/10",
  },
  receipt: {
    label: "Quittance de loyer",
    icon: FileText,
    color: "text-emerald bg-emerald/10",
  },
  late_payment: {
    label: "Paiement en retard",
    icon: Bell,
    color: "text-destructive bg-destructive/10",
  },
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  sent: {
    label: "Envoyé",
    icon: CheckCircle,
    color: "text-emerald",
  },
  failed: {
    label: "Échoué",
    icon: XCircle,
    color: "text-destructive",
  },
};

export function EmailHistory({ tenantId }: EmailHistoryProps) {
  const { data: emailLogs, isLoading } = useEmailLogs(tenantId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!emailLogs || emailLogs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Mail className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Aucun email envoyé</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {emailLogs.map((log) => {
        const typeInfo = emailTypeConfig[log.email_type] || {
          label: log.email_type,
          icon: Mail,
          color: "text-muted-foreground bg-muted",
        };
        const statusInfo = statusConfig[log.status] || statusConfig.sent;
        const TypeIcon = typeInfo.icon;
        const StatusIcon = statusInfo.icon;

        return (
          <div
            key={log.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className={cn("p-2 rounded-lg", typeInfo.color)}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm text-foreground truncate">
                  {typeInfo.label}
                </p>
                <StatusIcon className={cn("h-3.5 w-3.5", statusInfo.color)} />
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {log.recipient_email}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(log.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
