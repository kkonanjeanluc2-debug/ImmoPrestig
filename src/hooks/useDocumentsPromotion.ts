import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────

export type TypeDocumentClient =
  | "cni" | "passeport" | "justificatif_domicile" | "bulletins_salaire"
  | "releves_bancaires" | "contrat_travail" | "attestation_employeur"
  | "rccm" | "statuts_entreprise" | "autre";

export type TypeDocumentRemis =
  | "contrat_reservation" | "acte_vente_notarie" | "reglement_copropriete"
  | "notice_descriptive" | "plan_lot" | "attestation_gfa" | "appel_de_fonds"
  | "recu_paiement" | "pv_remise_cles" | "titre_propriete" | "certificat_acd" | "autre";

export type TypeVisite = "commerciale" | "cloison" | "pre_livraison" | "livraison" | "autre";

export interface DocumentClient {
  id: string;
  reservation_id: string;
  type_document: TypeDocumentClient;
  nom_document: string;
  fichier_url: string | null;
  date_reception: string;
  valide: boolean;
  observations: string | null;
  created_at: string;
}

export interface DocumentRemis {
  id: string;
  reservation_id: string;
  type_document: TypeDocumentRemis;
  nom_document: string;
  fichier_url: string | null;
  date_remise: string;
  signe_client: boolean;
  date_signature: string | null;
  observations: string | null;
  created_at: string;
}

// Alias fidèle au prompt
export type DocumentRemisClient = DocumentRemis;

export interface VisiteChantier {
  id: string;
  programme_id: string;
  reservation_id: string | null;
  type_visite: TypeVisite | null;
  date_visite: string;
  observations: string | null;
  created_at: string;
}

// ── Labels ─────────────────────────────────────────────────────────────

export const TYPE_DOC_CLIENT_LABELS: Record<TypeDocumentClient, string> = {
  cni: "Carte nationale d'identité",
  passeport: "Passeport",
  justificatif_domicile: "Justificatif de domicile",
  bulletins_salaire: "Bulletins de salaire",
  releves_bancaires: "Relevés bancaires",
  contrat_travail: "Contrat de travail",
  attestation_employeur: "Attestation employeur",
  rccm: "RCCM",
  statuts_entreprise: "Statuts de l'entreprise",
  autre: "Autre",
};

export const TYPE_DOC_REMIS_LABELS: Record<TypeDocumentRemis, string> = {
  contrat_reservation: "Contrat de réservation",
  acte_vente_notarie: "Acte de vente notarié",
  reglement_copropriete: "Règlement de copropriété",
  notice_descriptive: "Notice descriptive",
  plan_lot: "Plan du lot",
  attestation_gfa: "Attestation GFA",
  appel_de_fonds: "Appel de fonds",
  recu_paiement: "Reçu de paiement",
  pv_remise_cles: "PV de remise des clés",
  titre_propriete: "Titre de propriété",
  certificat_acd: "Certificat ACD",
  autre: "Autre",
};

export const TYPE_VISITE_LABELS: Record<TypeVisite, string> = {
  commerciale: "Visite commerciale",
  cloison: "Visite cloison",
  pre_livraison: "Pré-livraison",
  livraison: "Livraison",
  autre: "Autre",
};

// ── Hooks documents client ──────────────────────────────────────────────

export const useDocumentsClient = (reservationId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["documents-client", reservationId],
    queryFn: async (): Promise<DocumentClient[]> => {
      const { data, error } = await supabase
        .from("documents_client")
        .select("*")
        .eq("reservation_id", reservationId)
        .order("created_at");
      if (error) throw error;
      return (data || []) as DocumentClient[];
    },
    enabled: !!user && !!reservationId,
  });
};

export const useAddDocumentClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      doc: Omit<DocumentClient, "id" | "created_at">
    ): Promise<DocumentClient> => {
      const { data, error } = await supabase
        .from("documents_client")
        .insert(doc)
        .select()
        .single();
      if (error) throw error;
      return data as DocumentClient;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["documents-client", doc.reservation_id] });
    },
  });
};

export const useToggleDocumentValide = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, valide, reservationId }: { id: string; valide: boolean; reservationId: string }) => {
      const { error } = await supabase
        .from("documents_client")
        .update({ valide })
        .eq("id", id);
      if (error) throw error;
      return reservationId;
    },
    onSuccess: (reservationId) => {
      queryClient.invalidateQueries({ queryKey: ["documents-client", reservationId] });
    },
  });
};

export const useDeleteDocumentClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reservationId }: { id: string; reservationId: string }) => {
      const { error } = await supabase.from("documents_client").delete().eq("id", id);
      if (error) throw error;
      return reservationId;
    },
    onSuccess: (reservationId) => {
      queryClient.invalidateQueries({ queryKey: ["documents-client", reservationId] });
    },
  });
};

// ── Hooks documents remis ───────────────────────────────────────────────

export const useDocumentsRemis = (reservationId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["documents-remis", reservationId],
    queryFn: async (): Promise<DocumentRemis[]> => {
      const { data, error } = await supabase
        .from("documents_remis_client")
        .select("*")
        .eq("reservation_id", reservationId)
        .order("created_at");
      if (error) throw error;
      return (data || []) as DocumentRemis[];
    },
    enabled: !!user && !!reservationId,
  });
};

export const useAddDocumentRemis = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      doc: Omit<DocumentRemis, "id" | "created_at">
    ): Promise<DocumentRemis> => {
      const { data, error } = await supabase
        .from("documents_remis_client")
        .insert(doc)
        .select()
        .single();
      if (error) throw error;
      return data as DocumentRemis;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["documents-remis", doc.reservation_id] });
    },
  });
};

export const useDeleteDocumentRemis = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reservationId }: { id: string; reservationId: string }) => {
      const { error } = await supabase.from("documents_remis_client").delete().eq("id", id);
      if (error) throw error;
      return reservationId;
    },
    onSuccess: (reservationId) => {
      queryClient.invalidateQueries({ queryKey: ["documents-remis", reservationId] });
    },
  });
};

// ── Hooks visites chantier ──────────────────────────────────────────────

export const useVisitesChantier = (programmeId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["visites-chantier", programmeId],
    queryFn: async (): Promise<VisiteChantier[]> => {
      const { data, error } = await supabase
        .from("visites_chantier")
        .select("*")
        .eq("programme_id", programmeId)
        .order("date_visite", { ascending: false });
      if (error) throw error;
      return (data || []) as VisiteChantier[];
    },
    enabled: !!user && !!programmeId,
  });
};

export const useAddVisite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      visite: Omit<VisiteChantier, "id" | "created_at">
    ): Promise<VisiteChantier> => {
      const { data, error } = await supabase
        .from("visites_chantier")
        .insert(visite)
        .select()
        .single();
      if (error) throw error;
      return data as VisiteChantier;
    },
    onSuccess: (v) => {
      queryClient.invalidateQueries({ queryKey: ["visites-chantier", v.programme_id] });
    },
  });
};

export const useDeleteVisite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, programmeId }: { id: string; programmeId: string }) => {
      const { error } = await supabase.from("visites_chantier").delete().eq("id", id);
      if (error) throw error;
      return programmeId;
    },
    onSuccess: (programmeId) => {
      queryClient.invalidateQueries({ queryKey: ["visites-chantier", programmeId] });
    },
  });
};
