import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ReceiptTemplate {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  title: string;
  declaration_text: string;
  footer_text: string;
  signature_text: string;
  show_logo: boolean;
  show_contacts: boolean;
  show_amount_in_words: boolean;
  date_format: string;
  currency_symbol: string;
  watermark_enabled: boolean;
  watermark_type: string;
  watermark_text: string | null;
  watermark_image_url: string | null;
  watermark_opacity: number;
  watermark_angle: number;
  watermark_position: string;
  created_at: string;
  updated_at: string;
}

export type ReceiptTemplateInsert = Omit<ReceiptTemplate, "id" | "user_id" | "created_at" | "updated_at">;
export type ReceiptTemplateUpdate = Partial<ReceiptTemplateInsert>;

export function useReceiptTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["receipt-templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("receipt_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as ReceiptTemplate[];
    },
    enabled: !!user?.id,
  });
}

export function useReceiptTemplate(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["receipt-template", id],
    queryFn: async () => {
      if (!id || !user?.id) return null;
      
      const { data, error } = await supabase
        .from("receipt_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as ReceiptTemplate;
    },
    enabled: !!id && !!user?.id,
  });
}

export function useDefaultReceiptTemplate() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["receipt-template-default", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("receipt_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data as ReceiptTemplate | null;
    },
    enabled: !!user?.id,
  });
}

export function useCreateReceiptTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: ReceiptTemplateInsert) => {
      if (!user?.id) throw new Error("Non authentifié");

      // If this is the default template, unset other defaults first
      if (template.is_default) {
        await supabase
          .from("receipt_templates")
          .update({ is_default: false })
          .eq("is_default", true);
      }

      const { data, error } = await supabase
        .from("receipt_templates")
        .insert({ ...template, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as ReceiptTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-templates"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-template-default"] });
      toast.success("Modèle créé avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la création du modèle");
      console.error(error);
    },
  });
}

export function useUpdateReceiptTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...template }: ReceiptTemplateUpdate & { id: string }) => {
      if (!user?.id) throw new Error("Non authentifié");

      // If setting as default, unset other defaults first
      if (template.is_default) {
        await supabase
          .from("receipt_templates")
          .update({ is_default: false })
          .eq("is_default", true)
          .neq("id", id);
      }

      const { data, error } = await supabase
        .from("receipt_templates")
        .update(template)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as ReceiptTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-templates"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-template"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-template-default"] });
      toast.success("Modèle mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour du modèle");
      console.error(error);
    },
  });
}

export function useDeleteReceiptTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("receipt_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-templates"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-template-default"] });
      toast.success("Modèle supprimé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression du modèle");
      console.error(error);
    },
  });
}

export function useSetDefaultReceiptTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Unset all defaults first
      await supabase
        .from("receipt_templates")
        .update({ is_default: false })
        .eq("is_default", true);

      // Set the new default
      const { data, error } = await supabase
        .from("receipt_templates")
        .update({ is_default: true })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as ReceiptTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-templates"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-template-default"] });
      toast.success("Modèle par défaut mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour du modèle par défaut");
      console.error(error);
    },
  });
}
