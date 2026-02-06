import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ContractSignature {
  id: string;
  contract_id: string;
  signer_type: "landlord" | "tenant";
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

export interface CreateSignatureData {
  contract_id: string;
  signer_type: "landlord" | "tenant";
  signer_name: string;
  signer_email?: string;
  signature_data?: string;
  signature_text?: string;
  signature_type: "drawn" | "typed";
}

export const useContractSignatures = (contractId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contract-signatures", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_signatures")
        .select("*")
        .eq("contract_id", contractId!)
        .order("signed_at", { ascending: true });

      if (error) throw error;
      return data as ContractSignature[];
    },
    enabled: !!user && !!contractId,
  });
};

export const useCreateSignature = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateSignatureData) => {
      if (!user) throw new Error("User not authenticated");

      // Récupérer l'adresse IP et le user agent
      const userAgent = navigator.userAgent;

      const { data: signature, error } = await supabase
        .from("contract_signatures")
        .insert({
          ...data,
          user_id: user.id,
          user_agent: userAgent,
          signed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Récupérer le statut actuel du contrat pour déterminer le nouveau statut
      const { data: contractData } = await supabase
        .from("contracts")
        .select("signature_status")
        .eq("id", data.contract_id)
        .single();

      const currentStatus = contractData?.signature_status || "pending";
      let newStatus: string;

      if (data.signer_type === "landlord") {
        // Le bailleur signe
        newStatus = currentStatus === "tenant_signed" ? "fully_signed" : "landlord_signed";
      } else {
        // Le locataire signe
        newStatus = currentStatus === "landlord_signed" ? "fully_signed" : "tenant_signed";
      }
      
      await supabase
        .from("contracts")
        .update({ signature_status: newStatus })
        .eq("id", data.contract_id);

      return signature;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contract-signatures", variables.contract_id] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
};

export const useCreateTenantSignatureRequest = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      contractId,
      tenantName,
      tenantEmail,
    }: {
      contractId: string;
      tenantName: string;
      tenantEmail: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Créer un token de signature qui expire dans 7 jours
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from("contract_signatures")
        .insert({
          contract_id: contractId,
          signer_type: "tenant",
          signer_name: tenantName,
          signer_email: tenantEmail,
          signature_type: "typed", // Sera mis à jour lors de la signature
          signature_token: token,
          token_expires_at: expiresAt.toISOString(),
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, token };
    },
  });
};

export const useSignatureByToken = (token?: string) => {
  return useQuery({
    queryKey: ["signature-by-token", token],
    queryFn: async () => {
      // Use edge function for secure token-based access (no RLS bypass needed)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-signature-by-token?token=${encodeURIComponent(token!)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

export const useCompleteTenantSignature = () => {
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
      // Use edge function for secure token-based signature completion
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-tenant-signature`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
