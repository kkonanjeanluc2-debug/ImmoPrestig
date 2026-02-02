import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface RoomInspection {
  name: string;
  condition: 'excellent' | 'bon' | 'moyen' | 'mauvais';
  walls: string;
  floor: string;
  ceiling: string;
  windows: string;
  doors: string;
  electricity: string;
  plumbing: string;
  comments: string;
}

export interface KeyItem {
  type: string;
  quantity: number;
  description: string;
}

export interface EtatDesLieux {
  id: string;
  user_id: string;
  tenant_id: string;
  contract_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  type: 'entree' | 'sortie';
  inspection_date: string;
  general_condition: 'excellent' | 'bon' | 'moyen' | 'mauvais' | null;
  general_comments: string | null;
  rooms: RoomInspection[];
  electricity_meter: number | null;
  water_meter: number | null;
  gas_meter: number | null;
  keys_delivered: KeyItem[];
  photos: string[];
  tenant_signature: string | null;
  landlord_signature: string | null;
  tenant_signed_at: string | null;
  landlord_signed_at: string | null;
  status: 'draft' | 'signed' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface EtatDesLieuxInsert {
  tenant_id: string;
  contract_id?: string | null;
  property_id?: string | null;
  unit_id?: string | null;
  type: 'entree' | 'sortie';
  inspection_date?: string;
  general_condition?: 'excellent' | 'bon' | 'moyen' | 'mauvais' | null;
  general_comments?: string | null;
  rooms?: RoomInspection[];
  electricity_meter?: number | null;
  water_meter?: number | null;
  gas_meter?: number | null;
  keys_delivered?: KeyItem[];
  photos?: string[];
  tenant_signature?: string | null;
  landlord_signature?: string | null;
  status?: 'draft' | 'signed' | 'completed';
}

export const useEtatsDesLieux = (tenantId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["etats-des-lieux", tenantId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("etats_des_lieux")
        .select("*")
        .order("inspection_date", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        rooms: (item.rooms as unknown as RoomInspection[]) || [],
        keys_delivered: (item.keys_delivered as unknown as KeyItem[]) || [],
      })) as EtatDesLieux[];
    },
    enabled: !!user,
  });
};

export const useEtatDesLieuxById = (id: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["etat-des-lieux", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("etats_des_lieux")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        rooms: (data.rooms as unknown as RoomInspection[]) || [],
        keys_delivered: (data.keys_delivered as unknown as KeyItem[]) || [],
      } as EtatDesLieux;
    },
    enabled: !!user && !!id,
  });
};

export const useCreateEtatDesLieux = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (etat: EtatDesLieuxInsert) => {
      if (!user) throw new Error("User not authenticated");

      const insertData = {
        tenant_id: etat.tenant_id,
        contract_id: etat.contract_id,
        property_id: etat.property_id,
        unit_id: etat.unit_id,
        type: etat.type,
        inspection_date: etat.inspection_date,
        general_condition: etat.general_condition,
        general_comments: etat.general_comments,
        electricity_meter: etat.electricity_meter,
        water_meter: etat.water_meter,
        gas_meter: etat.gas_meter,
        status: etat.status,
        user_id: user.id,
        rooms: JSON.parse(JSON.stringify(etat.rooms || [])),
        keys_delivered: JSON.parse(JSON.stringify(etat.keys_delivered || [])),
      };
      
      const { data, error } = await supabase
        .from("etats_des_lieux")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etats-des-lieux"] });
      toast.success("État des lieux créé avec succès");
    },
    onError: (error) => {
      console.error("Error creating etat des lieux:", error);
      toast.error("Erreur lors de la création de l'état des lieux");
    },
  });
};

export const useUpdateEtatDesLieux = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EtatDesLieuxInsert> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.rooms) {
        updateData.rooms = updates.rooms as unknown as Record<string, unknown>[];
      }
      if (updates.keys_delivered) {
        updateData.keys_delivered = updates.keys_delivered as unknown as Record<string, unknown>[];
      }
      
      const { data, error } = await supabase
        .from("etats_des_lieux")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etats-des-lieux"] });
      queryClient.invalidateQueries({ queryKey: ["etat-des-lieux"] });
      toast.success("État des lieux mis à jour avec succès");
    },
    onError: (error) => {
      console.error("Error updating etat des lieux:", error);
      toast.error("Erreur lors de la mise à jour de l'état des lieux");
    },
  });
};

export const useDeleteEtatDesLieux = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("etats_des_lieux")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etats-des-lieux"] });
      toast.success("État des lieux supprimé avec succès");
    },
    onError: (error) => {
      console.error("Error deleting etat des lieux:", error);
      toast.error("Erreur lors de la suppression de l'état des lieux");
    },
  });
};
