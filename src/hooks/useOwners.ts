import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Owner = Tables<"owners">;
export type OwnerInsert = TablesInsert<"owners">;
export type OwnerUpdate = TablesUpdate<"owners">;

export const useOwners = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["owners", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Owner[];
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
    },
  });
};

export const useUpdateOwner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: OwnerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("owners")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
    },
  });
};

export const useDeleteOwner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("owners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
    },
  });
};
