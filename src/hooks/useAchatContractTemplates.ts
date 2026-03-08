import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AchatContractTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  template_type: "acte" | "compromis";
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type AchatContractTemplateInsert = Omit<AchatContractTemplate, "id" | "user_id" | "created_at" | "updated_at">;
export type AchatContractTemplateUpdate = Partial<AchatContractTemplateInsert> & { id: string };

export const useAchatContractTemplates = (templateType?: "acte" | "compromis") => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["achat-contract-templates", user?.id, templateType],
    queryFn: async () => {
      let query = supabase
        .from("achat_contract_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (templateType) {
        query = query.eq("template_type", templateType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AchatContractTemplate[];
    },
    enabled: !!user,
  });
};

export const useDefaultAchatContractTemplate = (templateType: "acte" | "compromis") => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["achat-contract-template-default", user?.id, templateType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achat_contract_templates" as any)
        .select("*")
        .eq("template_type", templateType)
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as AchatContractTemplate | null;
    },
    enabled: !!user,
  });
};

export const useCreateAchatContractTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: AchatContractTemplateInsert) => {
      if (!user) throw new Error("User not authenticated");

      if (template.is_default) {
        await supabase
          .from("achat_contract_templates" as any)
          .update({ is_default: false })
          .eq("user_id", user.id)
          .eq("template_type", template.template_type);
      }

      const { data, error } = await supabase
        .from("achat_contract_templates" as any)
        .insert({ ...template, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AchatContractTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achat-contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["achat-contract-template-default"] });
    },
  });
};

export const useUpdateAchatContractTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AchatContractTemplateUpdate) => {
      if (!user) throw new Error("User not authenticated");

      if (updates.is_default && updates.template_type) {
        await supabase
          .from("achat_contract_templates" as any)
          .update({ is_default: false })
          .eq("user_id", user.id)
          .eq("template_type", updates.template_type)
          .neq("id", id);
      }

      const { data, error } = await supabase
        .from("achat_contract_templates" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AchatContractTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achat-contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["achat-contract-template-default"] });
    },
  });
};

export const useDeleteAchatContractTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("achat_contract_templates" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achat-contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["achat-contract-template-default"] });
    },
  });
};
