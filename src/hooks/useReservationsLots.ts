import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export type StatutReservation = "en_cours" | "confirmee" | "acte_signe" | "annulee" | "resiliee";
export type ModeFinancement = "comptant" | "credit_bancaire" | "echelonne_promoteur" | "mixte";

export interface ReservationLot {
  id: string;
  user_id: string;
  programme_id: string;
  lot_id: string;
  client_id: string;
  statut: StatutReservation;
  date_reservation: string;
  montant_depot_garantie_fcfa: number;
  date_versement_depot: string | null;
  depot_verse: boolean;
  compte_sequestre: string | null;
  prix_vente_fcfa: number;
  mode_financement: ModeFinancement | null;
  banque_financement: string | null;
  date_fin_retractation: string | null;
  date_signature_acte_prevue: string | null;
  date_signature_acte_effective: string | null;
  notaire_nom: string | null;
  notaire_contact: string | null;
  numero_contrat_reservation: string | null;
  numero_acte_vente: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithDetails extends ReservationLot {
  lot?: {
    id: string;
    reference_lot: string;
    prix_fcfa: number;
    type_bien: string;
    statut: string;
    superficie_m2: number | null;
  } | null;
  client?: {
    id: string;
    nom: string;
    prenoms: string;
    telephone: string;
    telephone_2: string | null;
    email: string | null;
    adresse: string | null;
    commune: string | null;
    profession: string | null;
    type_client: string;
  } | null;
  programme?: { id: string; nom: string; commune: string; ville: string } | null;
  // Relations complètes (chargées à la demande)
  appels_de_fonds?: import("./useAppelsDeFonds").AppelDeFonds[];
  documents_client?: import("./useDocumentsPromotion").DocumentClient[];
  documents_remis?: import("./useDocumentsPromotion").DocumentRemis[];
}

export const STATUT_RESERVATION_LABELS: Record<StatutReservation, string> = {
  en_cours: "En cours",
  confirmee: "Confirmée",
  acte_signe: "Acte signé",
  annulee: "Annulée",
  resiliee: "Résiliée",
};

export const STATUT_RESERVATION_COLORS: Record<StatutReservation, string> = {
  en_cours: "bg-blue-100 text-blue-700",
  confirmee: "bg-emerald-100 text-emerald-700",
  acte_signe: "bg-purple-100 text-purple-700",
  annulee: "bg-red-100 text-red-600",
  resiliee: "bg-gray-200 text-gray-600",
};

export const MODE_FINANCEMENT_LABELS: Record<ModeFinancement, string> = {
  comptant: "Comptant",
  credit_bancaire: "Crédit bancaire",
  echelonne_promoteur: "Échelonné promoteur",
  mixte: "Mixte",
};

export const useReservationsByProgramme = (programmeId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reservations-lots", programmeId],
    queryFn: async (): Promise<ReservationWithDetails[]> => {
      const { data, error } = await supabase
        .from("reservations_lots")
        .select(`
          *,
          lot:lots_programme(id, reference_lot, prix_fcfa, type_bien, statut, superficie_m2),
          client:clients_acheteurs(id, nom, prenoms, telephone, telephone_2, email, adresse, commune, profession, type_client),
          programme:programmes_immobiliers(id, nom, commune, ville)
        `)
        .eq("programme_id", programmeId)
        .order("date_reservation", { ascending: false });
      if (error) throw error;
      return (data || []) as ReservationWithDetails[];
    },
    enabled: !!user && !!programmeId,
  });
};

export const useCreateReservation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<ReservationLot, "id" | "user_id" | "created_at" | "updated_at">
    ) => {
      if (!user) throw new Error("Non authentifié");
      const dateRet = new Date(input.date_reservation);
      dateRet.setDate(dateRet.getDate() + 10);
      const { data, error } = await supabase
        .from("reservations_lots")
        .insert({
          ...input,
          user_id: user.id,
          date_fin_retractation: dateRet.toISOString().split("T")[0],
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("lots_programme").update({ statut: "reserve" }).eq("id", input.lot_id);
      await logActivityDirect(user.id, "create", "reservation_lot", `Réservation lot créée`, data.id);
      return data as ReservationLot;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["reservations-lots", res.programme_id] });
      queryClient.invalidateQueries({ queryKey: ["lots-programme", res.programme_id] });
      queryClient.invalidateQueries({ queryKey: ["programmes-immobiliers"] });
    },
  });
};

export const useUpdateReservationStatut = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      statut,
      programme_id,
      lot_id,
    }: {
      id: string;
      statut: StatutReservation;
      programme_id: string;
      lot_id: string;
    }) => {
      const { error } = await supabase
        .from("reservations_lots")
        .update({ statut })
        .eq("id", id);
      if (error) throw error;
      if (statut === "annulee" || statut === "resiliee") {
        await supabase.from("lots_programme").update({ statut: "disponible" }).eq("id", lot_id);
      }
      if (statut === "acte_signe") {
        await supabase.from("lots_programme").update({ statut: "vendu" }).eq("id", lot_id);
      }
      if (user) await logActivityDirect(user.id, "update", "reservation_lot", `Statut → ${statut}`, id);
      return programme_id;
    },
    onSuccess: (programme_id) => {
      queryClient.invalidateQueries({ queryKey: ["reservations-lots", programme_id] });
      queryClient.invalidateQueries({ queryKey: ["lots-programme", programme_id] });
      queryClient.invalidateQueries({ queryKey: ["programmes-immobiliers"] });
    },
  });
};
