import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "super_admin" | "admin" | "gestionnaire" | "lecture_seule" | "locataire";

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  role_id: string;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrateur",
  gestionnaire: "Gestionnaire",
  lecture_seule: "Lecture seule",
  locataire: "Locataire",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Accès total à toutes les agences et utilisateurs de la plateforme",
  admin: "Accès complet : peut gérer les utilisateurs, les paramètres et toutes les données",
  gestionnaire: "Peut créer, modifier et supprimer des biens, locataires et paiements",
  lecture_seule: "Peut uniquement consulter les données sans les modifier",
  locataire: "Accès limité au portail locataire pour consulter ses propres données",
};

// Get current user's role
export function useCurrentUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserRole | null;
    },
    enabled: !!user?.id,
  });
}

// Check if current user is admin
export function useIsAdmin() {
  const { data: role, isLoading } = useCurrentUserRole();
  return {
    isAdmin: role?.role === "admin",
    isLoading,
  };
}

// Get all users with their roles (admin only)
export function useAllUsersWithRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-users-roles"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name");

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = (roles || []).find((r) => r.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          email: profile.email || "",
          full_name: profile.full_name,
          role: (userRole?.role as AppRole) || "lecture_seule",
          role_id: userRole?.id || "",
        };
      });

      return usersWithRoles;
    },
    enabled: !!user?.id,
  });
}

// Update a user's role (admin only)
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
      roleId,
    }: {
      userId: string;
      role: AppRole;
      roleId?: string;
    }) => {
      if (roleId) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("id", roleId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase.from("user_roles").insert({
          user_id: userId,
          role,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
    },
  });
}
