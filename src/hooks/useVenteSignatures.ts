import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface VenteSignature {
  id: string;
  vente_id: string;
  document_type: "contrat_vente" | "promesse_vente";
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

export interface CreateVenteSignatureData {
  vente_id: string;
  document_type: "contrat_vente" | "promesse_vente";
  signer_type: "vendor" | "buyer";
  signer_name: string;
  signer_email?: string;
  signature_data?: string;
  signature_text?: string;
  signature_type: "drawn" | "typed";
}

export const useVenteSignatures = (venteId?: string, documentType?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vente-signatures", venteId, documentType],
    queryFn: async () => {
      let query = supabase
        .from("vente_signatures")
        .select("*")
        .eq("vente_id", venteId!)
        .order("signed_at", { ascending: true });

      if (documentType) {
        query = query.eq("document_type", documentType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VenteSignature[];
    },
    enabled: !!user && !!venteId,
  });
};

export const useCreateVenteSignature = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateVenteSignatureData) => {
      if (!user) throw new Error("User not authenticated");

      const userAgent = navigator.userAgent;

      const { data: signature, error } = await supabase
        .from("vente_signatures")
        .insert({
          ...data,
          user_id: user.id,
          user_agent: userAgent,
          signed_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Update signature status on vente
      const { data: existingSignatures } = await supabase
        .from("vente_signatures")
        .select("signer_type, signature_data, signature_text")
        .eq("vente_id", data.vente_id)
        .eq("document_type", data.document_type);

      const hasVendor = existingSignatures?.some(
        (s: any) => s.signer_type === "vendor" && (s.signature_data || s.signature_text)
      );
      const hasBuyer = existingSignatures?.some(
        (s: any) => s.signer_type === "buyer" && (s.signature_data || s.signature_text)
      );

      // Only update overall status if both document types have full signatures
      // For now just track per-document status via the signatures themselves

      return signature;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vente-signatures", variables.vente_id] });
      queryClient.invalidateQueries({ queryKey: ["ventes-immobilieres"] });
    },
  });
};

export const useCreateBuyerSignatureRequest = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      venteId,
      documentType,
      buyerName,
      buyerEmail,
    }: {
      venteId: string;
      documentType: "contrat_vente" | "promesse_vente";
      buyerName: string;
      buyerEmail: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from("vente_signatures")
        .insert({
          vente_id: venteId,
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

export const useVenteSignatureByToken = (token?: string) => {
  return useQuery({
    queryKey: ["vente-signature-by-token", token],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-vente-signature-by-token?token=${encodeURIComponent(token!)}`,
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

export const useCompleteVenteBuyerSignature = () => {
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-vente-buyer-signature`,
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
