import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AttestationTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  district: string;
  commune: string;
  village: string;
  arrete_numero: string;
  arrete_date: string;
  lotissement_origin_name: string;
  arrete_approbation: string;
  is_default: boolean;
  banner_color_1: string | null;
  banner_color_2: string | null;
  banner_gradient: boolean;
  doc_bg_color_1: string | null;
  doc_bg_color_2: string | null;
  doc_bg_gradient: boolean;
  village_logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type AttestationTemplateInsert = Omit<AttestationTemplate, "id" | "user_id" | "created_at" | "updated_at">;

export const useAttestationTemplates = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["attestation-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attestation_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as AttestationTemplate[];
    },
    enabled: !!user,
  });
};

export const useCreateAttestationTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (template: AttestationTemplateInsert) => {
      if (!user) throw new Error("Non authentifié");
      if (template.is_default) {
        await supabase
          .from("attestation_templates" as any)
          .update({ is_default: false } as any)
          .eq("user_id", user.id);
      }
      const { data, error } = await supabase
        .from("attestation_templates" as any)
        .insert({ ...template, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AttestationTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attestation-templates"] });
    },
  });
};

export const useUpdateAttestationTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AttestationTemplateInsert> & { id: string }) => {
      if (!user) throw new Error("Non authentifié");
      if (updates.is_default) {
        await supabase
          .from("attestation_templates" as any)
          .update({ is_default: false } as any)
          .eq("user_id", user.id)
          .neq("id", id);
      }
      const { data, error } = await supabase
        .from("attestation_templates" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AttestationTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attestation-templates"] });
    },
  });
};

export const useDeleteAttestationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("attestation_templates" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attestation-templates"] });
    },
  });
};
