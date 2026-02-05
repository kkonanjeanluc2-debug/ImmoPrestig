import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "./useSuperAdmin";

export interface PaymentProviderConfig {
  id: string;
  provider_name: string;
  display_name: string;
  is_enabled: boolean;
  is_sandbox: boolean;
  api_key_configured: boolean;
  webhook_url: string | null;
  settings: Record<string, any>;
  supported_methods: string[];
  created_at: string;
  updated_at: string;
}

// Fetch all payment provider configurations (super admin only)
export function usePaymentProviders() {
  const { isSuperAdmin } = useIsSuperAdmin();

  return useQuery({
    queryKey: ["payment-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_provider_configs")
        .select("*")
        .order("display_name");

      if (error) throw error;
      return data as PaymentProviderConfig[];
    },
    enabled: isSuperAdmin,
  });
}

// Update payment provider configuration
export function useUpdatePaymentProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<PaymentProviderConfig>;
    }) => {
      const { error } = await supabase
        .from("payment_provider_configs")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-providers"] });
    },
  });
}

// Get enabled payment providers (for checkout)
export function useEnabledPaymentProviders() {
  return useQuery({
    queryKey: ["enabled-payment-providers"],
    queryFn: async () => {
      // This query will work for authenticated users due to RLS
      // But we need a public access for checkout - we'll handle this via edge function
      const { data, error } = await supabase
        .from("payment_provider_configs")
        .select("provider_name, display_name, supported_methods, settings")
        .eq("is_enabled", true);

      if (error) {
        console.warn("Could not fetch payment providers:", error);
        // Return default providers if can't fetch
        return [
          {
            provider_name: "fedapay",
            display_name: "FedaPay",
            supported_methods: ["orange_money", "mtn_money", "wave", "moov", "card"],
            settings: {}
          },
          {
            provider_name: "pawapay",
            display_name: "PawaPay",
            supported_methods: ["mtn_money", "orange_money", "moov", "airtel"],
            settings: {}
          },
          {
            provider_name: "kkiapay",
            display_name: "KKiaPay",
            supported_methods: ["mtn_money", "orange_money", "moov", "wave", "card"],
            settings: {}
          }
        ];
      }
      return data;
    },
  });
}
