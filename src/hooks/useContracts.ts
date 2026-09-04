import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Contract = Tables<"contracts">;
export type ContractInsert = TablesInsert<"contracts">;
export type ContractUpdate = TablesUpdate<"contracts">;

export const useContracts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contracts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          property:properties(
            *,
            owner:owners(
              id,
              name,
              email,
              phone,
              address,
              birth_date,
              birth_place,
              profession,
              cni_number,
              management_type:management_types(name, type, percentage),
              default_contract_template:contract_templates(id, name)
            )
          ),
          tenant:tenants(*),
          unit:property_units(*)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateContract = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contract: Omit<ContractInsert, "user_id">) => {
      if (!user) throw new Error("User not authenticated");

      // Check for existing active contract on same property+unit
      let query = supabase
        .from("contracts")
        .select("id, tenant:tenants(name)")
        .eq("property_id", contract.property_id)
        .eq("status", "active");

      if (contract.unit_id) {
        query = query.eq("unit_id", contract.unit_id);
      }

      const { data: existing } = await query;

      if (existing && existing.length > 0) {
        const tenantName = (existing[0] as any)?.tenant?.name || "un autre locataire";
        const msg = contract.unit_id
          ? `Cette unité est déjà occupée par ${tenantName} avec un contrat actif.`
          : `Ce bien est déjà occupé par ${tenantName} avec un contrat actif.`;
        throw new Error(msg);
      }
      
      const { data, error } = await supabase
        .from("contracts")
        .insert({ ...contract, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Reset tenant status to "actif" and restore portal access if they had an account
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("portal_user_id")
        .eq("id", contract.tenant_id)
        .single();

      const updatePayload: Record<string, any> = { status: "actif" };
      if (tenantData?.portal_user_id) {
        updatePayload.has_portal_access = true;
      }

      await supabase
        .from("tenants")
        .update(updatePayload)
        .eq("id", contract.tenant_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
};

export const useUpdateContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContractUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("contracts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
};

export const useDeleteContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
};

export const useExpireContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contractId,
      propertyId,
      unitId
    }: {
      contractId: string;
      propertyId: string;
      unitId?: string | null;
    }) => {
      // Runs server-side as a SECURITY DEFINER function so the contract, tenant,
      // and property/unit status updates all happen atomically, regardless of
      // whether the caller's role has direct RLS UPDATE rights on properties/
      // property_units (e.g. caissière/comptable can update the contract via
      // can_access_contract_via_property but not properties/property_units
      // directly — see migration 20260812120000_expire_contract_rpc.sql).
      const { error } = await supabase.rpc("expire_contract", {
        _contract_id: contractId,
        _property_id: propertyId,
        _unit_id: unitId || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["property-units"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
};
