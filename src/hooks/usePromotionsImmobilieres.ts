import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

// ─── Types ───────────────────────────────────────────────────────────────────

export type StatutProgramme =
  | "en_preparation"
  | "en_commercialisation"
  | "en_construction"
  | "livre"
  | "cloture";

export type StatutLot = "disponible" | "reserve" | "vendu" | "indisponible";
export type TypeProgramme = "villa" | "appartement" | "mixte" | "terrain_loti";
export type TypeBien = "villa" | "appartement" | "duplex" | "studio" | "terrain";

export interface ProgrammeImmobilier {
  id: string;
  user_id: string;
  nom: string;
  description: string | null;
  localisation: string;
  commune: string;
  ville: string;
  type_programme: TypeProgramme;
  statut: StatutProgramme;
  date_lancement: string | null;
  date_livraison_prevue: string | null;
  date_livraison_effective: string | null;
  nombre_lots_total: number;
  prix_min_fcfa: number | null;
  prix_max_fcfa: number | null;
  superficie_terrain_m2: number | null;
  numero_acd: string | null;
  numero_permis_construire: string | null;
  numero_agrement_promoteur: string | null;
  garantie_financiere_achevement: boolean;
  nom_garant: string | null;
  image_principale_url: string | null;
  images_urls: string[] | null;
  plan_masse_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgrammeWithStats extends ProgrammeImmobilier {
  nombre_lots_disponibles: number;
  nombre_lots_reserves: number;
  nombre_lots_vendus: number;
  taux_commercialisation: number;
}

export interface LotProgramme {
  id: string;
  programme_id: string;
  user_id: string;
  reference_lot: string;
  type_bien: TypeBien;
  statut: StatutLot;
  superficie_m2: number | null;
  nombre_pieces: number | null;
  etage: number | null;
  orientation: string | null;
  prix_fcfa: number;
  description: string | null;
  plan_url: string | null;
  created_at: string;
  updated_at: string;
  // Relations (optionnelles selon la requête)
  programme?: ProgrammeImmobilier;
  reservation?: { id: string; statut: string; client_id: string };
}

// ─── Labels / couleurs ───────────────────────────────────────────────────────

export const STATUT_PROGRAMME_LABELS: Record<StatutProgramme, string> = {
  en_preparation: "En préparation",
  en_commercialisation: "En commercialisation",
  en_construction: "En construction",
  livre: "Livré",
  cloture: "Clôturé",
};

export const STATUT_PROGRAMME_COLORS: Record<StatutProgramme, string> = {
  en_preparation: "bg-gray-100 text-gray-700",
  en_commercialisation: "bg-blue-100 text-blue-700",
  en_construction: "bg-orange-100 text-orange-700",
  livre: "bg-emerald-100 text-emerald-700",
  cloture: "bg-slate-100 text-slate-500",
};

export const STATUT_LOT_LABELS: Record<StatutLot, string> = {
  disponible: "Disponible",
  reserve: "Réservé",
  vendu: "Vendu",
  indisponible: "Indisponible",
};

export const STATUT_LOT_COLORS: Record<StatutLot, string> = {
  disponible: "bg-emerald-100 text-emerald-700 border-emerald-200",
  reserve: "bg-blue-100 text-blue-700 border-blue-200",
  vendu: "bg-gray-200 text-gray-600 border-gray-300",
  indisponible: "bg-red-100 text-red-600 border-red-200",
};

export const TYPE_PROGRAMME_LABELS: Record<TypeProgramme, string> = {
  villa: "Villas",
  appartement: "Appartements",
  mixte: "Mixte",
  terrain_loti: "Terrain loti",
};

export const TYPE_BIEN_LABELS: Record<TypeBien, string> = {
  villa: "Villa",
  appartement: "Appartement",
  duplex: "Duplex",
  studio: "Studio",
  terrain: "Terrain",
};

// ─── Hooks — Programmes ───────────────────────────────────────────────────────

export const useProgrammes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["programmes-immobiliers", user?.id],
    queryFn: async (): Promise<ProgrammeWithStats[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("programmes_immobiliers")
        .select("*, lots:lots_programme(id, statut)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => {
        const lots = p.lots || [];
        const vendus = lots.filter((l: any) => l.statut === "vendu").length;
        const reserves = lots.filter((l: any) => l.statut === "reserve").length;
        const disponibles = lots.filter((l: any) => l.statut === "disponible").length;
        const total = lots.length || p.nombre_lots_total || 1;
        return {
          ...p,
          nombre_lots_disponibles: disponibles,
          nombre_lots_reserves: reserves,
          nombre_lots_vendus: vendus,
          taux_commercialisation: total > 0 ? Math.round(((vendus + reserves) / total) * 100) : 0,
        };
      });
    },
    enabled: !!user,
  });
};

