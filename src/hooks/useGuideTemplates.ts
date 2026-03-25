import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GuideTemplate {
  id: string;
  user_id: string;
  name: string;
  district: string;
  commune: string;
  title_color: string;
  subtitle_color: string;
  border_color: string;
  bg_color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type GuideTemplateInsert = Omit<GuideTemplate, "id" | "user_id" | "created_at" | "updated_at">;

export const useGuideTemplates = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["guide-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as GuideTemplate[];
    },
    enabled: !!user,
  });
};

export const useCreateGuideTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (template: GuideTemplateInsert) => {
      const { data, error } = await supabase
        .from("guide_templates" as any)
        .insert({ ...template, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guide-templates"] }),
  });
};

export const useUpdateGuideTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GuideTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("guide_templates" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guide-templates"] }),
  });
};

export const useDeleteGuideTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("guide_templates" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guide-templates"] }),
  });
};
