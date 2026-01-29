import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export interface EcheanceVente {
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

export interface EcheanceVenteWithDetails extends EcheanceVente {
  vente?: {
    acquereur?: {
      name: string;
      phone: string | null;
    };
    bien?: {
      title: string;
      address: string;
    };
  };
}

export const useEcheancesVentes = (venteId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["echeances-ventes", venteId],
    queryFn: async () => {
      let query = supabase
        .from("echeances_ventes")
        .select(`
          *,
          vente:ventes_immobilieres(
            acquereur:acquereurs(name, phone),
            bien:biens_vente(title, address)
          )
        `);
      
      if (venteId) {
        query = query.eq("vente_id", venteId);
      }
      
      const { data, error } = await query.order("due_date", { ascending: true });

      if (error) throw error;
      return data as EcheanceVenteWithDetails[];
    },
    enabled: !!user,
  });
};

export const useUpcomingEcheancesVentes = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["echeances-ventes", "upcoming"],
    queryFn: async () => {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { data, error } = await supabase
        .from("echeances_ventes")
        .select(`
          *,
          vente:ventes_immobilieres(
            acquereur:acquereurs(name, phone),
            bien:biens_vente(title, address)
          )
        `)
        .eq("status", "pending")
        .gte("due_date", today.toISOString().split('T')[0])
        .lte("due_date", nextMonth.toISOString().split('T')[0])
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as EcheanceVenteWithDetails[];
    },
    enabled: !!user,
  });
};

export const useOverdueEcheancesVentes = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["echeances-ventes", "overdue"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("echeances_ventes")
        .select(`
          *,
          vente:ventes_immobilieres(
            acquereur:acquereurs(name, phone),
            bien:biens_vente(title, address)
          )
        `)
        .eq("status", "pending")
        .lt("due_date", today)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as EcheanceVenteWithDetails[];
    },
    enabled: !!user,
  });
};

export const usePayEcheanceVente = () => {
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
        .from("echeances_ventes")
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
        .from("ventes_immobilieres")
        .select("paid_installments, total_installments")
        .eq("id", data.vente_id)
        .single();

      if (venteData) {
        const newPaidCount = (venteData.paid_installments || 0) + 1;
        const isComplete = newPaidCount >= (venteData.total_installments || 0);
        
        await supabase
          .from("ventes_immobilieres")
          .update({
            paid_installments: newPaidCount,
            status: isComplete ? "complete" : "en_cours",
          })
          .eq("id", data.vente_id);
      }

      if (user) {
        await logActivityDirect(
          user.id,
          "update",
          "echeance_vente",
          "Échéance payée",
          data.id,
          { amount: paid_amount, method: payment_method }
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["echeances-ventes"] });
      queryClient.invalidateQueries({ queryKey: ["ventes-immobilieres"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