export const useProgramme = (id: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["programme-immobilier", id],
    queryFn: async (): Promise<ProgrammeImmobilier | null> => {
      const { data, error } = await supabase
        .from("programmes_immobiliers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as ProgrammeImmobilier | null;
    },
    enabled: !!user && !!id,
  });
};

export const useCreateProgramme = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<ProgrammeImmobilier, "id" | "user_id" | "created_at" | "updated_at">
    ) => {
      if (!user) throw new Error("Non authentifié");
      const { data, error } = await supabase
        .from("programmes_immobiliers")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      await logActivityDirect(user.id, "create", "programme_immobilier", `Programme créé : ${input.nom}`, data.id);
      return data as ProgrammeImmobilier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programmes-immobiliers"] });
    },
  });
};

export const useUpdateProgramme = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProgrammeImmobilier> & { id: string }) => {
      const { data, error } = await supabase
        .from("programmes_immobiliers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (user) await logActivityDirect(user.id, "update", "programme_immobilier", `Programme mis à jour`, id);
      return data as ProgrammeImmobilier;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["programmes-immobiliers"] });
      queryClient.invalidateQueries({ queryKey: ["programme-immobilier", id] });
    },
  });
};

export const useDeleteProgramme = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programmes_immobiliers").delete().eq("id", id);
      if (error) throw error;
      if (user) await logActivityDirect(user.id, "delete", "programme_immobilier", `Programme supprimé`, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programmes-immobiliers"] });
    },
  });
};

// ─── Hooks — Lots ─────────────────────────────────────────────────────────────

export const useLotsByProgramme = (programmeId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lots-programme", programmeId],
    queryFn: async (): Promise<LotProgramme[]> => {
      const { data, error } = await supabase
        .from("lots_programme")
        .select("*")
        .eq("programme_id", programmeId)
        .order("reference_lot");
      if (error) throw error;
      return (data || []) as LotProgramme[];
    },
    enabled: !!user && !!programmeId,
  });
};

export const useCreateLot = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<LotProgramme, "id" | "user_id" | "created_at" | "updated_at">
    ) => {
      if (!user) throw new Error("Non authentifié");
      const { data, error } = await supabase
        .from("lots_programme")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as LotProgramme;
    },
    onSuccess: (lot) => {
      queryClient.invalidateQueries({ queryKey: ["lots-programme", lot.programme_id] });
      queryClient.invalidateQueries({ queryKey: ["programmes-immobiliers"] });
    },
  });
};

export const useUpdateLot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      programme_id,
      ...updates
    }: Partial<LotProgramme> & { id: string; programme_id: string }) => {
      const { data, error } = await supabase
        .from("lots_programme")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...(data as LotProgramme), programme_id };
    },
    onSuccess: (lot) => {
      queryClient.invalidateQueries({ queryKey: ["lots-programme", lot.programme_id] });
      queryClient.invalidateQueries({ queryKey: ["programmes-immobiliers"] });
    },
  });
};

export const useDeleteLot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, programme_id }: { id: string; programme_id: string }) => {
      const { error } = await supabase.from("lots_programme").delete().eq("id", id);
      if (error) throw error;
      return programme_id;
    },
    onSuccess: (programme_id) => {
      queryClient.invalidateQueries({ queryKey: ["lots-programme", programme_id] });
      queryClient.invalidateQueries({ queryKey: ["programmes-immobiliers"] });
    },
  });
};
