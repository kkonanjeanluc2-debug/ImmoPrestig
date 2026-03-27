import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, format } from "date-fns";

// Map of routes to their prefetch functions
const routePrefetchMap: Record<string, (queryClient: any) => void> = {
  "/dashboard": (qc) => {
    qc.prefetchQuery({ queryKey: ["properties"], queryFn: () => supabase.from("properties").select("*").is("deleted_at", null).order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
    qc.prefetchQuery({ queryKey: ["tenants"], queryFn: () => supabase.from("tenants").select("*").is("deleted_at", null).order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
    qc.prefetchQuery({ queryKey: ["payments"], queryFn: () => supabase.from("payments").select("*").order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
  },
  "/properties": (qc) => {
    qc.prefetchQuery({ queryKey: ["properties"], queryFn: () => supabase.from("properties").select("*").is("deleted_at", null).order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
  },
  "/tenants": (qc) => {
    qc.prefetchQuery({ queryKey: ["tenants"], queryFn: () => supabase.from("tenants").select("*").is("deleted_at", null).order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
  },
  "/owners": (qc) => {
    qc.prefetchQuery({ queryKey: ["owners"], queryFn: () => supabase.from("owners").select("*").is("deleted_at", null).order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
  },
  "/payments": (qc) => {
    qc.prefetchQuery({ queryKey: ["payments"], queryFn: () => supabase.from("payments").select("*").order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
  },
  "/contracts": (qc) => {
    qc.prefetchQuery({ queryKey: ["contracts"], queryFn: () => supabase.from("contracts").select("*, property:properties(title, address), tenant:tenants(name)").order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
  },
  "/ventes-immobilieres": (qc) => {
    qc.prefetchQuery({ queryKey: ["biens-vente"], queryFn: () => supabase.from("biens_vente").select("*").is("deleted_at", null).order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
    qc.prefetchQuery({ queryKey: ["ventes-immobilieres"], queryFn: () => supabase.from("ventes_immobilieres").select("*, bien:biens_vente(title, address, property_type, image_url), acquereur:acquereurs(name, phone, email)").order("sale_date", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
    qc.prefetchQuery({ queryKey: ["acquereurs"], queryFn: () => supabase.from("acquereurs").select("*").order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
  },
  "/achats-immobiliers": (qc) => {
    qc.prefetchQuery({ queryKey: ["biens-achat"], queryFn: () => supabase.from("biens_achat").select("*, vendeurs(name, phone)").is("deleted_at", null).order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
    qc.prefetchQuery({ queryKey: ["vendeurs"], queryFn: () => supabase.from("vendeurs").select("*").order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
    qc.prefetchQuery({ queryKey: ["offres-achat"], queryFn: () => supabase.from("offres_achat").select("*, biens_achat(title, address, price)").order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
    qc.prefetchQuery({ queryKey: ["achats-immobiliers"], queryFn: () => supabase.from("achats_immobiliers").select("*, biens_achat(title, address), vendeurs(name, phone, email, address, birth_date, birth_place, cni_number, profession), acquereurs(name, phone, email, address, birth_date, birth_place, cni_number, profession)").order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
    qc.prefetchQuery({ queryKey: ["echeances-achats"], queryFn: () => supabase.from("echeances_achats").select("*, achats_immobiliers(sale_price, biens_achat(title, address), vendeurs(name, phone, address, cni_number), acquereurs(name, phone, address, cni_number))").order("due_date", { ascending: true }).then(r => r.data), staleTime: 5 * 60 * 1000 });
    qc.prefetchQuery({ queryKey: ["mutations-achats"], queryFn: () => supabase.from("mutations_achats").select("*, biens_achat(title, address), achats_immobiliers(sale_price, sale_date)").order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
  },
  "/lotissements": (qc) => {
    qc.prefetchQuery({ queryKey: ["lotissements"], queryFn: () => supabase.from("lotissements").select("*").is("deleted_at", null).order("created_at", { ascending: false }).then(r => r.data), staleTime: 5 * 60 * 1000 });
  },
  "/settings": (qc) => {
    qc.prefetchQuery({ queryKey: ["agency"], queryFn: () => supabase.from("agencies").select("*").maybeSingle().then(r => r.data), staleTime: 5 * 60 * 1000 });
  },
};

export function usePrefetchRoute() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefetch = useCallback((href: string) => {
    if (!user) return;
    const prefetchFn = routePrefetchMap[href];
    if (prefetchFn) {
      prefetchFn(queryClient);
    }
  }, [queryClient, user]);

  return prefetch;
}
