import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserRole, AppRole } from "./useUserRoles";

export interface AgencyWithProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  account_type: "agence" | "proprietaire";
  city: string | null;
  country: string | null;
  created_at: string;
  logo_url: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
  role?: AppRole;
}

// Check if current user is super_admin
export function useIsSuperAdmin() {
  const { data: role, isLoading } = useCurrentUserRole();
  return {
    isSuperAdmin: role?.role === "super_admin",
    isLoading,
  };
}

// Get all agencies (super admin only)
export function useAllAgencies() {
  const { user } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();

  return useQuery({
    queryKey: ["all-agencies"],
    queryFn: async () => {
      // Get all agencies
      const { data: agencies, error: agenciesError } = await supabase
        .from("agencies")
        .select("*")
        .order("created_at", { ascending: false });

      if (agenciesError) throw agenciesError;

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email");

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      const agenciesWithProfiles: AgencyWithProfile[] = (agencies || []).map(
        (agency) => {
          const profile = (profiles || []).find(
            (p) => p.user_id === agency.user_id
          );
          const userRole = (roles || []).find(
            (r) => r.user_id === agency.user_id
          );
          return {
            ...agency,
            profile: profile
              ? { full_name: profile.full_name, email: profile.email }
              : undefined,
            role: userRole?.role as AppRole | undefined,
          };
        }
      );

      return agenciesWithProfiles;
    },
    enabled: !!user?.id && isSuperAdmin,
  });
}

// Update agency (super admin only)
export function useUpdateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<AgencyWithProfile>;
    }) => {
      const { error } = await supabase
        .from("agencies")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-agencies"] });
    },
  });
}

// Delete agency (super admin only)
export function useDeleteAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agencies").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-agencies"] });
    },
  });
}

// Update user role (super admin only)
export function useSuperAdminUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: AppRole;
    }) => {
      // Check if user has a role
      const { data: existingRole, error: fetchError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId);

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
      queryClient.invalidateQueries({ queryKey: ["all-agencies"] });
      queryClient.invalidateQueries({ queryKey: ["all-users-roles"] });
    },
  });
}
