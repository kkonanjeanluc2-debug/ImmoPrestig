import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { logActivityDirect } from "@/lib/activityLogger";

export type Property = Tables<"properties">;
export type PropertyInsert = TablesInsert<"properties">;
export type PropertyUpdate = TablesUpdate<"properties">;

export const useProperties = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["properties", "v2", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Property[];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
  });
};

export const useProperty = (id: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["properties", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Property | null;
    },
    enabled: !!user && !!id,
  });
};

export const useCreateProperty = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (property: Omit<PropertyInsert, "user_id">) => {
      if (!user) throw new Error("User not authenticated");
      
      // Auto-assign to the creator if not explicitly set
      const insertData = {
        ...property,
        user_id: user.id,
        assigned_to: property.assigned_to ?? user.id,
      };

      const { data, error } = await supabase
        .from("properties")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await logActivityDirect(
        user.id,
        "create",
        "property",
        data.title,
        data.id,
        { address: data.address, price: data.price }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateProperty = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PropertyUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("properties")
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
          "property",
          data.title,
          data.id
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteProperty = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title?: string }) => {
      // Soft delete - just set deleted_at timestamp
      const { error } = await supabase
        .from("properties")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
        
      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "delete",
          "property",
          title || "Bien supprimé",
          id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-properties"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
