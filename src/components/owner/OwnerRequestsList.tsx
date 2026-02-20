import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOwnerTenantRequests, TenantRequest } from "@/hooks/useTenantRequests";
import { Clock, CheckCircle, XCircle, AlertCircle, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  maintenance: "Maintenance",
  reclamation: "Réclamation",
  administrative: "Administrative",
};

const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  nouveau: { label: "Nouveau", className: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: AlertCircle },
  en_cours: { label: "En cours", className: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
  en_attente: { label: "En attente", className: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Clock },
  resolu: { label: "Résolu", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle },
  rejete: { label: "Rejeté", className: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
};

interface OwnerRequestsListProps {
  tenantIds: string[];
  tenants: Array<{ id: string; name: string }>;
}

export const OwnerRequestsList = ({ tenantIds, tenants }: OwnerRequestsListProps) => {
  const { data: requests = [], isLoading } = useOwnerTenantRequests(tenantIds);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune requête des locataires</p>
        </CardContent>
      </Card>
    );
  }

  const getTenantName = (tenantId: string) => {
    return tenants.find(t => t.id === tenantId)?.name || "Locataire inconnu";
  };

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const status = statusConfig[request.status] || statusConfig.nouveau;
        const StatusIcon = status.icon;
        return (
          <Card key={request.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-medium text-foreground">{request.title}</h4>
                    <Badge variant="outline" className={cn("text-xs", status.className)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {categoryLabels[request.category] || request.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    De: <span className="font-medium text-foreground">{getTenantName(request.tenant_id)}</span>
                    {" • "}
                    {format(new Date(request.created_at), "dd MMM yyyy", { locale: fr })}
                  </p>
                  {request.description && (
                    <p className="text-sm text-muted-foreground mt-2">{request.description}</p>
                  )}
                  {request.admin_response && (
                    <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-xs text-primary font-medium">Réponse envoyée</p>
                      <p className="text-sm">{request.admin_response}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
