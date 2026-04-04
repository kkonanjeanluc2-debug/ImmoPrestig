import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useTenantRequests, useCreateTenantRequest, useUpdateTenantRequest, TenantRequest } from "@/hooks/useTenantRequests";
import { Plus, MessageSquare, Clock, CheckCircle, XCircle, Loader2, AlertCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { generateWhatsAppUrl } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";

const categoryLabels: Record<string, string> = {
  maintenance: "Maintenance / Réparation",
  reclamation: "Réclamation",
  administrative: "Demande administrative",
};

const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  nouveau: { label: "Nouveau", className: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: AlertCircle },
  en_cours: { label: "En cours", className: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
  en_attente: { label: "En attente", className: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Clock },
  resolu: { label: "Résolu", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle },
  rejete: { label: "Rejeté", className: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
};

const priorityLabels: Record<string, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

interface TenantRequestsTabProps {
  tenantId: string;
  userId: string; // agency owner user_id
  propertyId?: string;
  isLocataire?: boolean;
  tenantName?: string;
}

const getAgencyNotificationConfig = async (userId: string) => {
  const { data: agencyId, error: agencyIdError } = await supabase.rpc("get_user_agency_id", {
    _user_id: userId,
  });

  if (agencyIdError) {
    throw agencyIdError;
  }

  if (!agencyId) {
    return null;
  }

  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .select("notification_email, notification_whatsapp, name, email")
    .eq("id", agencyId)
    .maybeSingle();

  if (agencyError) {
    throw agencyError;
  }

  return agency;
};

export const TenantRequestsTab = ({ tenantId, userId, propertyId, isLocataire = false, tenantName }: TenantRequestsTabProps) => {
  const { data: requests = [], isLoading } = useTenantRequests(tenantId);
  const createRequest = useCreateTenantRequest();
  const updateRequest = useUpdateTenantRequest();
  const { data: agencyNotificationConfig } = useQuery({
    queryKey: ["tenant-request-notification-config", userId],
    queryFn: () => getAgencyNotificationConfig(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TenantRequest | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("reclamation");
  const [priority, setPriority] = useState("normale");

  const sendNotifications = async (
    requestTitle: string,
    requestCategory: string,
    requestPriority: string,
    requestDescription: string,
    whatsappPopup?: Window | null,
  ) => {
    try {
      const agency = agencyNotificationConfig ?? await getAgencyNotificationConfig(userId);

      if (!agency) {
        whatsappPopup?.close();
        return;
      }

      const catLabel = categoryLabels[requestCategory] || requestCategory;
      const prioLabel = priorityLabels[requestPriority] || requestPriority;
      const displayName = tenantName || "Un locataire";

      // Send email notification
      if (agency.notification_email) {
        try {
          const { error } = await supabase.functions.invoke("send-tenant-request-notification", {
            body: {
              to: agency.notification_email,
              agencyName: agency.name,
              tenantName: displayName,
              title: requestTitle,
              category: catLabel,
              priority: prioLabel,
              description: requestDescription,
            },
          });

          if (error) {
            console.error("Erreur envoi email notification:", error);
          }
        } catch (e) {
          console.error("Erreur envoi email notification:", e);
        }
      }

      // Open WhatsApp notification
      if (agency.notification_whatsapp) {
        const message = `🔔 *Nouvelle requête locataire*\n\n👤 Locataire: ${displayName}\n📋 Catégorie: ${catLabel}\n⚡ Priorité: ${prioLabel}\n📝 Titre: ${requestTitle}${requestDescription ? `\n\nDescription: ${requestDescription}` : ""}`;
        const waUrl = generateWhatsAppUrl(agency.notification_whatsapp, message);

        if (whatsappPopup && !whatsappPopup.closed) {
          whatsappPopup.location.href = waUrl;
        } else {
          window.open(waUrl, "_blank");
        }
      } else {
        whatsappPopup?.close();
      }
    } catch (e) {
      whatsappPopup?.close();
      console.error("Erreur notifications:", e);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    const shouldPrepareWhatsAppWindow = agencyNotificationConfig === undefined || !!agencyNotificationConfig?.notification_whatsapp;
    const whatsappPopup = shouldPrepareWhatsAppWindow ? window.open("", "_blank") : null;

    try {
      await createRequest.mutateAsync({
        tenant_id: tenantId,
        user_id: userId,
        property_id: propertyId || null,
        category,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });

      // Send notifications
      await sendNotifications(title.trim(), category, priority, description.trim(), whatsappPopup);

      toast.success("Requête envoyée avec succès");
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setCategory("reclamation");
      setPriority("normale");
    } catch {
      whatsappPopup?.close();
      toast.error("Erreur lors de l'envoi de la requête");
    }
  };

  const handleRespond = async () => {
    if (!selectedRequest) return;
    try {
      await updateRequest.mutateAsync({
        id: selectedRequest.id,
        status: newStatus || selectedRequest.status,
        admin_response: adminResponse.trim() || undefined,
        responded_at: new Date().toISOString(),
      });
      toast.success("Réponse envoyée");
      setRespondDialogOpen(false);
      setSelectedRequest(null);
      setAdminResponse("");
      setNewStatus("");
    } catch {
      toast.error("Erreur lors de la réponse");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with create button for tenants */}
      {isLocataire && (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle requête
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Soumettre une requête</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">Maintenance / Réparation</SelectItem>
                      <SelectItem value="reclamation">Réclamation</SelectItem>
                      <SelectItem value="administrative">Demande administrative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basse">Basse</SelectItem>
                      <SelectItem value="normale">Normale</SelectItem>
                      <SelectItem value="haute">Haute</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Titre *</Label>
                  <Input
                    placeholder="Ex: Fuite d'eau dans la cuisine"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Décrivez votre demande en détail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={createRequest.isPending}
                >
                  {createRequest.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Envoyer la requête
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Requests list */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isLocataire ? "Aucune requête soumise" : "Aucune requête de ce locataire"}
            </p>
          </CardContent>
        </Card>
      ) : (
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
                        {request.priority !== "normale" && (
                          <Badge variant={request.priority === "urgente" ? "destructive" : "outline"} className="text-xs">
                            {priorityLabels[request.priority] || request.priority}
                          </Badge>
                        )}
                      </div>
                      {request.description && (
                        <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(request.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                      </p>
                      {request.admin_response && (
                        <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                          <p className="text-xs font-medium text-primary mb-1">Réponse de l'agence</p>
                          <p className="text-sm text-foreground">{request.admin_response}</p>
                          {request.responded_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(request.responded_at), "dd/MM/yyyy à HH:mm")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Admin respond button */}
                    {!isLocataire && request.status !== "resolu" && request.status !== "rejete" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setNewStatus(request.status);
                          setAdminResponse(request.admin_response || "");
                          setRespondDialogOpen(true);
                        }}
                      >
                        Répondre
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Admin respond dialog */}
      <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Répondre à la requête</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 pt-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{selectedRequest.title}</p>
                {selectedRequest.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedRequest.description}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nouveau">Nouveau</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="resolu">Résolu</SelectItem>
                    <SelectItem value="rejete">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Réponse</Label>
                <Textarea
                  placeholder="Votre réponse au locataire..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleRespond}
                disabled={updateRequest.isPending}
              >
                {updateRequest.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Envoyer la réponse
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
