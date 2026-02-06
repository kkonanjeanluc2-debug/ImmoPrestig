import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, Eye, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useMemberPermissions,
  useUpsertMemberPermissions,
  MemberPermissions,
  PermissionKey,
  PERMISSION_LABELS,
  PERMISSION_GROUPS,
  DEFAULT_PERMISSIONS,
} from "@/hooks/useMemberPermissions";
import { AgencyMember } from "@/hooks/useAgencyMembers";

interface EditMemberPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: AgencyMember | null;
}

const PERMISSION_ICONS: Record<string, React.ReactNode> = {
  can_view: <Eye className="h-3.5 w-3.5" />,
  can_create: <Plus className="h-3.5 w-3.5" />,
  can_edit: <Pencil className="h-3.5 w-3.5" />,
  can_delete: <Trash2 className="h-3.5 w-3.5" />,
};

function getPermissionIcon(key: string) {
  if (key.includes("view")) return PERMISSION_ICONS.can_view;
  if (key.includes("create")) return PERMISSION_ICONS.can_create;
  if (key.includes("edit")) return PERMISSION_ICONS.can_edit;
  if (key.includes("delete")) return PERMISSION_ICONS.can_delete;
  return <Shield className="h-3.5 w-3.5" />;
}

export function EditMemberPermissionsDialog({
  open,
  onOpenChange,
  member,
}: EditMemberPermissionsDialogProps) {
  const { toast } = useToast();
  const { data: existingPermissions, isLoading } = useMemberPermissions(member?.id);
  const upsertPermissions = useUpsertMemberPermissions();

  const [permissions, setPermissions] = useState<Partial<MemberPermissions>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize permissions when member or existing permissions change
  useEffect(() => {
    if (member) {
      if (existingPermissions) {
        setPermissions(existingPermissions);
      } else {
        // Use default permissions for the role
        setPermissions(DEFAULT_PERMISSIONS[member.role] || DEFAULT_PERMISSIONS.gestionnaire);
      }
      setHasChanges(false);
    }
  }, [member, existingPermissions]);

  const handlePermissionChange = (key: PermissionKey, value: boolean) => {
    setPermissions((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!member) return;

    try {
      await upsertPermissions.mutateAsync({
        memberId: member.id,
        permissions,
      });
      toast({
        title: "Permissions mises à jour",
        description: "Les permissions du membre ont été enregistrées.",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour les permissions",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (groupKey: string, value: boolean) => {
    const group = PERMISSION_GROUPS[groupKey as keyof typeof PERMISSION_GROUPS];
    if (!group) return;

    const updates: Partial<MemberPermissions> = {};
    group.permissions.forEach((perm) => {
      updates[perm] = value;
    });
    setPermissions((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const isGroupAllSelected = (groupKey: string) => {
    const group = PERMISSION_GROUPS[groupKey as keyof typeof PERMISSION_GROUPS];
    if (!group) return false;
    return group.permissions.every((perm) => permissions[perm] === true);
  };

  const isGroupNoneSelected = (groupKey: string) => {
    const group = PERMISSION_GROUPS[groupKey as keyof typeof PERMISSION_GROUPS];
    if (!group) return true;
    return group.permissions.every((perm) => permissions[perm] === false);
  };

  const profileData = member?.profile as { email?: string | null; full_name?: string | null } | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions de {profileData?.full_name || "l'utilisateur"}
          </DialogTitle>
          <DialogDescription>
            Définissez précisément ce que ce membre peut faire dans l'application
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0 pr-4 -mr-4">
            <div className="space-y-6 py-4">
              {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => (
                <div key={groupKey} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{group.label}</h4>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleSelectAll(groupKey, true)}
                        disabled={isGroupAllSelected(groupKey)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Tout
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleSelectAll(groupKey, false)}
                        disabled={isGroupNoneSelected(groupKey)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Aucun
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.permissions.map((permKey) => (
                      <div
                        key={permKey}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          permissions[permKey]
                            ? "bg-primary/5 border-primary/20"
                            : "bg-muted/30 border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={permissions[permKey] ? "text-primary" : "text-muted-foreground"}>
                            {getPermissionIcon(permKey)}
                          </span>
                          <Label
                            htmlFor={permKey}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {PERMISSION_LABELS[permKey]}
                          </Label>
                        </div>
                        <Switch
                          id={permKey}
                          checked={permissions[permKey] || false}
                          onCheckedChange={(checked) => handlePermissionChange(permKey, checked)}
                        />
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex items-center justify-between border-t pt-4 mt-4">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                Modifications non enregistrées
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={upsertPermissions.isPending || !hasChanges}
            >
              {upsertPermissions.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
