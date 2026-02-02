import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export type PaymentType = "comptant" | "echelonne";

export interface VenteParcelle {
  id: string;
  user_id: string;
  parcelle_id: string;
  acquereur_id: string;
  sale_date: string;
  total_price: number;
  payment_type: PaymentType;
  payment_method: string | null;
  down_payment: number | null;
  monthly_payment: number | null;
  total_installments: number | null;
  paid_installments: number | null;
  status: string;
  notes: string | null;
  sold_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenteParcelleInsert {
  parcelle_id: string;
  acquereur_id: string;
  sale_date?: string;
  total_price: number;
  payment_type?: PaymentType;
  payment_method?: string | null;
  down_payment?: number | null;
  monthly_payment?: number | null;
  total_installments?: number | null;
  notes?: string | null;
  sold_by?: string | null;
}

export interface VenteParcelleUpdate extends Partial<VenteParcelleInsert> {
  id: string;
}

export interface VenteWithDetails extends VenteParcelle {
  parcelle?: {
    plot_number: string;
    area: number;
    lotissement?: {
      name: string;
    };
  };
  acquereur?: {
    name: string;
    phone: string | null;
  };
}

export const useVentesParcelles = (lotissementId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ventes-parcelles", lotissementId],
    queryFn: async () => {
      // When filtering by lotissement, use !inner join to properly filter
      if (lotissementId) {
        const { data, error } = await supabase
          .from("ventes_parcelles")
          .select(`
            *,
            parcelle:parcelles!inner(
              plot_number,
              area,
              lotissement_id,
              lotissement:lotissements(name)
            ),
            acquereur:acquereurs(name, phone)
          `)
          .eq("parcelle.lotissement_id", lotissementId)
          .order("sale_date", { ascending: false });

        if (error) throw error;
        return data as VenteWithDetails[];
      }
      
      // Without filter, get all ventes
      const { data, error } = await supabase
        .from("ventes_parcelles")
        .select(`
          *,
          parcelle:parcelles(
            plot_number,
            area,
            lotissement:lotissements(name)
          ),
          acquereur:acquereurs(name, phone)
        `)
        .order("sale_date", { ascending: false });

      if (error) throw error;
      return data as VenteWithDetails[];
    },
    enabled: !!user,
  });
};

export const useVenteParcelle = (id: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ventes-parcelles", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ventes_parcelles")
        .select(`
          *,
          parcelle:parcelles(
            plot_number,
            area,
            price,
            lotissement:lotissements(name, location)
          ),
          acquereur:acquereurs(*)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as VenteWithDetails | null;
    },
    enabled: !!user && !!id,
  });
};

export const useCreateVenteParcelle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (vente: VenteParcelleInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("ventes_parcelles")
        .insert({ ...vente, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // If payment is echelonne, create echeances
      if (vente.payment_type === "echelonne" && vente.total_installments && vente.monthly_payment) {
        const echeances = [];
        const startDate = new Date(vente.sale_date || new Date());
        
        for (let i = 0; i < vente.total_installments; i++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i + 1);
          
          echeances.push({
            user_id: user.id,
            vente_id: data.id,
            due_date: dueDate.toISOString().split('T')[0],
            amount: vente.monthly_payment,
            status: "pending",
          });
        }

        const { error: echeanceError } = await supabase
          .from("echeances_parcelles")
          .insert(echeances);

        if (echeanceError) throw echeanceError;
      }

      await logActivityDirect(
        user.id,
        "create",
        "vente_parcelle",
        `Vente parcelle`,
        data.id,
        { total_price: data.total_price, payment_type: data.payment_type }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventes-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["echeances-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateVenteParcelle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: VenteParcelleUpdate) => {
      const { data, error } = await supabase
        .from("ventes_parcelles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "update", "vente_parcelle", "Vente mise à jour", data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventes-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteVenteParcelle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ventes_parcelles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "delete", "vente_parcelle", "Vente supprimée", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventes-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["echeances-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
