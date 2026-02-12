import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ReservationFormTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type ReservationFormTemplateInsert = Omit<ReservationFormTemplate, "id" | "user_id" | "created_at" | "updated_at">;
export type ReservationFormTemplateUpdate = Partial<ReservationFormTemplateInsert> & { id: string };

export const useReservationFormTemplates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reservation-form-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservation_form_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ReservationFormTemplate[];
    },
    enabled: !!user,
  });
};

export const useDefaultReservationFormTemplate = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reservation-form-template-default", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservation_form_templates" as any)
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as ReservationFormTemplate | null;
    },
    enabled: !!user,
  });
};

export const useCreateReservationFormTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: ReservationFormTemplateInsert) => {
      if (!user) throw new Error("User not authenticated");

      if (template.is_default) {
        await supabase
          .from("reservation_form_templates" as any)
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const { data, error } = await supabase
        .from("reservation_form_templates" as any)
        .insert({ ...template, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ReservationFormTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservation-form-templates"] });
      queryClient.invalidateQueries({ queryKey: ["reservation-form-template-default"] });
    },
  });
};

export const useUpdateReservationFormTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ReservationFormTemplateUpdate) => {
      if (!user) throw new Error("User not authenticated");

      if (updates.is_default) {
        await supabase
          .from("reservation_form_templates" as any)
          .update({ is_default: false })
          .eq("user_id", user.id)
          .neq("id", id);
      }

      const { data, error } = await supabase
        .from("reservation_form_templates" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ReservationFormTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservation-form-templates"] });
      queryClient.invalidateQueries({ queryKey: ["reservation-form-template-default"] });
    },
  });
};

export const useDeleteReservationFormTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reservation_form_templates" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservation-form-templates"] });
      queryClient.invalidateQueries({ queryKey: ["reservation-form-template-default"] });
    },
  });
};
