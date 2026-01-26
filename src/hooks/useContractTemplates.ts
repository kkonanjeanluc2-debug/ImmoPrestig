import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ContractTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type ContractTemplateInsert = Omit<ContractTemplate, "id" | "user_id" | "created_at" | "updated_at">;
export type ContractTemplateUpdate = Partial<ContractTemplateInsert> & { id: string };

export const useContractTemplates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contract-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContractTemplate[];
    },
    enabled: !!user,
  });
};

export const useDefaultContractTemplate = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contract-template-default", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data as ContractTemplate | null;
    },
    enabled: !!user,
  });
};

export const useCreateContractTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: ContractTemplateInsert) => {
      if (!user) throw new Error("User not authenticated");

      // If this template is set as default, unset others first
      if (template.is_default) {
        await supabase
          .from("contract_templates")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const { data, error } = await supabase
        .from("contract_templates")
        .insert({ ...template, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["contract-template-default"] });
    },
  });
};

export const useUpdateContractTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContractTemplateUpdate) => {
      if (!user) throw new Error("User not authenticated");

      // If this template is set as default, unset others first
      if (updates.is_default) {
        await supabase
          .from("contract_templates")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .neq("id", id);
      }

      const { data, error } = await supabase
        .from("contract_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["contract-template-default"] });
    },
  });
};

export const useDeleteContractTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["contract-template-default"] });
    },
  });
};
