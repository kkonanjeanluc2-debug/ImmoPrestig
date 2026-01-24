import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { UserCheck, Users, Building2, Loader2, UserMinus } from "lucide-react";

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  entityType: "properties" | "tenants";
  onSuccess?: () => void;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  selectedIds,
  entityType,
  onSuccess,
}: BulkAssignDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { data: assignableUsers = [] } = useAssignableUsers();
  const queryClient = useQueryClient();

  const entityLabel = entityType === "properties" ? "biens" : "locataires";
  const EntityIcon = entityType === "properties" ? Building2 : Users;

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error("Veuillez sélectionner un gestionnaire");
      return;
    }

    setIsLoading(true);
    try {
      const assignValue = selectedUserId === "unassign" ? null : selectedUserId;
      
      const { error } = await supabase
        .from(entityType)
        .update({ assigned_to: assignValue })
        .in("id", selectedIds);

      if (error) throw error;

      const actionLabel = selectedUserId === "unassign" ? "désassignés" : "assignés";
      toast.success(
        `${selectedIds.length} ${entityLabel} ${actionLabel} avec succès`
      );

      queryClient.invalidateQueries({ queryKey: [entityType] });
      onSuccess?.();
      onOpenChange(false);
      setSelectedUserId("");
    } catch (error) {
      console.error("Error bulk assigning:", error);
      toast.error("Erreur lors de l'assignation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Assignation en masse
          </DialogTitle>
          <DialogDescription>
            Assignez {selectedIds.length} {entityLabel} sélectionné
            {selectedIds.length > 1 ? "s" : ""} à un gestionnaire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <EntityIcon className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">
                {selectedIds.length} {entityLabel}
              </p>
              <p className="text-sm text-muted-foreground">
                seront assignés au gestionnaire choisi
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Gestionnaire
            </label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un gestionnaire..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassign">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserMinus className="h-4 w-4" />
                    Retirer l'assignation
                  </div>
                </SelectItem>
                {assignableUsers.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {(user.full_name || user.email)
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                      <span>{user.full_name || user.email}</span>
                      {user.role === "Propriétaire" && (
                        <span className="text-xs text-muted-foreground">
                          (Propriétaire)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button onClick={handleAssign} disabled={isLoading || !selectedUserId}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assigner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
