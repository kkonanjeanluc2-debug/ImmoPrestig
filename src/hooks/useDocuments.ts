import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Document = Tables<"documents">;
export type DocumentInsert = TablesInsert<"documents">;
export type DocumentUpdate = TablesUpdate<"documents">;

export type DocumentWithDetails = Document & {
  property?: Tables<"properties"> | null;
  tenant?: Tables<"tenants"> | null;
};

export const useDocuments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          property:properties(title),
          tenant:tenants(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DocumentWithDetails[];
    },
    enabled: !!user,
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (document: Omit<DocumentInsert, "user_id">) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("documents")
        .insert({ ...document, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};

export const useUpdateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DocumentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};
