import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, Eye, Plus, Pencil, Trash2, Check, X, CheckCircle2 } from "lucide-react";
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
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const latestPermissionsRef = useRef<Partial<MemberPermissions>>({});

  useEffect(() => {
    if (!member) return;
    const roleDefaults = DEFAULT_PERMISSIONS[member.role] || DEFAULT_PERMISSIONS.gestionnaire;
    const normalizedExisting = Array.isArray(existingPermissions)
      ? (existingPermissions[0] ?? null)
      : existingPermissions;
    const nextPermissions = normalizedExisting
      ? { ...roleDefaults, ...normalizedExisting }
      : roleDefaults;

    setPermissions(nextPermissions);
    latestPermissionsRef.current = nextPermissions;
  }, [member, existingPermissions]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const savePermissions = useCallback(async (newPerms: Partial<MemberPermissions>, feedbackKey: string) => {
    if (!member) return;
    setSavingKey(feedbackKey);
    try {
      await upsertPermissions.mutateAsync({
        memberId: member.id,
        permissions: newPerms,
      });
      setSavedKey(feedbackKey);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSavedKey(null), 1500);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la permission",
        variant: "destructive",
      });
    } finally {
      setSavingKey(null);
    }
  }, [member, upsertPermissions, toast]);

  const handlePermissionChange = (key: PermissionKey, value: boolean) => {
    setPermissions((prev) => {
      const newPerms = { ...prev, [key]: value };
      latestPermissionsRef.current = newPerms;
      void savePermissions(newPerms, key);
      return newPerms;
    });
  };

  const handleSelectAll = (groupKey: string, value: boolean) => {
    const group = PERMISSION_GROUPS[groupKey as keyof typeof PERMISSION_GROUPS];
    if (!group) return;

    setPermissions((prev) => {
      const updates: Partial<MemberPermissions> = {};
      group.permissions.forEach((perm) => { updates[perm] = value; });
      const newPerms = { ...prev, ...updates };
      latestPermissionsRef.current = newPerms;
      void savePermissions(newPerms, `group_${groupKey}`);
      return newPerms;
    });
  };

  const handleManualSave = () => {
    void savePermissions(latestPermissionsRef.current, "manual_save");
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
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions de {profileData?.full_name || "l'utilisateur"}
          </DialogTitle>
          <DialogDescription>
            Les modifications sont appliquées instantanément
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
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{group.label}</h4>
                      {savingKey === `group_${groupKey}` && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      )}
                      {savedKey === `group_${groupKey}` && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleSelectAll(groupKey, true)}
                        disabled={isGroupAllSelected(groupKey) || savingKey !== null}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Tout
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleSelectAll(groupKey, false)}
                        disabled={isGroupNoneSelected(groupKey) || savingKey !== null}
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
                          {savingKey === permKey && (
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          )}
                          {savedKey === permKey && (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                        <Switch
                          id={permKey}
                          checked={permissions[permKey] || false}
                          onCheckedChange={(checked) => handlePermissionChange(permKey, checked)}
                          disabled={savingKey !== null}
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

        <div className="flex items-center justify-end gap-2 border-t pt-4 mt-4">
          {savingKey === "manual_save" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {savedKey === "manual_save" && <CheckCircle2 className="h-4 w-4 text-primary" />}
          <Button variant="default" onClick={handleManualSave} disabled={savingKey !== null || isLoading}>
            Enregistrer
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}