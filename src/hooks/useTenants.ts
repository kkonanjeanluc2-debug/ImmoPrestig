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
};

export const useTenants = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenants", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          property:properties(*),
          contracts(*),
          payments(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TenantWithDetails[];
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
      // First, get the tenant to find their property_id
      const { data: tenant, error: fetchError } = await supabase
        .from("tenants")
        .select("property_id")
        .eq("id", id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const propertyId = tenant?.property_id;

      // Delete the tenant (contracts and payments will need cascade or manual deletion)
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;

      // If tenant had a property, update its status to 'disponible'
      if (propertyId) {
        const { error: updateError } = await supabase
          .from("properties")
          .update({ status: "disponible" })
          .eq("id", propertyId);
        
        if (updateError) {
          console.error("Error updating property status:", updateError);
        }
      }

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
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
