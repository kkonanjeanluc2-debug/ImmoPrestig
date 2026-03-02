import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Acquisition {
  id: string;
  user_id: string;
  bien_id: string;
  type_acquisition: string;
  date_acquisition: string;
  valeur_estimee: number;
  status: string;
  notes: string | null;
  counterpart_name: string | null;
  counterpart_phone: string | null;
  counterpart_email: string | null;
  counterpart_address: string | null;
  date_deces: string | null;
  lien_parente: string | null;
  numero_succession: string | null;
  type_donation: string | null;
  societe_name: string | null;
  societe_siret: string | null;
  type_apport: string | null;
  bien_echange_description: string | null;
  valeur_bien_echange: number | null;
  notaire_name: string | null;
  notaire_phone: string | null;
  notaire_email: string | null;
  notaire_address: string | null;
  titre_propriete: boolean;
  pieces_identite: boolean;
  certificat_localisation: boolean;
  acte_notarie: boolean;
  attestation_fiscale: boolean;
  date_acte_signe: string | null;
  date_enregistrement: string | null;
  created_at: string;
  updated_at: string;
  biens_achat?: { title: string; address: string; city: string | null; price: number } | null;
}

export const TYPE_ACQUISITION_LABELS: Record<string, string> = {
  donation: "Donation",
  heritage: "Héritage / Succession",
  apport_societe: "Apport en société",
  echange: "Échange",
};

export const ACQUISITION_STATUS_LABELS: Record<string, string> = {
  en_cours: "En cours",
  acte_signe: "Acte signé",
  enregistre: "Enregistré",
  termine: "Terminé",
  annule: "Annulé",
};

export function useAcquisitions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["acquisitions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acquisitions")
        .select("*, biens_achat(title, address, city, price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Acquisition[];
    },
    enabled: !!user?.id,
  });
}

export interface AcquisitionInput {
  bien_id: string;
  type_acquisition: string;
  date_acquisition?: string;
  valeur_estimee?: number;
  status?: string;
  notes?: string;
  counterpart_name?: string;
  counterpart_phone?: string;
  counterpart_email?: string;
  counterpart_address?: string;
  date_deces?: string;
  lien_parente?: string;
  numero_succession?: string;
  type_donation?: string;
  societe_name?: string;
  societe_siret?: string;
  type_apport?: string;
  bien_echange_description?: string;
  valeur_bien_echange?: number;
  notaire_name?: string;
  notaire_phone?: string;
  notaire_email?: string;
  notaire_address?: string;
  titre_propriete?: boolean;
  pieces_identite?: boolean;
  certificat_localisation?: boolean;
  acte_notarie?: boolean;
  attestation_fiscale?: boolean;
  date_acte_signe?: string;
  date_enregistrement?: string;
}

export function useCreateAcquisition() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: AcquisitionInput) => {
      const { data, error } = await supabase
        .from("acquisitions")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acquisitions"] });
      queryClient.invalidateQueries({ queryKey: ["biens-achat"] });
      toast.success("Acquisition enregistrée");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateAcquisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<AcquisitionInput> & { id: string }) => {
      const { error } = await supabase.from("acquisitions").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acquisitions"] });
      toast.success("Acquisition mise à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAcquisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("acquisitions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acquisitions"] });
      toast.success("Acquisition supprimée");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
