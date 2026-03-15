import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// SYSCOHADA Plan Comptable - Classes 6 (Charges) mapped to expense categories
export const EXPENSE_CATEGORIES = [
  // Classe 61 - Transports
  { value: "transport", label: "Transport & déplacements", syscohada: "61", classe: "Services extérieurs" },
  // Classe 62 - Services extérieurs
  { value: "loyer_bureau", label: "Loyer du bureau", syscohada: "622", classe: "Services extérieurs" },
  { value: "entretien", label: "Entretien & réparations", syscohada: "624", classe: "Services extérieurs" },
  { value: "assurance", label: "Assurances", syscohada: "625", classe: "Services extérieurs" },
  { value: "telephone_internet", label: "Téléphone / Internet", syscohada: "628", classe: "Services extérieurs" },
  { value: "publicite", label: "Publicité & marketing", syscohada: "627", classe: "Services extérieurs" },
  { value: "honoraires", label: "Honoraires (notaire, avocat...)", syscohada: "6324", classe: "Services extérieurs" },
  // Classe 63 - Autres services extérieurs
  { value: "commissions", label: "Commissions versées", syscohada: "632", classe: "Autres services extérieurs" },
  { value: "frais_bancaires", label: "Frais bancaires", syscohada: "631", classe: "Autres services extérieurs" },
  // Classe 64 - Impôts & taxes
  { value: "impots_taxes", label: "Impôts & taxes", syscohada: "64", classe: "Impôts & taxes" },
  // Classe 65 - Autres charges
  { value: "fournitures", label: "Fournitures de bureau", syscohada: "6046", classe: "Achats & approvisionnements" },
  { value: "electricite_eau", label: "Électricité / Eau", syscohada: "6051", classe: "Achats & approvisionnements" },
  // Classe 66 - Charges de personnel
  { value: "salaires", label: "Salaires & charges sociales", syscohada: "66", classe: "Charges de personnel" },
  { value: "formation", label: "Formation", syscohada: "6583", classe: "Charges de personnel" },
  // Classe 68 - Dotations aux amortissements
  { value: "equipement", label: "Équipement & matériel", syscohada: "681", classe: "Dotations aux amortissements" },
  // Autre
  { value: "autre", label: "Autre", syscohada: "658", classe: "Autres charges" },
] as const;

// SYSCOHADA Revenue accounts - Classes 7 (Produits)
export const REVENUE_ACCOUNTS = {
  loyers: { label: "Loyers encaissés", syscohada: "706", classe: "Ventes de services" },
  ventes: { label: "Ventes immobilières", syscohada: "702", classe: "Ventes de produits finis" },
  achats: { label: "Achats immobiliers", syscohada: "706", classe: "Ventes de services" },
  lotissements: { label: "Ventes lotissements", syscohada: "702", classe: "Ventes de produits finis" },
} as const;

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
  creator_name?: string;
}

export function getSyscohadaAccount(categoryValue: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === categoryValue);
}

export function useExpenses(periodFrom?: Date, periodTo?: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["expenses", user?.id, periodFrom?.toISOString(), periodTo?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("expenses")
        .select("*, profiles!expenses_user_id_profiles_fkey(full_name)")
        .order("expense_date", { ascending: false });

      if (periodFrom) {
        query = query.gte("expense_date", periodFrom.toISOString().split("T")[0]);
      }
      if (periodTo) {
        query = query.lte("expense_date", periodTo.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((e: any) => ({
        ...e,
        creator_name: e.profiles?.full_name || null,
        profiles: undefined,
      })) as Expense[];
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
