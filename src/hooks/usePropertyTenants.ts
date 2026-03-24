import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PropertyTenantInfo {
  property_id: string;
  tenant_name: string;
}

export const usePropertyTenants = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property-tenants-map", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("property_id, tenant:tenants(name)")
        .eq("status", "active")
        .is("deleted_at", null);

      if (error) throw error;

      const map: Record<string, string> = {};
      for (const contract of data || []) {
        const tenantName = (contract.tenant as any)?.name;
        if (tenantName && contract.property_id) {
          map[contract.property_id] = tenantName;
        }
      }
      return map;
    },
    enabled: !!user,
  });
};

// Returns all tenants per property as an array
export const usePropertyTenantsAll = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property-tenants-all-map", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("property_id, unit_id, tenant:tenants(name), unit:property_units(unit_number)")
        .eq("status", "active")
        .is("deleted_at", null);

      if (error) throw error;

      const map: Record<string, { name: string; unit?: string; unit_id?: string }[]> = {};
      for (const contract of data || []) {
        const tenantName = (contract.tenant as any)?.name;
        const unitNumber = (contract.unit as any)?.unit_number;
        if (tenantName && contract.property_id) {
          if (!map[contract.property_id]) {
            map[contract.property_id] = [];
          }
          map[contract.property_id].push({ name: tenantName, unit: unitNumber || undefined, unit_id: contract.unit_id || undefined });
        }
      }
      return map;
    },
    enabled: !!user,
  });
};
