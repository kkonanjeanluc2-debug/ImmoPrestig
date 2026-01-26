import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { logActivityDirect } from "@/lib/activityLogger";

export type Owner = Tables<"owners">;
export type OwnerInsert = TablesInsert<"owners">;
export type OwnerUpdate = TablesUpdate<"owners">;

export interface OwnerWithManagementType extends Owner {
  management_type?: {
    id: string;
    name: string;
    percentage: number;
    type: string;
  } | null;
}

export const useOwners = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["owners", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owners")
        .select(`
          *,
          management_type:management_types(id, name, percentage, type)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OwnerWithManagementType[];
    },
    enabled: !!user,
  });
};

export const useCreateOwner = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (owner: Omit<OwnerInsert, "user_id">) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("owners")
        .insert({ ...owner, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await logActivityDirect(
        user.id,
        "create",
        "owner",
        data.name,
        data.id,
        { email: data.email, phone: data.phone }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateOwner = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: OwnerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("owners")
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
          "owner",
          data.name,
          data.id
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteOwner = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      // Soft delete - just set deleted_at timestamp
      const { error } = await supabase
        .from("owners")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
        
      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "delete",
          "owner",
          name || "Propriétaire supprimé",
          id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-owners"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
