import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { logActivityDirect } from "@/lib/activityLogger";

export type Tenant = Tables<"tenants">;
export type TenantInsert = TablesInsert<"tenants">;
export type TenantUpdate = TablesUpdate<"tenants">;

export type TenantWithDetails = Tenant & {
  property?: Tables<"properties"> | null;
  contracts?: Tables<"contracts">[];
  payments?: Tables<"payments">[];
  unit?: {
    id: string;
    unit_number: string;
    rooms_count: number;
    rent_amount: number;
    status: string;
  } | null;
  has_portal_access?: boolean;
  assigned_to?: string | null;
};

export const useTenants = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenants", user?.id],
    queryFn: async () => {
      // First check if user is a gestionnaire (manager)
      const { data: membership } = await supabase
        .from("agency_members")
        .select("role")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();

      const isGestionnaire = membership?.role === "gestionnaire";

      // If gestionnaire, get properties assigned to them first
      let assignedPropertyIds: string[] = [];
      if (isGestionnaire) {
        const { data: assignedProperties } = await supabase
          .from("properties")
          .select("id")
          .eq("assigned_to", user!.id);
        
        assignedPropertyIds = (assignedProperties || []).map(p => p.id);
      }

      // Fetch tenants with details
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          property:properties(*),
          contracts(*),
          payments(*),
          unit:property_units(id, unit_number, rooms_count, rent_amount, status)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      let tenants = data as TenantWithDetails[];

      // Filter tenants for gestionnaire: only show tenants linked to their assigned properties
      if (isGestionnaire && assignedPropertyIds.length > 0) {
        tenants = tenants.filter(tenant => 
          tenant.property_id && assignedPropertyIds.includes(tenant.property_id)
        );
      } else if (isGestionnaire && assignedPropertyIds.length === 0) {
        // Gestionnaire with no assigned properties sees no tenants
        tenants = [];
      }

      return tenants;
    },
    enabled: !!user,
  });
};

export const useCreateTenant = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tenant: Omit<TenantInsert, "user_id">) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("tenants")
        .insert({ ...tenant, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await logActivityDirect(
        user.id,
        "create",
        "tenant",
        data.name,
        data.id,
        { email: data.email, phone: data.phone }
      );

      // Create notification for new tenant
      try {
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: "Nouveau locataire",
          message: `Le locataire ${data.name} a été ajouté avec succès.`,
          type: "success",
          entity_type: "tenant",
          entity_id: data.id,
        });
      } catch (err) {
        console.error("Failed to create notification:", err);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TenantUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      if (user) {
        await logActivityDirect(
          user.id,
          "update",
          "tenant",
          data.name,
          data.id
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteTenant = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      // First, get the tenant's active contract to release property/unit
      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select("id, property_id, unit_id, status")
        .eq("tenant_id", id)
        .eq("status", "active");

      if (contractsError) throw contractsError;

      // Release property/unit for each active contract
      for (const contract of contracts || []) {
        // Update contract status to terminated
        await supabase
          .from("contracts")
          .update({ status: "terminated" })
          .eq("id", contract.id);

        // If contract has a unit, release the unit
        if (contract.unit_id) {
          await supabase
            .from("property_units")
            .update({ status: "disponible" })
            .eq("id", contract.unit_id);

          // Check if there are other occupied units for this property
          const { data: occupiedUnits } = await supabase
            .from("property_units")
            .select("id")
            .eq("property_id", contract.property_id)
            .eq("status", "loué");

          // Only set property to disponible if no other units are occupied
          if (!occupiedUnits || occupiedUnits.length === 0) {
            await supabase
              .from("properties")
              .update({ status: "disponible" })
              .eq("id", contract.property_id);
          }
        } else {
          // No unit - release property directly
          await supabase
            .from("properties")
            .update({ status: "disponible" })
            .eq("id", contract.property_id);
        }
      }

      // Soft delete - set deleted_at timestamp
      const { error } = await supabase
        .from("tenants")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      // Log activity
      if (user) {
        await logActivityDirect(
          user.id,
          "delete",
          "tenant",
          name || "Locataire supprimé",
          id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["property-units"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
};
