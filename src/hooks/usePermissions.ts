import { useCurrentUserRole, AppRole } from "./useUserRoles";

export interface Permissions {
  canCreate: boolean;
  canEdit: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  isReadOnly: boolean;
  isLoading: boolean;
  role: AppRole | null;
}

const ROLE_PERMISSIONS: Record<AppRole, Omit<Permissions, "isLoading" | "role">> = {
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
    canEdit: true,
    canUpdate: true,
    canDelete: true,
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
};

export function usePermissions(): Permissions {
  const { data: userRole, isLoading } = useCurrentUserRole();

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
    };
  }

  const role = userRole?.role || "lecture_seule";
  const permissions = ROLE_PERMISSIONS[role];

  return {
    ...permissions,
    isLoading: false,
    role,
  };
}
