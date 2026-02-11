import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export interface ReservationParcelle {
  id: string;
  user_id: string;
  parcelle_id: string;
  acquereur_id: string;
  deposit_amount: number;
  payment_method: string | null;
  reservation_date: string;
  validity_days: number;
  expiry_date: string;
  notes: string | null;
  status: "active" | "cancelled" | "converted";
  converted_vente_id: string | null;
  created_at: string;
  updated_at: string;
  acquereur?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
}

export interface ReservationParcelleInsert {
  parcelle_id: string;
  acquereur_id: string;
  deposit_amount: number;
  payment_method?: string | null;
  reservation_date?: string;
  validity_days?: number;
  expiry_date: string;
  notes?: string | null;
}

export const useReservationsParcelles = (lotissementId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reservations-parcelles", lotissementId],
    queryFn: async () => {
      let query = supabase
        .from("reservations_parcelles")
        .select(`
          *,
          acquereur:acquereurs(id, name, phone, email)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (lotissementId) {
        const { data: parcelles } = await supabase
          .from("parcelles")
          .select("id")
          .eq("lotissement_id", lotissementId)
          .is("deleted_at", null);
        
        const parcelleIds = parcelles?.map(p => p.id) || [];
        if (parcelleIds.length === 0) return [];
        query = query.in("parcelle_id", parcelleIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ReservationParcelle[];
    },
    enabled: !!user,
  });
};

export const useReservationByParcelle = (parcelleId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reservations-parcelles", "parcelle", parcelleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations_parcelles")
        .select(`
          *,
          acquereur:acquereurs(id, name, phone, email)
        `)
        .eq("parcelle_id", parcelleId)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data as ReservationParcelle | null;
    },
    enabled: !!user && !!parcelleId,
  });
};

export const useCreateReservationParcelle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reservation: ReservationParcelleInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("reservations_parcelles")
        .insert({ ...reservation, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await logActivityDirect(
        user.id,
        "create",
        "reservation_parcelle",
        `Réservation parcelle`,
        data.id,
        { deposit_amount: data.deposit_amount }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateReservationParcelle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ReservationParcelleInsert> & { status?: string; converted_vente_id?: string }) => {
      const { data, error } = await supabase
        .from("reservations_parcelles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "update", "reservation_parcelle", "Réservation mise à jour", data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
