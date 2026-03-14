import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const EXPENSE_CATEGORIES = [
  { value: "salaires", label: "Salaires & charges sociales" },
  { value: "loyer_bureau", label: "Loyer du bureau" },
  { value: "electricite_eau", label: "Électricité / Eau" },
  { value: "telephone_internet", label: "Téléphone / Internet" },
  { value: "fournitures", label: "Fournitures de bureau" },
  { value: "transport", label: "Transport & déplacements" },
  { value: "publicite", label: "Publicité & marketing" },
  { value: "entretien", label: "Entretien & réparations" },
  { value: "assurance", label: "Assurances" },
  { value: "impots_taxes", label: "Impôts & taxes" },
  { value: "honoraires", label: "Honoraires (notaire, avocat...)" },
  { value: "commissions", label: "Commissions versées" },
  { value: "frais_bancaires", label: "Frais bancaires" },
  { value: "equipement", label: "Équipement & matériel" },
  { value: "formation", label: "Formation" },
  { value: "autre", label: "Autre" },
] as const;

export interface Expense {
  id: string;
  user_id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useExpenses(periodFrom?: Date, periodTo?: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["expenses", user?.id, periodFrom?.toISOString(), periodTo?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      if (periodFrom) {
        query = query.gte("expense_date", periodFrom.toISOString().split("T")[0]);
      }
      if (periodTo) {
        query = query.lte("expense_date", periodTo.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user,
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (expense: {
      category: string;
      description: string;
      amount: number;
      expense_date: string;
      payment_method?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from("expenses").insert({
        ...expense,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["comptabilite-expenses"] });
      toast.success("Dépense ajoutée");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      const { error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["comptabilite-expenses"] });
      toast.success("Dépense mise à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["comptabilite-expenses"] });
      toast.success("Dépense supprimée");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
