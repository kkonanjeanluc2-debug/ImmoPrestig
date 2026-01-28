import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityLogs, ActionType, EntityType } from "@/hooks/useActivityLogs";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Activity,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  Mail,
  FileUp,
  Building2,
  Users,
  User,
  FileText,
  ScrollText,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ACTION_CONFIG: Record<ActionType, { label: string; icon: React.ReactNode; color: string }> = {
  create: { label: "Création", icon: <Plus className="h-3 w-3" />, color: "bg-emerald-500/10 text-emerald-600" },
  update: { label: "Modification", icon: <Pencil className="h-3 w-3" />, color: "bg-blue-500/10 text-blue-600" },
  delete: { label: "Suppression", icon: <Trash2 className="h-3 w-3" />, color: "bg-destructive/10 text-destructive" },
  restore: { label: "Restauration", icon: <RotateCcw className="h-3 w-3" />, color: "bg-emerald-500/10 text-emerald-600" },
  permanent_delete: { label: "Suppression définitive", icon: <Trash2 className="h-3 w-3" />, color: "bg-destructive/10 text-destructive" },
  login: { label: "Connexion", icon: <User className="h-3 w-3" />, color: "bg-primary/10 text-primary" },
  logout: { label: "Déconnexion", icon: <User className="h-3 w-3" />, color: "bg-muted text-muted-foreground" },
  payment_collected: { label: "Encaissement", icon: <Wallet className="h-3 w-3" />, color: "bg-emerald-500/10 text-emerald-600" },
  reminder_sent: { label: "Rappel", icon: <Mail className="h-3 w-3" />, color: "bg-amber-500/10 text-amber-600" },
  document_uploaded: { label: "Document", icon: <FileUp className="h-3 w-3" />, color: "bg-violet-500/10 text-violet-600" },
};

const ENTITY_ICONS: Record<EntityType, React.ReactNode> = {
  property: <Building2 className="h-4 w-4 text-muted-foreground" />,
  tenant: <Users className="h-4 w-4 text-muted-foreground" />,
  owner: <User className="h-4 w-4 text-muted-foreground" />,
  payment: <Wallet className="h-4 w-4 text-muted-foreground" />,
  document: <FileText className="h-4 w-4 text-muted-foreground" />,
  contract: <ScrollText className="h-4 w-4 text-muted-foreground" />,
  user: <User className="h-4 w-4 text-muted-foreground" />,
  lotissement: <Building2 className="h-4 w-4 text-muted-foreground" />,
  parcelle: <Building2 className="h-4 w-4 text-muted-foreground" />,
  acquereur: <Users className="h-4 w-4 text-muted-foreground" />,
  vente_parcelle: <Wallet className="h-4 w-4 text-muted-foreground" />,
  echeance_parcelle: <Wallet className="h-4 w-4 text-muted-foreground" />,
  lotissement_document: <FileText className="h-4 w-4 text-muted-foreground" />,
  demarche_administrative: <ScrollText className="h-4 w-4 text-muted-foreground" />,
  parcelle_admin_status: <Building2 className="h-4 w-4 text-muted-foreground" />,
};

export function RecentActivity() {
  const { data: logs, isLoading } = useActivityLogs(10);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Activité récente
        </CardTitle>
        <Link to="/settings">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Voir tout
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px] px-6">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Aucune activité récente</p>
            </div>
          ) : (
            <div className="space-y-1 py-2">
              {logs.map((log) => {
                const actionConfig = ACTION_CONFIG[log.action_type as ActionType] || ACTION_CONFIG.create;
                const entityIcon = ENTITY_ICONS[log.entity_type as EntityType] || ENTITY_ICONS.property;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {entityIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`${actionConfig.color} text-xs font-medium gap-1`}
                        >
                          {actionConfig.icon}
                          {actionConfig.label}
                        </Badge>
                        {log.entity_name && (
                          <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
                            {log.entity_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
