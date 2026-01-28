import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export interface LotissementDocument {
  id: string;
  user_id: string;
  lotissement_id: string;
  name: string;
  type: string;
  file_url: string | null;
  file_size: string | null;
  status: string;
  expiry_date: string | null;
  reference_number: string | null;
  issued_by: string | null;
  issued_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LotissementDocumentInsert {
  lotissement_id: string;
  name: string;
  type: string;
  file_url?: string | null;
  file_size?: string | null;
  status?: string;
  expiry_date?: string | null;
  reference_number?: string | null;
  issued_by?: string | null;
  issued_date?: string | null;
  notes?: string | null;
}

export const useLotissementDocuments = (lotissementId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lotissement-documents", lotissementId],
    queryFn: async () => {
      let query = supabase
        .from("lotissement_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (lotissementId) {
        query = query.eq("lotissement_id", lotissementId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LotissementDocument[];
    },
    enabled: !!user && !!lotissementId,
  });
};

export const useCreateLotissementDocument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (doc: LotissementDocumentInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("lotissement_documents")
        .insert({ ...doc, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await logActivityDirect(
        user.id,
        "document_uploaded",
        "lotissement_document",
        data.name,
        data.id,
        { type: data.type }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotissement-documents"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateLotissementDocument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LotissementDocument> & { id: string }) => {
      const { data, error } = await supabase
        .from("lotissement_documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "update", "lotissement_document", data.name, data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotissement-documents"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteLotissementDocument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { error } = await supabase
        .from("lotissement_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "delete", "lotissement_document", name || "Document supprimé", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotissement-documents"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
