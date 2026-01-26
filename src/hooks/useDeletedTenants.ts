import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TenantWithDetails } from "./useTenants";
import { logActivityDirect } from "@/lib/activityLogger";

export const useDeletedTenants = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deleted-tenants", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          property:properties(*),
          contracts(*),
          payments(*),
          unit:property_units(id, unit_number, rooms_count, rent_amount, status)
        `)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as TenantWithDetails[];
    },
    enabled: !!user,
  });
};

export const useRestoreTenant = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { data, error } = await supabase
        .from("tenants")
        .update({ deleted_at: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      if (user) {
        await logActivityDirect(
          user.id,
          "restore",
          "tenant",
          name || data.name,
          id
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const usePermanentlyDeleteTenant = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Log activity
      if (user) {
        await logActivityDirect(
          user.id,
          "permanent_delete",
          "tenant",
          name || "Locataire supprimé définitivement",
          id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
