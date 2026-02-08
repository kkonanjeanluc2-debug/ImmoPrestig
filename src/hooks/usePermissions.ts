import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserRole, AppRole } from "./useUserRoles";
import { MemberPermissions, DEFAULT_PERMISSIONS, PermissionKey } from "./useMemberPermissions";

export interface Permissions {
  canCreate: boolean;
  canEdit: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  isReadOnly: boolean;
  isLoading: boolean;
  role: AppRole | null;
  // Granular permissions
  custom: Partial<MemberPermissions> | null;
  hasPermission: (key: PermissionKey) => boolean;
}

const ROLE_PERMISSIONS: Record<AppRole, Omit<Permissions, "isLoading" | "role" | "custom" | "hasPermission">> = {
  super_admin: {
    canCreate: true,
    canEdit: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    isReadOnly: false,
  },
  admin: {
    canCreate: true,
    canEdit: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    isReadOnly: false,
  },
  gestionnaire: {
    canCreate: true,
    canEdit: false,
    canUpdate: true,
    canDelete: false,
    canManageUsers: false,
    isReadOnly: false,
  },
  lecture_seule: {
    canCreate: false,
    canEdit: false,
    canUpdate: false,
    canDelete: false,
    canManageUsers: false,
    isReadOnly: true,
  },
  locataire: {
    canCreate: false,
    canEdit: false,
    canUpdate: false,
    canDelete: false,
    canManageUsers: false,
    isReadOnly: true,
  },
};

export function usePermissions(): Permissions {
  const { user } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useCurrentUserRole();

  // Fetch custom permissions if user is a member
  const { data: customPermissions, isLoading: permLoading } = useQuery({
    queryKey: ["my-member-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First get the user's agency membership
      const { data: membership, error: membershipError } = await supabase
        .from("agency_members")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) return null;

      // Then get their custom permissions
      const { data: permissions, error: permError } = await supabase
        .from("member_permissions")
        .select("*")
        .eq("member_id", membership.id)
        .maybeSingle();

      if (permError) throw permError;

      // If no custom permissions exist, return defaults based on role
      if (!permissions) {
        return {
          ...DEFAULT_PERMISSIONS[membership.role] || DEFAULT_PERMISSIONS.lecture_seule,
          _isDefault: true,
          _role: membership.role,
        } as Partial<MemberPermissions> & { _isDefault?: boolean; _role?: string };
      }

      return { ...permissions, _role: membership.role } as MemberPermissions & { _role?: string };
    },
    enabled: !!user?.id,
  });

  const isLoading = roleLoading || permLoading;

  if (isLoading) {
    return {
      canCreate: false,
      canEdit: false,
      canUpdate: false,
      canDelete: false,
      canManageUsers: false,
      isReadOnly: true,
      isLoading: true,
      role: null,
      custom: null,
      hasPermission: () => false,
    };
  }

  const role = userRole?.role || "lecture_seule";
  const basePermissions = ROLE_PERMISSIONS[role];

  // Helper to check a specific permission
  const hasPermission = (key: PermissionKey): boolean => {
    // Super admin and admin always have all permissions
    if (role === "super_admin" || role === "admin") {
      return true;
    }

    // Agency owners have all permissions via the admin check above

    // If custom permissions exist, use them
    if (customPermissions && key in customPermissions) {
      return !!customPermissions[key];
    }

    // Fall back to default permissions for the role
    const defaults = DEFAULT_PERMISSIONS[role];
    if (defaults && key in defaults) {
      return !!defaults[key];
    }

    return false;
  };

  // Compute canCreate, canEdit, canDelete based on custom permissions if available
  // These are general flags - pages should use hasPermission for specific actions
  let canCreate = basePermissions.canCreate;
  let canEdit = basePermissions.canEdit;
  let canDelete = basePermissions.canDelete;

  // For non-admin roles, check if ANY create/edit/delete permission is enabled
  if (role !== "super_admin" && role !== "admin") {
    if (customPermissions) {
      const createKeys: PermissionKey[] = [
        "can_create_properties", "can_create_tenants", "can_create_payments",
        "can_create_owners", "can_create_contracts", "can_create_lotissements",
        "can_create_ventes", "can_create_documents"
      ];
      const editKeys: PermissionKey[] = [
        "can_edit_properties", "can_edit_tenants", "can_edit_payments",
        "can_edit_owners", "can_edit_contracts", "can_edit_lotissements",
        "can_edit_ventes"
      ];
      const deleteKeys: PermissionKey[] = [
        "can_delete_properties", "can_delete_tenants", "can_delete_payments",
        "can_delete_owners", "can_delete_contracts", "can_delete_lotissements",
        "can_delete_ventes", "can_delete_documents"
      ];

      canCreate = createKeys.some(k => customPermissions[k] === true);
      canEdit = editKeys.some(k => customPermissions[k] === true);
      canDelete = deleteKeys.some(k => customPermissions[k] === true);
    }
  }

  return {
    ...basePermissions,
    canCreate,
    canEdit,
    canDelete,
    isLoading: false,
    role,
    custom: customPermissions || null,
    hasPermission,
  };
}
