import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ColocationContractTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type ColocationContractTemplateInsert = Omit<ColocationContractTemplate, "id" | "user_id" | "created_at" | "updated_at">;
export type ColocationContractTemplateUpdate = Partial<ColocationContractTemplateInsert> & { id: string };

export const useColocationContractTemplates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["colocation-contract-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colocation_contract_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ColocationContractTemplate[];
    },
    enabled: !!user,
  });
};

export const useDefaultColocationContractTemplate = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["colocation-contract-template-default", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colocation_contract_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data as ColocationContractTemplate | null;
    },
    enabled: !!user,
  });
};

export const useCreateColocationContractTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: ColocationContractTemplateInsert) => {
      if (!user) throw new Error("User not authenticated");

      if (template.is_default) {
        await supabase
          .from("colocation_contract_templates")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const { data, error } = await supabase
        .from("colocation_contract_templates")
        .insert({ ...template, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colocation-contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["colocation-contract-template-default"] });
    },
  });
};

export const useUpdateColocationContractTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ColocationContractTemplateUpdate) => {
      if (!user) throw new Error("User not authenticated");

      if (updates.is_default) {
        await supabase
          .from("colocation_contract_templates")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .neq("id", id);
      }

      const { data, error } = await supabase
        .from("colocation_contract_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colocation-contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["colocation-contract-template-default"] });
    },
  });
};

export const useDeleteColocationContractTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("colocation_contract_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colocation-contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["colocation-contract-template-default"] });
    },
  });
};
