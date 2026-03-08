import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AchatSignature {
  id: string;
  achat_id: string;
  document_type: "acte_achat" | "compromis_achat";
  signer_type: "vendor" | "buyer";
  signer_name: string;
  signer_email?: string;
  signature_data?: string;
  signature_text?: string;
  signature_type: "drawn" | "typed";
  signed_at: string;
  ip_address?: string;
  user_agent?: string;
  signature_token?: string;
  token_expires_at?: string;
  user_id: string;
  created_at: string;
}

export interface CreateAchatSignatureData {
  achat_id: string;
  document_type: "acte_achat" | "compromis_achat";
  signer_type: "vendor" | "buyer";
  signer_name: string;
  signer_email?: string;
  signature_data?: string;
  signature_text?: string;
  signature_type: "drawn" | "typed";
}

export const useAchatSignatures = (achatId?: string, documentType?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["achat-signatures", achatId, documentType],
    queryFn: async () => {
      let query = supabase
        .from("achat_signatures")
        .select("*")
        .eq("achat_id", achatId!)
        .order("signed_at", { ascending: true });

      if (documentType) {
        query = query.eq("document_type", documentType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AchatSignature[];
    },
    enabled: !!user && !!achatId,
  });
};

export const useCreateAchatSignature = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateAchatSignatureData) => {
      if (!user) throw new Error("User not authenticated");

      const { data: signature, error } = await supabase
        .from("achat_signatures")
        .insert({
          ...data,
          user_id: user.id,
          user_agent: navigator.userAgent,
          signed_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;
      return signature;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["achat-signatures", variables.achat_id] });
      queryClient.invalidateQueries({ queryKey: ["achats-immobiliers"] });
    },
  });
};

export const useCreateAchatBuyerSignatureRequest = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      achatId,
      documentType,
      buyerName,
      buyerEmail,
    }: {
      achatId: string;
      documentType: "acte_achat" | "compromis_achat";
      buyerName: string;
      buyerEmail: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from("achat_signatures")
        .insert({
          achat_id: achatId,
          document_type: documentType,
          signer_type: "buyer",
          signer_name: buyerName,
          signer_email: buyerEmail,
          signature_type: "typed",
          signature_token: token,
          token_expires_at: expiresAt.toISOString(),
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return { ...data, token };
    },
  });
};

export const useAchatSignatureByToken = (token?: string) => {
  return useQuery({
    queryKey: ["achat-signature-by-token", token],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-achat-signature-by-token?token=${encodeURIComponent(token!)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la récupération de la signature");
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!token,
  });
};

export const useCompleteAchatBuyerSignature = () => {
  return useMutation({
    mutationFn: async ({
      token,
      signatureData,
      signatureText,
      signatureType,
    }: {
      token: string;
      signatureData?: string;
      signatureText?: string;
      signatureType: "drawn" | "typed";
    }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-achat-buyer-signature`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            token,
            signatureData,
            signatureText,
            signatureType,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'enregistrement de la signature");
      }

      const result = await response.json();
      return result.data;
    },
  });
};
