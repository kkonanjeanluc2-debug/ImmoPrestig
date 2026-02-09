import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PromesseVenteTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type PromesseVenteTemplateInsert = Omit<PromesseVenteTemplate, "id" | "user_id" | "created_at" | "updated_at">;
export type PromesseVenteTemplateUpdate = Partial<PromesseVenteTemplateInsert> & { id: string };

export const usePromesseVenteTemplates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["promesse-vente-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promesse_vente_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as PromesseVenteTemplate[];
    },
    enabled: !!user,
  });
};

export const useDefaultPromesseVenteTemplate = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["promesse-vente-template-default", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promesse_vente_templates" as any)
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as PromesseVenteTemplate | null;
    },
    enabled: !!user,
  });
};

export const useCreatePromesseVenteTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: PromesseVenteTemplateInsert) => {
      if (!user) throw new Error("User not authenticated");

      if (template.is_default) {
        await supabase
          .from("promesse_vente_templates" as any)
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const { data, error } = await supabase
        .from("promesse_vente_templates" as any)
        .insert({ ...template, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PromesseVenteTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promesse-vente-templates"] });
      queryClient.invalidateQueries({ queryKey: ["promesse-vente-template-default"] });
    },
  });
};

export const useUpdatePromesseVenteTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PromesseVenteTemplateUpdate) => {
      if (!user) throw new Error("User not authenticated");

      if (updates.is_default) {
        await supabase
          .from("promesse_vente_templates" as any)
          .update({ is_default: false })
          .eq("user_id", user.id)
          .neq("id", id);
      }

      const { data, error } = await supabase
        .from("promesse_vente_templates" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PromesseVenteTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promesse-vente-templates"] });
      queryClient.invalidateQueries({ queryKey: ["promesse-vente-template-default"] });
    },
  });
};

export const useDeletePromesseVenteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("promesse_vente_templates" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promesse-vente-templates"] });
      queryClient.invalidateQueries({ queryKey: ["promesse-vente-template-default"] });
    },
  });
};
