import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  UserCog, 
  Power, 
  PowerOff, 
  Trash2,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useSuperAdminAuditLogs, SuperAdminActionType } from "@/hooks/useSuperAdminAudit";

const ACTION_CONFIG: Record<SuperAdminActionType, { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
}> = {
  role_updated: {
    label: "Rôle modifié",
    icon: <UserCog className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-800 border-blue-300",
  },
  account_activated: {
    label: "Compte activé",
    icon: <Power className="h-4 w-4" />,
    color: "bg-green-100 text-green-800 border-green-300",
  },
  account_deactivated: {
    label: "Compte désactivé",
    icon: <PowerOff className="h-4 w-4" />,
    color: "bg-orange-100 text-orange-800 border-orange-300",
  },
  account_deleted: {
    label: "Compte supprimé",
    icon: <Trash2 className="h-4 w-4" />,
    color: "bg-red-100 text-red-800 border-red-300",
  },
};

export function AuditLogCard() {
  const { data: logs, isLoading } = useSuperAdminAuditLogs(100);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Journal d'audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Journal d'audit
        </CardTitle>
        <CardDescription>
          Historique des actions administratives
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs && logs.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => {
                const config = ACTION_CONFIG[log.action_type as SuperAdminActionType];
                const details = log.details as Record<string, any> | null;
                
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${config?.color || 'bg-gray-100'}`}>
                      {config?.icon || <Shield className="h-4 w-4" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={config?.color}>
                          {config?.label || log.action_type}
                        </Badge>
                      </div>
                      
                      {details && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {details.agency_name && (
                            <span className="font-medium">{details.agency_name}</span>
                          )}
                          {details.target_email && (
                            <span className="font-medium"> ({details.target_email})</span>
                          )}
                          {details.old_role && details.new_role && (
                            <span> : {details.old_role} → {details.new_role}</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Aucune action enregistrée
          </div>
        )}
      </CardContent>
    </Card>
  );
}
