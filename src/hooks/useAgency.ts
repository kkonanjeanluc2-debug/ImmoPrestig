import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AccountType = "agence" | "proprietaire";

// Les opérateurs de paiement supportés par KKiaPay
export type MobileMoneyProvider = "wave" | "orange_money" | "mtn_money" | "moov" | "card";

export const PAYMENT_OPERATORS = [
  { value: "wave" as const, label: "Wave", color: "bg-blue-500" },
  { value: "orange_money" as const, label: "Orange Money", color: "bg-orange-500" },
  { value: "mtn_money" as const, label: "MTN Mobile Money", color: "bg-yellow-500" },
  { value: "moov" as const, label: "Moov Money", color: "bg-cyan-500" },
  { value: "card" as const, label: "Carte bancaire", color: "bg-purple-500" },
];

export interface Agency {
  id: string;
  user_id: string;
  account_type: AccountType;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  siret: string | null;
  primary_color: string | null;
  accent_color: string | null;
  sidebar_color: string | null;
  whatsapp_property_template: string | null;
  reservation_deposit_percentage: number;
  mobile_money_number: string | null;
  mobile_money_provider: MobileMoneyProvider | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAgency() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agency", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First, check if user owns an agency
      const { data: ownedAgency, error: ownedError } = await supabase
        .from("agencies")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedError) throw ownedError;
      if (ownedAgency) return ownedAgency as Agency;

      // If not an owner, check if user is a member of an agency
      const { data: membership, error: memberError } = await supabase
        .from("agency_members")
        .select("agency_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (memberError) throw memberError;
      if (!membership) return null;

      // Fetch the agency the user is a member of
      const { data: memberAgency, error: agencyError } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", membership.agency_id)
        .maybeSingle();

      if (agencyError) throw agencyError;
      return memberAgency as Agency | null;
    },
    enabled: !!user?.id,
  });
}
