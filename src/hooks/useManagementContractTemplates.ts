import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ManagementContractTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type ManagementContractTemplateInsert = Omit<ManagementContractTemplate, "id" | "user_id" | "created_at" | "updated_at">;
export type ManagementContractTemplateUpdate = Partial<ManagementContractTemplateInsert> & { id: string };

export const useManagementContractTemplates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["management-contract-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("management_contract_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ManagementContractTemplate[];
    },
    enabled: !!user,
  });
};

export const useDefaultManagementContractTemplate = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["management-contract-template-default", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("management_contract_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data as ManagementContractTemplate | null;
    },
    enabled: !!user,
  });
};

export const useCreateManagementContractTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: ManagementContractTemplateInsert) => {
      if (!user) throw new Error("User not authenticated");

      if (template.is_default) {
        await supabase
          .from("management_contract_templates")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const { data, error } = await supabase
        .from("management_contract_templates")
        .insert({ ...template, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["management-contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["management-contract-template-default"] });
    },
  });
};

export const useUpdateManagementContractTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ManagementContractTemplateUpdate) => {
      if (!user) throw new Error("User not authenticated");

      if (updates.is_default) {
        await supabase
          .from("management_contract_templates")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .neq("id", id);
      }

      const { data, error } = await supabase
        .from("management_contract_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["management-contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["management-contract-template-default"] });
    },
  });
};

export const useDeleteManagementContractTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("management_contract_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["management-contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["management-contract-template-default"] });
    },
  });
};
