import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AccountType = "agence" | "proprietaire";

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
  created_at: string;
  updated_at: string;
}

export function useAgency() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agency", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Agency | null;
    },
    enabled: !!user?.id,
  });
}
