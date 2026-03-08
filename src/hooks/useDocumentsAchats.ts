import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DocumentAchat {
  id: string;
  user_id: string;
  bien_id: string;
  name: string;
  type: string;
  file_url: string | null;
  file_size: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const DOCUMENT_TYPES = [
  { value: "offre_achat", label: "Offre d'achat" },
  { value: "compromis_vente", label: "Compromis de vente" },
  { value: "acte_vente", label: "Acte de vente" },
  { value: "diagnostic_dpe", label: "DPE" },
  { value: "diagnostic_amiante", label: "Diagnostic amiante" },
  { value: "diagnostic_plomb", label: "Diagnostic plomb" },
  { value: "diagnostic_termites", label: "Diagnostic termites" },
  { value: "diagnostic_autre", label: "Autre diagnostic" },
  { value: "autre", label: "Autre" },
] as const;

export { DOCUMENT_TYPES };

export function useDocumentsAchats(bienId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["documents-achats", bienId],
    queryFn: async () => {
      let query = supabase
        .from("documents_achats")
        .select("*")
        .order("created_at", { ascending: false });

      if (bienId) {
        query = query.eq("bien_id", bienId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DocumentAchat[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateDocumentAchat() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      bien_id,
      name,
      type,
      notes,
      file,
    }: {
      bien_id: string;
      name: string;
      type: string;
      notes?: string;
      file?: File;
    }) => {
      if (!user) throw new Error("Non authentifié");

      let file_url: string | null = null;
      let file_size: string | null = null;

      if (file) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error("Format non supporté. Utilisez PDF, JPG, PNG ou WEBP.");
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Le fichier ne doit pas dépasser 10 Mo.");
        }

        const filePath = `${user.id}/${bien_id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("documents-achats")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Store the path, not the public URL (bucket is private)
        file_url = filePath;
        file_size = file.size >= 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo`
          : `${(file.size / 1024).toFixed(1)} Ko`;
      }

      const { data, error } = await supabase
        .from("documents_achats")
        .insert({
          user_id: user.id,
          bien_id,
          name,
          type,
          file_url,
          file_size,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-achats"] });
      toast.success("Document ajouté");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDocumentAchat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("documents_achats")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-achats"] });
      toast.success("Document supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
