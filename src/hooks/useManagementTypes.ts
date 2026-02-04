import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ManagementType {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  percentage: number;
  type: "gestion_locative" | "commission_vente";
  is_default: boolean;
  contract_template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagementTypeInput {
  name: string;
  description?: string;
  percentage: number;
  type: "gestion_locative" | "commission_vente";
  is_default?: boolean;
  contract_template_id?: string | null;
}

export function useManagementTypes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["management-types", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("management_types")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ManagementType[];
    },
    enabled: !!user,
  });
}

export function useCreateManagementType() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ManagementTypeInput) => {
      if (!user) throw new Error("Non authentifié");

      // If setting as default, unset other defaults of same type
      if (input.is_default) {
        await supabase
          .from("management_types")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .eq("type", input.type);
      }

      const { data, error } = await supabase
        .from("management_types")
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description || null,
          percentage: input.percentage,
          type: input.type,
          is_default: input.is_default || false,
          contract_template_id: input.contract_template_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["management-types"] });
      toast.success("Type de gestion créé avec succès");
    },
    onError: (error) => {
      console.error("Error creating management type:", error);
      toast.error("Erreur lors de la création du type de gestion");
    },
  });
}

export function useUpdateManagementType() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...input }: ManagementTypeInput & { id: string }) => {
      if (!user) throw new Error("Non authentifié");

      // If setting as default, unset other defaults of same type
      if (input.is_default) {
        await supabase
          .from("management_types")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .eq("type", input.type)
          .neq("id", id);
      }

      const { data, error } = await supabase
        .from("management_types")
        .update({
          name: input.name,
          description: input.description || null,
          percentage: input.percentage,
          type: input.type,
          is_default: input.is_default || false,
          contract_template_id: input.contract_template_id || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["management-types"] });
      toast.success("Type de gestion mis à jour avec succès");
    },
    onError: (error) => {
      console.error("Error updating management type:", error);
      toast.error("Erreur lors de la mise à jour du type de gestion");
    },
  });
}

export function useDeleteManagementType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("management_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["management-types"] });
      toast.success("Type de gestion supprimé avec succès");
    },
    onError: (error) => {
      console.error("Error deleting management type:", error);
      toast.error("Erreur lors de la suppression du type de gestion");
    },
  });
}
