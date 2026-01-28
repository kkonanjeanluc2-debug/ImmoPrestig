import { useActivityLogs, ActionType, EntityType } from "@/hooks/useActivityLogs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  Users, 
  Home, 
  Wallet, 
  FileText, 
  FileSignature,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Bell,
  Upload,
  Clock,
  User,
  RotateCcw,
  MapPin,
  Square,
  UserCheck,
  Receipt,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const ACTION_CONFIG: Record<ActionType, { label: string; icon: React.ReactNode; color: string }> = {
  create: { label: "Création", icon: <Plus className="h-3 w-3" />, color: "bg-emerald/20 text-emerald border-emerald/30" },
  update: { label: "Modification", icon: <Pencil className="h-3 w-3" />, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  delete: { label: "Suppression", icon: <Trash2 className="h-3 w-3" />, color: "bg-destructive/20 text-destructive border-destructive/30" },
  restore: { label: "Restauration", icon: <RotateCcw className="h-3 w-3" />, color: "bg-emerald/20 text-emerald border-emerald/30" },
  permanent_delete: { label: "Suppression définitive", icon: <Trash2 className="h-3 w-3" />, color: "bg-destructive/20 text-destructive border-destructive/30" },
  login: { label: "Connexion", icon: <LogIn className="h-3 w-3" />, color: "bg-primary/20 text-primary border-primary/30" },
  logout: { label: "Déconnexion", icon: <LogOut className="h-3 w-3" />, color: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30" },
  payment_collected: { label: "Paiement encaissé", icon: <Wallet className="h-3 w-3" />, color: "bg-emerald/20 text-emerald border-emerald/30" },
  reminder_sent: { label: "Rappel envoyé", icon: <Bell className="h-3 w-3" />, color: "bg-sand/20 text-sand border-sand/30" },
  document_uploaded: { label: "Document ajouté", icon: <Upload className="h-3 w-3" />, color: "bg-primary/20 text-primary border-primary/30" },
};

const ENTITY_CONFIG: Record<EntityType, { label: string; icon: React.ReactNode }> = {
  property: { label: "Bien", icon: <Building2 className="h-4 w-4" /> },
  tenant: { label: "Locataire", icon: <Users className="h-4 w-4" /> },
  owner: { label: "Propriétaire", icon: <Home className="h-4 w-4" /> },
  payment: { label: "Paiement", icon: <Wallet className="h-4 w-4" /> },
  document: { label: "Document", icon: <FileText className="h-4 w-4" /> },
  contract: { label: "Contrat", icon: <FileSignature className="h-4 w-4" /> },
  user: { label: "Utilisateur", icon: <User className="h-4 w-4" /> },
  lotissement: { label: "Lotissement", icon: <MapPin className="h-4 w-4" /> },
  parcelle: { label: "Parcelle", icon: <Square className="h-4 w-4" /> },
  acquereur: { label: "Acquéreur", icon: <UserCheck className="h-4 w-4" /> },
  vente_parcelle: { label: "Vente parcelle", icon: <Receipt className="h-4 w-4" /> },
  echeance_parcelle: { label: "Échéance", icon: <Calendar className="h-4 w-4" /> },
  lotissement_document: { label: "Document lotissement", icon: <FileText className="h-4 w-4" /> },
  demarche_administrative: { label: "Démarche admin.", icon: <FileSignature className="h-4 w-4" /> },
  parcelle_admin_status: { label: "Statut parcelle", icon: <Square className="h-4 w-4" /> },
};

export function ActivityHistory() {
  const { data: logs, isLoading } = useActivityLogs(100);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique d'activité
          </CardTitle>
          <CardDescription>Vos dernières actions dans l'application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique d'activité
          </CardTitle>
          <CardDescription>Vos dernières actions dans l'application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune activité enregistrée</p>
            <p className="text-sm">Vos actions apparaîtront ici</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Historique d'activité
        </CardTitle>
        <CardDescription>Vos dernières actions dans l'application</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {logs.map((log) => {
              const action = ACTION_CONFIG[log.action_type as ActionType] || ACTION_CONFIG.update;
              const entity = ENTITY_CONFIG[log.entity_type as EntityType] || ENTITY_CONFIG.property;

              return (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border">
                    {entity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-1.5 py-0 h-5 gap-1 ${action.color}`}
                      >
                        {action.icon}
                        {action.label}
                      </Badge>
                      <span className="text-sm font-medium">{entity.label}</span>
                    </div>
                    {log.entity_name && (
                      <p className="text-sm text-foreground mt-1 truncate">
                        {log.entity_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
