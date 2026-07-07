import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type StatutPaiement = "en_attente" | "partiellement_paye" | "paye" | "en_retard";
export type StadeTravaux =
  | "depot_garantie"
  | "fondations"
  | "hors_eau"
  | "achevement_travaux"
  | "remise_cles"
  | "autre";
export type ModePaiement = "virement" | "cheque" | "especes" | "mobile_money" | "banque";

export interface AppelDeFonds {
  id: string;
  reservation_id: string;
  numero_appel: number;
  libelle: string;
  stade_travaux: StadeTravaux;
  pourcentage_prix: number | null;
  montant_fcfa: number;
  date_appel: string;
  date_echeance: string | null;
  statut_paiement: StatutPaiement;
  montant_paye_fcfa: number;
  date_paiement: string | null;
  mode_paiement: ModePaiement | null;
  reference_paiement: string | null;
  attestation_travaux_url: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUT_PAIEMENT_LABELS: Record<StatutPaiement, string> = {
  en_attente: "En attente",
  partiellement_paye: "Partiellement payé",
  paye: "Payé",
  en_retard: "En retard",
};

export const STATUT_PAIEMENT_COLORS: Record<StatutPaiement, string> = {
  en_attente: "bg-gray-100 text-gray-600",
  partiellement_paye: "bg-orange-100 text-orange-700",
  paye: "bg-emerald-100 text-emerald-700",
  en_retard: "bg-red-100 text-red-700",
};

export const STADE_LABELS: Record<StadeTravaux, string> = {
  depot_garantie: "Dépôt de garantie",
  fondations: "Achèvement des fondations",
  hors_eau: "Mise hors d'eau",
  achevement_travaux: "Achèvement des travaux",
  remise_cles: "Remise des clés",
  autre: "Autre",
};

export const MODE_PAIEMENT_LABELS: Record<ModePaiement, string> = {
  virement: "Virement bancaire",
  cheque: "Chèque",
  especes: "Espèces",
  mobile_money: "Mobile Money",
  banque: "Banque",
};

export const useAppelsDeFonds = (reservationId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["appels-de-fonds", reservationId],
    queryFn: async (): Promise<AppelDeFonds[]> => {
      const { data, error } = await supabase
        .from("appels_de_fonds")
        .select("*")
        .eq("reservation_id", reservationId)
        .order("numero_appel");
      if (error) throw error;
      return (data || []) as AppelDeFonds[];
    },
    enabled: !!user && !!reservationId,
  });
};

export const useAllAppelsByProgramme = (programmeId: string, reservationIds: string[]) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["appels-de-fonds-programme", programmeId],
    queryFn: async () => {
      if (!reservationIds.length) return [];
      const { data, error } = await supabase
        .from("appels_de_fonds")
        .select(`
          *,
          reservation:reservations_lots(
            id,
            client:clients_acheteurs(nom, prenoms),
            lot:lots_programme(reference_lot)
          )
        `)
        .in("reservation_id", reservationIds)
        .order("date_appel");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && reservationIds.length > 0,
  });
};

export const useEnregistrerPaiement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      appelId,
      reservationId,
      montantPaye,
      mode_paiement,
      reference_paiement,
      date_paiement,
      attestation_travaux_url,
      observations,
    }: {
      appelId: string;
      reservationId: string;
      montantPaye: number;
      mode_paiement: ModePaiement;
      reference_paiement?: string;
      date_paiement: string;
      attestation_travaux_url?: string;
      observations?: string;
    }) => {
      const { data: appel } = await supabase
        .from("appels_de_fonds")
        .select("montant_fcfa, montant_paye_fcfa")
        .eq("id", appelId)
        .single();
      if (!appel) throw new Error("Appel de fonds introuvable");
      const newPaid = (appel.montant_paye_fcfa || 0) + montantPaye;
      const statut: StatutPaiement = newPaid >= appel.montant_fcfa ? "paye" : "partiellement_paye";
      const { error } = await supabase
        .from("appels_de_fonds")
        .update({
          montant_paye_fcfa: newPaid,
          statut_paiement: statut,
          mode_paiement,
          reference_paiement: reference_paiement || null,
          date_paiement,
          attestation_travaux_url: attestation_travaux_url || null,
          observations: observations || null,
        })
        .eq("id", appelId);
      if (error) throw error;
      return reservationId;
    },
    onSuccess: (reservationId) => {
      queryClient.invalidateQueries({ queryKey: ["appels-de-fonds", reservationId] });
    },
  });
};

// ── Constante VEFA — échelons légaux (fidèle au prompt) ──────────────────
export const ECHELONS_VEFA: Record<StadeTravaux, { libelle: string; pourcentage: number; ordre: number }> = {
  depot_garantie:     { libelle: "Dépôt de garantie",          pourcentage: 5,   ordre: 1 },
  fondations:         { libelle: "Achèvement des fondations",  pourcentage: 35,  ordre: 2 },
  hors_eau:           { libelle: "Mise hors d'eau",            pourcentage: 70,  ordre: 3 },
  achevement_travaux: { libelle: "Achèvement des travaux",     pourcentage: 95,  ordre: 4 },
  remise_cles:        { libelle: "Remise des clés",            pourcentage: 100, ordre: 5 },
  autre:              { libelle: "Autre",                      pourcentage: 0,   ordre: 6 },
};

// Délais en jours par stade (non standard, géré hors ECHELONS_VEFA)
const ECHELONS_VEFA_DELAIS: Record<StadeTravaux, number> = {
  depot_garantie:     0,
  fondations:         90,
  hors_eau:           180,
  achevement_travaux: 300,
  remise_cles:        365,
  autre:              0,
};

// Génère l'échéancier VEFA complet pour une réservation
export async function genererEcheancierVEFA(
  reservationId: string,
  prixVenteFcfa: number
): Promise<void> {
  const stadesOrdonnes = (Object.entries(ECHELONS_VEFA) as [StadeTravaux, typeof ECHELONS_VEFA[StadeTravaux]][])
    .filter(([stade]) => stade !== "autre")
    .sort(([, a], [, b]) => a.ordre - b.ordre);

  const today = new Date();
  let cumul = 0;
  const rows = stadesOrdonnes.map(([stade, info], i) => {
    const cible = Math.round((prixVenteFcfa * info.pourcentage) / 100);
    const montant = cible - cumul;
    cumul = cible;
    const dateAppel = new Date(today);
    dateAppel.setDate(dateAppel.getDate() + ECHELONS_VEFA_DELAIS[stade]);
    return {
      reservation_id: reservationId,
      numero_appel: i + 1,
      libelle: stade === "remise_cles" ? `${info.libelle} (solde)` : info.libelle,
      stade_travaux: stade,
      pourcentage_prix: info.pourcentage,
      montant_fcfa: montant,
      date_appel: dateAppel.toISOString().split("T")[0],
      statut_paiement: "en_attente" as StatutPaiement,
      montant_paye_fcfa: 0,
    };
  });
  const { error } = await supabase.from("appels_de_fonds").insert(rows);
  if (error) throw error;
}
