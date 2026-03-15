import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EcheanceAchat {
  id: string;
  user_id: string;
  achat_id: string;
  amount: number;
  due_date: string;
  status: string;
  paid_amount: number | null;
  paid_date: string | null;
  payment_method: string | null;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
  achats_immobiliers?: { 
    sale_price: number; 
    biens_achat: { title: string; address: string } | null;
    vendeurs: { name: string; phone: string | null; address: string | null; cni_number: string | null; email?: string | null } | null;
    acquereurs: { name: string; phone: string | null; address: string | null; cni_number: string | null; email?: string | null } | null;
  } | null;
}

const ECHEANCES_ACHATS_SELECT = "*, achats_immobiliers(sale_price, biens_achat(title, address), vendeurs(name, phone, address, cni_number, email), acquereurs(name, phone, address, cni_number, email))";

export function useEcheancesAchats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["echeances-achats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_achats")
        .select(ECHEANCES_ACHATS_SELECT)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as EcheanceAchat[];
    },
    enabled: !!user?.id,
  });
}

export function useUpcomingEcheancesAchats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["echeances-achats", "upcoming"],
    queryFn: async () => {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { data, error } = await supabase
        .from("echeances_achats")
        .select(ECHEANCES_ACHATS_SELECT)
        .eq("status", "en_attente")
        .gte("due_date", today.toISOString().split("T")[0])
        .lte("due_date", nextMonth.toISOString().split("T")[0])
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as EcheanceAchat[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useOverdueEcheancesAchats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["echeances-achats", "overdue"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("echeances_achats")
        .select(ECHEANCES_ACHATS_SELECT)
        .eq("status", "en_attente")
        .lt("due_date", today)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as EcheanceAchat[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function usePayEcheanceAchat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paid_amount, payment_method }: { id: string; paid_amount: number; payment_method: string }) => {
      const { error } = await supabase
        .from("echeances_achats")
        .update({ 
          status: "paye", 
          paid_amount, 
          paid_date: new Date().toISOString().split("T")[0],
          payment_method 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["echeances-achats"] });
      queryClient.invalidateQueries({ queryKey: ["comptabilite-achats"] });
      queryClient.invalidateQueries({ queryKey: ["comptabilite-achats-immo"] });
      toast.success("Échéance payée");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
