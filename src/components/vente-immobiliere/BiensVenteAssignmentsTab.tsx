import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Search, UserCheck, Loader2 } from "lucide-react";
import { useBiensVente, useUpdateBienVente } from "@/hooks/useBiensVente";
import { useAssignableUsers, useIsAgencyOwner } from "@/hooks/useAssignableUsers";
import { AssignUserSelect } from "@/components/assignment/AssignUserSelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


export function BiensVenteAssignmentsTab() {
  const { isOwner, isAdmin } = useIsAgencyOwner();
  const { data: biens, isLoading } = useBiensVente();
  const { data: assignableUsers } = useAssignableUsers();
  const updateBien = useUpdateBienVente();

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const canManage = isOwner || isAdmin;

  if (!canManage) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Seuls les administrateurs peuvent gérer les affectations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredBiens = biens?.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.address.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getAssigneeName = (userId: string | null | undefined) => {
    if (!userId) return "Non assigné";
    const user = assignableUsers?.find(u => u.user_id === userId);
    return user?.full_name || user?.email || "Inconnu";
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "disponible": return "secondary";
      case "reserve": return "warning";
      case "vendu": return "default";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "disponible": return "Disponible";
      case "reserve": return "Réservé";
      case "vendu": return "Vendu";
      default: return status;
    }
  };

  const sendAssignmentNotification = async (
    assigneeUserId: string,
    items: Array<{ id: string; name: string; details?: string }>
  ) => {
    try {
      await supabase.functions.invoke("send-assignment-notification", {
        body: {
          assignee_user_id: assigneeUserId,
          assignment_type: "bien_vente",
          items,
        },
      });
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  };

  const handleAssignment = async (bienId: string, assignedTo: string | null) => {
    try {
      const bien = biens?.find(b => b.id === bienId);
      await updateBien.mutateAsync({ id: bienId, assigned_to: assignedTo });
      toast.success("Affectation mise à jour");
      
      if (assignedTo && bien) {
        sendAssignmentNotification(assignedTo, [
          { id: bienId, name: bien.title, details: bien.address }
        ]);
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) {
      toast.error("Sélectionnez au moins un bien");
      return;
    }
    setIsAssigning(true);
    try {
      await Promise.all(
        selectedIds.map(id =>
          updateBien.mutateAsync({ id, assigned_to: bulkAssignee })
        )
      );
      toast.success(`${selectedIds.length} bien(s) affecté(s)`);
      
      if (bulkAssignee) {
        const assignedBiens = biens
          ?.filter(b => selectedIds.includes(b.id))
          .map(b => ({ id: b.id, name: b.title, details: b.address })) || [];
        
        sendAssignmentNotification(bulkAssignee, assignedBiens);
      }
      
      setSelectedIds([]);
      setBulkAssignee(null);
    } catch (error) {
      toast.error("Erreur lors de l'affectation");
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredBiens.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBiens.map(b => b.id));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Affectation des biens
        </CardTitle>
        <CardDescription>
          Affectez les biens à vendre aux gestionnaires de votre équipe
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un bien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedIds.length} sélectionné(s)
            </span>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-1">
              <AssignUserSelect
                value={bulkAssignee}
                onValueChange={setBulkAssignee}
                placeholder="Affecter à..."
              />
              <Button
                size="sm"
                onClick={handleBulkAssign}
                disabled={isAssigning}
                className="w-full sm:w-auto"
              >
                {isAssigning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Appliquer"
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds([])}
                className="w-full sm:w-auto"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredBiens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun bien trouvé</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {/* Select All */}
              <div className="flex items-center gap-3 p-3 border-b">
                <Checkbox
                  checked={selectedIds.length === filteredBiens.length && filteredBiens.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm font-medium">Tout sélectionner</span>
              </div>

              {filteredBiens.map((bien) => (
                <div
                  key={bien.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedIds.includes(bien.id)}
                      onCheckedChange={() => toggleSelection(bien.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{bien.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{bien.address}</p>
                      <p className="text-sm font-medium text-primary">{bien.price?.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <Badge variant={getStatusVariant(bien.status) as any} className="shrink-0">
                      {getStatusLabel(bien.status)}
                    </Badge>
                  </div>
                  <div className="sm:w-48 pl-8 sm:pl-0">
                    <AssignUserSelect
                      value={bien.assigned_to}
                      onValueChange={(value) => handleAssignment(bien.id, value)}
                      placeholder="Non assigné"
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
