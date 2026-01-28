import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ParcelleAdminStatus {
  id: string;
  user_id: string;
  parcelle_id: string;
  status: string;
  titre_foncier_status: string;
  titre_foncier_reference: string | null;
  attestation_villageoise: boolean;
  certificat_propriete: boolean;
  bornage_effectue: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParcelleAdminStatusInsert {
  parcelle_id: string;
  status?: string;
  titre_foncier_status?: string;
  titre_foncier_reference?: string | null;
  attestation_villageoise?: boolean;
  certificat_propriete?: boolean;
  bornage_effectue?: boolean;
  notes?: string | null;
}

export const useParcelleAdminStatus = (parcelleId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["parcelle-admin-status", parcelleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelle_admin_status")
        .select("*")
        .eq("parcelle_id", parcelleId!)
        .maybeSingle();

      if (error) throw error;
      return data as ParcelleAdminStatus | null;
    },
    enabled: !!user && !!parcelleId,
  });
};

export const useParcellesAdminStatus = (parcelleIds?: string[]) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["parcelles-admin-status", parcelleIds],
    queryFn: async () => {
      if (!parcelleIds || parcelleIds.length === 0) return [];

      const { data, error } = await supabase
        .from("parcelle_admin_status")
        .select("*")
        .in("parcelle_id", parcelleIds);

      if (error) throw error;
      return data as ParcelleAdminStatus[];
    },
    enabled: !!user && !!parcelleIds && parcelleIds.length > 0,
  });
};

export const useUpsertParcelleAdminStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (status: ParcelleAdminStatusInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("parcelle_admin_status")
        .upsert({ ...status, user_id: user.id }, { onConflict: "parcelle_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelle-admin-status"] });
      queryClient.invalidateQueries({ queryKey: ["parcelles-admin-status"] });
    },
  });
};
