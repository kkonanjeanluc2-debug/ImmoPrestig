import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserRole, AppRole } from "./useUserRoles";
import type { SuperAdminActionType } from "./useSuperAdminAudit";

export interface AgencyStats {
  properties_count: number;
  tenants_count: number;
  owners_count: number;
  lotissements_count: number;
  biens_vente_count: number;
  ventes_immobilieres_count: number;
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
        .select("user_id")
        .is("deleted_at", null);

      if (propertiesError) throw propertiesError;

      // Get all tenants for stats
      const { data: tenants, error: tenantsError } = await supabase
        .from("tenants")
        .select("user_id")
        .is("deleted_at", null);

      if (tenantsError) throw tenantsError;

      // Get all owners for stats
      const { data: owners, error: ownersError } = await supabase
        .from("owners")
        .select("user_id")
        .is("deleted_at", null);

      if (ownersError) throw ownersError;

      // Get all lotissements for stats
      const { data: lotissements, error: lotissementsError } = await supabase
        .from("lotissements")
        .select("user_id")
        .is("deleted_at", null);

      if (lotissementsError) throw lotissementsError;

      // Get all biens_vente for stats
      const { data: biensVente, error: biensVenteError } = await supabase
        .from("biens_vente")
        .select("user_id")
        .is("deleted_at", null);

      if (biensVenteError) throw biensVenteError;

      // Get all ventes_immobilieres for stats (including down_payment)
      const { data: ventesImmobilieres, error: ventesImmobilieresError } = await supabase
        .from("ventes_immobilieres")
        .select("user_id, total_price, status, down_payment");

      if (ventesImmobilieresError) throw ventesImmobilieresError;

      // Get all echeances_ventes for revenue calculation
      const { data: echeancesVentes, error: echeancesVentesError } = await supabase
        .from("echeances_ventes")
        .select("user_id, paid_amount, status");

      if (echeancesVentesError) throw echeancesVentesError;

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
          const agencyOwners = (owners || []).filter(o => o.user_id === agency.user_id);
          const agencyLotissements = (lotissements || []).filter(l => l.user_id === agency.user_id);
          const agencyBiensVente = (biensVente || []).filter(b => b.user_id === agency.user_id);
          const agencyVentesImmo = (ventesImmobilieres || []).filter(v => v.user_id === agency.user_id);
          const agencyEcheancesVentes = (echeancesVentes || []).filter(e => e.user_id === agency.user_id);
          const agencyPayments = (payments || []).filter(p => p.user_id === agency.user_id);
          
          // Calculate revenue: paid rent payments + down payments + paid sale installments
          const paidPayments = agencyPayments.filter(p => p.status === 'paid');
          const paidEcheancesVentes = agencyEcheancesVentes.filter(e => e.status === 'paid');
          const rentRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
          const downPaymentsRevenue = agencyVentesImmo.reduce((sum, v) => sum + Number(v.down_payment || 0), 0);
          const echeancesRevenue = paidEcheancesVentes.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0);
          const totalRevenue = rentRevenue + downPaymentsRevenue + echeancesRevenue;

          return {
            ...agency,
            profile: profile
              ? { full_name: profile.full_name, email: profile.email }
              : undefined,
            role: userRole?.role as AppRole | undefined,
            stats: {
              properties_count: agencyProperties.length,
              tenants_count: agencyTenants.length,
              owners_count: agencyOwners.length,
              lotissements_count: agencyLotissements.length,
              biens_vente_count: agencyBiensVente.length,
              ventes_immobilieres_count: agencyVentesImmo.length,
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

// Delete agency (super admin only) - logs audit via onSuccess callback
export function useDeleteAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, agencyData, logAudit }: { 
      id: string; 
      agencyData?: { name: string; email: string; user_id: string };
      logAudit?: (action: SuperAdminActionType, targetUserId?: string, targetAgencyId?: string, details?: Record<string, any>) => Promise<void>;
    }) => {
      const { error } = await supabase.from("agencies").delete().eq("id", id);
      if (error) throw error;
      
      // Log audit after successful deletion
      if (logAudit && agencyData) {
        await logAudit('account_deleted', agencyData.user_id, id, {
          agency_name: agencyData.name,
          target_email: agencyData.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-agencies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-audit-logs"] });
    },
  });
}

// Update user role (super admin only) - logs audit via callback
export function useSuperAdminUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
      oldRole,
      agencyData,
      logAudit,
    }: {
      userId: string;
      role: AppRole;
      oldRole?: AppRole;
      agencyData?: { id: string; name: string; email: string };
      logAudit?: (action: SuperAdminActionType, targetUserId?: string, targetAgencyId?: string, details?: Record<string, any>) => Promise<void>;
    }) => {
      // Check if user has a role
      const { data: existingRole, error: fetchError } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const previousRole = existingRole?.role || oldRole;

      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({
          user_id: userId,
          role,
        });

        if (error) throw error;
      }

      // Log audit after successful update
      if (logAudit && agencyData) {
        await logAudit('role_updated', userId, agencyData.id, {
          agency_name: agencyData.name,
          target_email: agencyData.email,
          old_role: previousRole || 'aucun',
          new_role: role,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-agencies"] });
      queryClient.invalidateQueries({ queryKey: ["all-users-roles"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-audit-logs"] });
    },
  });
}

// Toggle account activation (super admin only) - logs audit via callback
export function useToggleAccountStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      is_active,
      agencyData,
      logAudit,
    }: {
      id: string;
      is_active: boolean;
      agencyData?: { user_id: string; name: string; email: string };
      logAudit?: (action: SuperAdminActionType, targetUserId?: string, targetAgencyId?: string, details?: Record<string, any>) => Promise<void>;
    }) => {
      const { error } = await supabase
        .from("agencies")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;

      // Log audit after successful toggle
      if (logAudit && agencyData) {
        await logAudit(
          is_active ? 'account_activated' : 'account_deactivated',
          agencyData.user_id,
          id,
          {
            agency_name: agencyData.name,
            target_email: agencyData.email,
          }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-agencies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-audit-logs"] });
    },
  });
}
