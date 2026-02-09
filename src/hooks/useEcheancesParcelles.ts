import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export interface EcheanceParcelle {
  id: string;
  user_id: string;
  vente_id: string;
  due_date: string;
  amount: number;
  paid_date: string | null;
  paid_amount: number | null;
  status: string;
  payment_method: string | null;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EcheanceWithDetails extends EcheanceParcelle {
  vente?: {
    acquereur?: {
      name: string;
      phone: string | null;
    };
    parcelle?: {
      plot_number: string;
      lotissement?: {
        name: string;
      };
    };
  };
}

export const useEcheancesParcelles = (venteId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["echeances-parcelles", venteId],
    queryFn: async () => {
      let query = supabase
        .from("echeances_parcelles")
        .select(`
          *,
          vente:ventes_parcelles(
            acquereur:acquereurs(name, phone),
            parcelle:parcelles(
              plot_number,
              lotissement:lotissements(name)
            )
          )
        `);
      
      if (venteId) {
        query = query.eq("vente_id", venteId);
      }
      
      const { data, error } = await query.order("due_date", { ascending: true });

      if (error) throw error;
      return data as EcheanceWithDetails[];
    },
    enabled: !!user,
  });
};

export const useEcheancesForLotissement = (lotissementId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["echeances-parcelles", "lotissement", lotissementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_parcelles")
        .select(`
          *,
          vente:ventes_parcelles!inner(
            parcelle:parcelles!inner(
              lotissement_id
            )
          )
        `)
        .eq("vente.parcelle.lotissement_id", lotissementId);

      if (error) throw error;
      return data as EcheanceParcelle[];
    },
    enabled: !!user && !!lotissementId,
  });
};

export const useUpcomingEcheances = (monthsAhead: number = 1) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["echeances-parcelles", "upcoming", monthsAhead],
    queryFn: async () => {
      const today = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + monthsAhead);

      const { data, error } = await supabase
        .from("echeances_parcelles")
        .select(`
          *,
          vente:ventes_parcelles(
            acquereur:acquereurs(name, phone),
            parcelle:parcelles(
              plot_number,
              lotissement:lotissements(name)
            )
          )
        `)
        .eq("status", "pending")
        .gte("due_date", today.toISOString().split('T')[0])
        .lte("due_date", endDate.toISOString().split('T')[0])
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as EcheanceWithDetails[];
    },
    enabled: !!user,
  });
};

export const useOverdueEcheances = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["echeances-parcelles", "overdue"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("echeances_parcelles")
        .select(`
          *,
          vente:ventes_parcelles(
            acquereur:acquereurs(name, phone),
            parcelle:parcelles(
              plot_number,
              lotissement:lotissements(name)
            )
          )
        `)
        .eq("status", "pending")
        .lt("due_date", today)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as EcheanceWithDetails[];
    },
    enabled: !!user,
  });
};

export const usePayEcheance = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      paid_date,
      paid_amount,
      payment_method,
      receipt_number,
    }: {
      id: string;
      paid_date: string;
      paid_amount: number;
      payment_method?: string;
      receipt_number?: string;
    }) => {
      const { data, error } = await supabase
        .from("echeances_parcelles")
        .update({
          paid_date,
          paid_amount,
          payment_method,
          receipt_number,
          status: "paid",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Update vente paid_installments
      const { data: venteData } = await supabase
        .from("ventes_parcelles")
        .select("paid_installments")
        .eq("id", data.vente_id)
        .single();

      if (venteData) {
        await supabase
          .from("ventes_parcelles")
          .update({
            paid_installments: (venteData.paid_installments || 0) + 1,
          })
          .eq("id", data.vente_id);
      }

      if (user) {
        await logActivityDirect(
          user.id,
          "update",
          "echeance_parcelle",
          "Échéance payée",
          data.id,
          { amount: paid_amount, method: payment_method }
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["echeances-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["ventes-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
