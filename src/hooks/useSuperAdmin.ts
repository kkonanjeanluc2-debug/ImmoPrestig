import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserRole, AppRole } from "./useUserRoles";

export interface AgencyStats {
  properties_count: number;
  tenants_count: number;
  payments_count: number;
  total_revenue: number;
}

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
  is_active: boolean;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
  role?: AppRole;
  stats?: AgencyStats;
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

      // Get all properties for stats
      const { data: properties, error: propertiesError } = await supabase
        .from("properties")
        .select("user_id");

      if (propertiesError) throw propertiesError;

      // Get all tenants for stats
      const { data: tenants, error: tenantsError } = await supabase
        .from("tenants")
        .select("user_id");

      if (tenantsError) throw tenantsError;

      // Get all payments for stats
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("user_id, amount, status");

      if (paymentsError) throw paymentsError;

      // Combine data with stats
      const agenciesWithProfiles: AgencyWithProfile[] = (agencies || []).map(
        (agency) => {
          const profile = (profiles || []).find(
            (p) => p.user_id === agency.user_id
          );
          const userRole = (roles || []).find(
            (r) => r.user_id === agency.user_id
          );
          
          // Calculate stats for this agency
          const agencyProperties = (properties || []).filter(p => p.user_id === agency.user_id);
          const agencyTenants = (tenants || []).filter(t => t.user_id === agency.user_id);
          const agencyPayments = (payments || []).filter(p => p.user_id === agency.user_id);
          const paidPayments = agencyPayments.filter(p => p.status === 'paid');
          const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);

          return {
            ...agency,
            profile: profile
              ? { full_name: profile.full_name, email: profile.email }
              : undefined,
            role: userRole?.role as AppRole | undefined,
            stats: {
              properties_count: agencyProperties.length,
              tenants_count: agencyTenants.length,
              payments_count: agencyPayments.length,
              total_revenue: totalRevenue,
            },
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

// Toggle account activation (super admin only)
export function useToggleAccountStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from("agencies")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-agencies"] });
    },
  });
}
