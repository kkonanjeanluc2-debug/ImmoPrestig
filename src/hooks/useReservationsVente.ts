import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ReservationVente {
  id: string;
  user_id: string;
  bien_id: string;
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
  // Joined data
  acquereur?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    cni_number: string | null;
    birth_date: string | null;
    birth_place: string | null;
    profession: string | null;
  };
}

export interface ReservationVenteInsert {
  bien_id: string;
  acquereur_id: string;
  deposit_amount: number;
  payment_method?: string | null;
  reservation_date?: string;
  validity_days?: number;
  expiry_date: string;
  notes?: string | null;
}

export const useReservationsVente = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reservations-vente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations_vente")
        .select(`
          *,
          acquereur:acquereurs(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ReservationVente[];
    },
    enabled: !!user,
  });
};

export const useReservationVenteByBien = (bienId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reservations-vente", "bien", bienId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations_vente")
        .select(`
          *,
          acquereur:acquereurs(*)
        `)
        .eq("bien_id", bienId)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data as ReservationVente | null;
    },
    enabled: !!user && !!bienId,
  });
};

export const useCreateReservationVente = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reservation: ReservationVenteInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("reservations_vente")
        .insert({ ...reservation, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations-vente"] });
    },
  });
};

export const useUpdateReservationVente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ReservationVenteInsert> & { status?: string; converted_vente_id?: string }) => {
      const { data, error } = await supabase
        .from("reservations_vente")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations-vente"] });
    },
  });
};
