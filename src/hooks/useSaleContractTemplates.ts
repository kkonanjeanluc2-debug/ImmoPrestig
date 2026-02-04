import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SaleContractTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type SaleContractTemplateInsert = Omit<SaleContractTemplate, "id" | "user_id" | "created_at" | "updated_at">;
export type SaleContractTemplateUpdate = Partial<SaleContractTemplateInsert> & { id: string };

export const useSaleContractTemplates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sale-contract-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_contract_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as SaleContractTemplate[];
    },
    enabled: !!user,
  });
};

export const useDefaultSaleContractTemplate = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sale-contract-template-default", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_contract_templates" as any)
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as SaleContractTemplate | null;
    },
    enabled: !!user,
  });
};

export const useCreateSaleContractTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: SaleContractTemplateInsert) => {
      if (!user) throw new Error("User not authenticated");

      // If this template is set as default, unset others first
      if (template.is_default) {
        await supabase
          .from("sale_contract_templates" as any)
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const { data, error } = await supabase
        .from("sale_contract_templates" as any)
        .insert({ ...template, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SaleContractTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale-contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["sale-contract-template-default"] });
    },
  });
};

export const useUpdateSaleContractTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SaleContractTemplateUpdate) => {
      if (!user) throw new Error("User not authenticated");

      // If this template is set as default, unset others first
      if (updates.is_default) {
        await supabase
          .from("sale_contract_templates" as any)
          .update({ is_default: false })
          .eq("user_id", user.id)
          .neq("id", id);
      }

      const { data, error } = await supabase
        .from("sale_contract_templates" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SaleContractTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale-contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["sale-contract-template-default"] });
    },
  });
};

export const useDeleteSaleContractTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sale_contract_templates" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale-contract-templates"] });
      queryClient.invalidateQueries({ queryKey: ["sale-contract-template-default"] });
    },
  });
};
