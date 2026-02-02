import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";
import type { PaymentType } from "./useVentesParcelles";

export type SalePaymentStatus = "en_cours" | "complete" | "annule";

export interface VenteImmobiliere {
  id: string;
  user_id: string;
  bien_id: string;
  acquereur_id: string;
  sale_date: string;
  total_price: number;
  payment_type: PaymentType;
  payment_method: string | null;
  down_payment: number | null;
  monthly_payment: number | null;
  total_installments: number | null;
  paid_installments: number | null;
  status: SalePaymentStatus;
  notes: string | null;
  sold_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenteImmobiliereInsert {
  bien_id: string;
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

export interface VenteWithDetails extends VenteImmobiliere {
  bien?: {
    title: string;
    address: string;
    property_type: string;
    image_url: string | null;
  };
  acquereur?: {
    name: string;
    phone: string | null;
    email: string | null;
  };
}

export const useVentesImmobilieres = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ventes-immobilieres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ventes_immobilieres")
        .select(`
          *,
          bien:biens_vente(title, address, property_type, image_url),
          acquereur:acquereurs(name, phone, email)
        `)
        .order("sale_date", { ascending: false });

      if (error) throw error;
      return data as VenteWithDetails[];
    },
    enabled: !!user,
  });
};

export const useVenteImmobiliere = (id: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ventes-immobilieres", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ventes_immobilieres")
        .select(`
          *,
          bien:biens_vente(*),
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

export const useCreateVenteImmobiliere = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (vente: VenteImmobiliereInsert) => {
      if (!user) throw new Error("User not authenticated");

      // For cash payments, automatically set status to complete
      const status = vente.payment_type === "comptant" ? "complete" : "en_cours";
      const paidInstallments = vente.payment_type === "comptant" ? (vente.total_installments || 0) : 0;

      const { data, error } = await supabase
        .from("ventes_immobilieres")
        .insert({ 
          ...vente, 
          user_id: user.id,
          status,
          paid_installments: paidInstallments
        })
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
          .from("echeances_ventes")
          .insert(echeances);

        if (echeanceError) throw echeanceError;
      }

      await logActivityDirect(
        user.id,
        "create",
        "vente_immobiliere",
        `Vente immobilière`,
        data.id,
        { total_price: data.total_price, payment_type: data.payment_type }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventes-immobilieres"] });
      queryClient.invalidateQueries({ queryKey: ["biens-vente"] });
      queryClient.invalidateQueries({ queryKey: ["echeances-ventes"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateVenteImmobiliere = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<VenteImmobiliereInsert>) => {
      const { data, error } = await supabase
        .from("ventes_immobilieres")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "update", "vente_immobiliere", "Vente mise à jour", data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventes-immobilieres"] });
      queryClient.invalidateQueries({ queryKey: ["biens-vente"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteVenteImmobiliere = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ventes_immobilieres")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "delete", "vente_immobiliere", "Vente supprimée", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventes-immobilieres"] });
      queryClient.invalidateQueries({ queryKey: ["biens-vente"] });
      queryClient.invalidateQueries({ queryKey: ["echeances-ventes"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
