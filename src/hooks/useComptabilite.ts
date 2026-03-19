import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export interface PaidRentDetail {
  tenantName: string;
  months: string[];
  amount: number;
  paidDate: string;
  managerName: string;
  paymentMethod: string;
  ownerName: string;
  propertyTitle: string;
}

export interface ManagerRentGroup {
  managerName: string;
  details: PaidRentDetail[];
  total: number;
}

export interface RevenueDetail {
  label: string;
  description: string;
  amount: number;
  paidDate: string;
  managerName: string;
  ownerName?: string;
}

export interface ManagerRevenueGroup {
  managerName: string;
  details: RevenueDetail[];
  total: number;
}

export interface ComptabiliteData {
  // Revenue sources
  loyersEncaisses: number;
  ventesEncaissees: number;
  achatsEncaisses: number;
  lotissementsEncaisses: number;
  reservationsEncaissees: number;
  cautionsEncaissees: number;
  onlinePaymentsEncaisses: number;
  // Pending
  loyersEnAttente: number;
  ventesEnAttente: number;
  achatsEnAttente: number;
  lotissementsEnAttente: number;
  // Impayés
  loyersImpayes: number;
  // Expenses
  totalExpenses: number;
  expensesByCategory: { name: string; value: number; color: string }[];
  // Monthly breakdown
  monthlyData: MonthlyEntry[];
  // By category for pie chart
  revenueByCategory: { name: string; value: number; color: string }[];
  // Payment method breakdown
  byPaymentMethod: { name: string; value: number }[];
  // Detailed paid rents
  paidRentDetails: PaidRentDetail[];
  // Grouped by manager
  paidRentsByManager: ManagerRentGroup[];
  // Other revenue categories grouped by manager
  ventesByManager: ManagerRevenueGroup[];
  achatsByManager: ManagerRevenueGroup[];
  lotissementsByManager: ManagerRevenueGroup[];
  reservationsByManager: ManagerRevenueGroup[];
  cautionsByManager: ManagerRevenueGroup[];
}

export interface MonthlyEntry {
  name: string;
  loyers: number;
  ventes: number;
  achats: number;
  lotissements: number;
  cautions: number;
  depenses: number;
  total: number;
  benefice: number;
}

const FRENCH_MONTHS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
];

const EXPENSE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#8b5cf6", "#ec4899",
  "#06b6d4", "#84cc16", "#f43f5e", "#a855f7", "#14b8a6",
  "#6366f1", "#d946ef", "#0ea5e9", "#22c55e", "#f59e0b", "#64748b",
];

// Helper: check if any payment_months overlap with a given period
function paymentMonthsOverlapPeriod(paymentMonths: string[] | null, fromDate: string, toDate: string): boolean {
  if (!paymentMonths || !Array.isArray(paymentMonths) || paymentMonths.length === 0) return false;
  const fromYM = fromDate.substring(0, 7); // "YYYY-MM"
  const toYM = toDate.substring(0, 7);
  
  const FRENCH_MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  
  return paymentMonths.some(m => {
    let ym = m;
    // Convert French label "Mars 2026" -> "2026-03"
    if (!/^\d{4}-\d{2}$/.test(m)) {
      const parts = m.split(" ");
      if (parts.length === 2) {
        const monthIdx = FRENCH_MONTH_NAMES.indexOf(parts[0]);
        if (monthIdx >= 0) {
          ym = `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`;
        } else return false;
      } else return false;
    }
    return ym >= fromYM && ym <= toYM;
  });
}

// Helper: count how many payment_months fall within a period
function countOverlappingMonths(paymentMonths: string[] | null, fromDate: string, toDate: string): number {
  if (!paymentMonths || !Array.isArray(paymentMonths) || paymentMonths.length === 0) return 0;
  const fromYM = fromDate.substring(0, 7);
  const toYM = toDate.substring(0, 7);
  
  const FRENCH_MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  
  let count = 0;
  paymentMonths.forEach(m => {
    let ym = m;
    if (!/^\d{4}-\d{2}$/.test(m)) {
      const parts = m.split(" ");
      if (parts.length === 2) {
        const monthIdx = FRENCH_MONTH_NAMES.indexOf(parts[0]);
        if (monthIdx >= 0) ym = `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`;
        else return;
      } else return;
    }
    if (ym >= fromYM && ym <= toYM) count++;
  });
  return count;
}

// Helper: convert a payment_month string to "YYYY-MM" ISO format
function toYearMonth(m: string): string | null {
  if (/^\d{4}-\d{2}$/.test(m)) return m;
  const FRENCH_MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const parts = m.split(" ");
  if (parts.length === 2) {
    const monthIdx = FRENCH_MONTH_NAMES.indexOf(parts[0]);
    if (monthIdx >= 0) return `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`;
  }
  return null;
}

export function useComptabilite(periodFrom: Date, periodTo: Date) {
  const { user } = useAuth();
  const fromDate = periodFrom.toISOString().split("T")[0];
  const toDate = periodTo.toISOString().split("T")[0];

  const { data: payments } = useQuery({
    queryKey: ["comptabilite-payments", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      // Fetch payments within the period by paid_date OR due_date
      const { data: periodPayments, error } = await supabase
        .from("payments")
        .select("id, amount, status, due_date, paid_date, method, payment_months, paid_amount, tenant:tenants!payments_tenant_id_fkey(name, assigned_to, property:properties!tenants_property_id_fkey(title, owner:owners!properties_owner_id_fkey(name)))")
        .or(
          `and(status.eq.paid,paid_date.gte.${fromDate},paid_date.lte.${toDate}),and(status.neq.paid,due_date.gte.${fromDate},due_date.lte.${toDate}),and(status.neq.paid,paid_amount.gt.0,paid_date.gte.${fromDate},paid_date.lte.${toDate})`
        );
      if (error) throw error;

      // Also fetch advance payments (multi-month paid payments) that might have been paid BEFORE this period
      // but cover months within this period
      const { data: advancePayments, error: advError } = await supabase
        .from("payments")
        .select("id, amount, status, due_date, paid_date, method, payment_months, paid_amount, tenant:tenants!payments_tenant_id_fkey(name, assigned_to, property:properties!tenants_property_id_fkey(title, owner:owners!properties_owner_id_fkey(name)))")
        .eq("status", "paid")
        .lt("paid_date", fromDate)
        .not("payment_months", "is", null);
      if (advError) throw advError;

      // Filter advance payments whose payment_months overlap with the period
      const existingIds = new Set((periodPayments || []).map((p: any) => p.id));
      const relevantAdvance = (advancePayments || []).filter((p: any) =>
        !existingIds.has(p.id) && paymentMonthsOverlapPeriod(p.payment_months, fromDate, toDate)
      );

      return [...(periodPayments || []), ...relevantAdvance];
    },
    enabled: !!user,
  });

  const { data: echeancesVentes } = useQuery({
    queryKey: ["comptabilite-ventes", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_ventes")
        .select("id, vente_id, amount, status, due_date, paid_date, payment_method, paid_amount, vente:ventes_immobilieres(bien:biens_vente(assigned_to, title), acquereur:acquereurs(name))")
        .or(
          `and(status.eq.paid,paid_date.gte.${fromDate},paid_date.lte.${toDate}),and(status.neq.paid,due_date.gte.${fromDate},due_date.lte.${toDate})`
        );
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch ALL pending échéances (no period filter) for "en attente" totals
  const { data: allPendingVentes } = useQuery({
    queryKey: ["comptabilite-ventes-pending-all", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_ventes")
        .select("amount, status")
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch ventes_immobilieres for down_payments (acomptes)
  const { data: ventesImmobilieres } = useQuery({
    queryKey: ["comptabilite-ventes-immo", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ventes_immobilieres")
        .select("id, down_payment, sale_date, payment_type, total_price, bien:biens_vente(assigned_to, title), acquereur:acquereurs(name)")
        .gte("sale_date", fromDate)
        .lte("sale_date", toDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: echeancesAchats } = useQuery({
    queryKey: ["comptabilite-achats", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_achats")
        .select("id, achat_id, amount, status, due_date, paid_date, payment_method, paid_amount, achat:achats_immobiliers(is_agency_purchase, bien:biens_achat(assigned_to, title), acquereur:acquereurs(name))")
        .or(
          `and(status.eq.paye,paid_date.gte.${fromDate},paid_date.lte.${toDate}),and(status.eq.en_attente,due_date.gte.${fromDate},due_date.lte.${toDate})`
        );
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: allPendingAchats } = useQuery({
    queryKey: ["comptabilite-achats-pending-all", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_achats")
        .select("amount, status")
        .eq("status", "en_attente");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch achats_immobiliers for down_payments (acomptes)
  const { data: achatsImmobiliers } = useQuery({
    queryKey: ["comptabilite-achats-immo", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achats_immobiliers")
        .select("id, down_payment, sale_date, payment_type, sale_price, is_agency_purchase, bien:biens_achat(assigned_to, title), acquereur:acquereurs(name)")
        .gte("sale_date", fromDate)
        .lte("sale_date", toDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: echeancesParcelles } = useQuery({
    queryKey: ["comptabilite-parcelles", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_parcelles")
        .select("id, vente_id, amount, status, due_date, paid_date, payment_method, paid_amount, vente:ventes_parcelles(sold_by, parcelle:parcelles(assigned_to, plot_number, lotissement:lotissements(name)), acquereur:acquereurs(name))")
        .or(
          `and(status.eq.paid,paid_date.gte.${fromDate},paid_date.lte.${toDate}),and(status.neq.paid,due_date.gte.${fromDate},due_date.lte.${toDate})`
        );
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: allPendingParcelles } = useQuery({
    queryKey: ["comptabilite-parcelles-pending-all", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_parcelles")
        .select("amount, status")
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Lightweight queries for échéance numbering (ALL échéances, no period filter)
  const { data: allEcheancesVentesNum } = useQuery({
    queryKey: ["comptabilite-echeances-ventes-numbering", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_ventes")
        .select("id, vente_id, due_date")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const { data: allEcheancesAchatsNum } = useQuery({
    queryKey: ["comptabilite-echeances-achats-numbering", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_achats")
        .select("id, achat_id, due_date")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const { data: allEcheancesParcellesNum } = useQuery({
    queryKey: ["comptabilite-echeances-parcelles-numbering", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_parcelles")
        .select("id, vente_id, due_date")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch ventes_parcelles for down_payments (acomptes)
  const { data: ventesParcelles } = useQuery({
    queryKey: ["comptabilite-ventes-parcelles", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ventes_parcelles")
        .select("id, down_payment, sale_date, payment_type, total_price, sold_by, parcelle:parcelles(assigned_to, plot_number, lotissement:lotissements(name)), acquereur:acquereurs(name)")
        .gte("sale_date", fromDate)
        .lte("sale_date", toDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch reservations_vente deposits
  const { data: reservationsVente } = useQuery({
    queryKey: ["comptabilite-reservations-vente", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations_vente")
        .select("id, deposit_amount, payment_method, reservation_date, status, bien:biens_vente(assigned_to, title), acquereur:acquereurs(name)")
        .in("status", ["active", "converted"])
        .gte("reservation_date", fromDate)
        .lte("reservation_date", toDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch reservations_parcelles deposits
  const { data: reservationsParcelles } = useQuery({
    queryKey: ["comptabilite-reservations-parcelles", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations_parcelles")
        .select("id, deposit_amount, payment_method, reservation_date, status, parcelle:parcelles(assigned_to, plot_number, lotissement:lotissements(name)), acquereur:acquereurs(name)")
        .in("status", ["active", "converted"])
        .gte("reservation_date", fromDate)
        .lte("reservation_date", toDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch online rent payments not linked to a regular payment
  const { data: onlinePayments } = useQuery({
    queryKey: ["comptabilite-online-payments", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("online_rent_payments")
        .select("id, amount, paid_at, payment_method, status, payment_id, tenant:tenants(name, assigned_to, property:properties!tenants_property_id_fkey(title, owner:owners!properties_owner_id_fkey(name)))")
        .eq("status", "completed")
        .is("payment_id", null)
        .gte("paid_at", fromDate)
        .lte("paid_at", toDate + "T23:59:59");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch cautions (security deposits) within the selected period.
  // We consider both contract start_date and created_at to avoid missing deposits
  // entered this month for contracts starting later (or backfilled contracts).
  const { data: cautions } = useQuery({
    queryKey: ["comptabilite-cautions", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, deposit, start_date, created_at, tenant:tenants!contracts_tenant_id_fkey(name, assigned_to, property:properties!tenants_property_id_fkey(title, owner:owners!properties_owner_id_fkey(name)))")
        .gt("deposit", 0)
        .is("deleted_at", null);
      if (error) {
        console.error("Cautions query error:", error);
        throw error;
      }
      // Filter client-side: include contracts where start_date OR created_at falls within the period
      return (data || []).filter((c: any) => {
        const startDate = c.start_date;
        const createdDate = c.created_at ? String(c.created_at).split("T")[0] : null;
        const inPeriodByStart = startDate >= fromDate && startDate <= toDate;
        const inPeriodByCreation = createdDate ? createdDate >= fromDate && createdDate <= toDate : false;
        return inPeriodByStart || inPeriodByCreation;
      });
    },
    enabled: !!user,
  });

  const { data: expenses } = useQuery({
    queryKey: ["comptabilite-expenses", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, category, expense_date")
        .gte("expense_date", periodFrom.toISOString().split("T")[0])
        .lte("expense_date", periodTo.toISOString().split("T")[0]);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Extract manager IDs from all revenue sources for profile resolution
  const managerUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (payments) {
      payments.forEach((p: any) => {
        const assignedTo = p.tenant?.assigned_to;
        if (assignedTo) ids.add(assignedTo);
      });
    }
    if (echeancesVentes) {
      (echeancesVentes as any[]).forEach((e: any) => {
        const assignedTo = e.vente?.bien?.assigned_to;
        if (assignedTo) ids.add(assignedTo);
      });
    }
    if (ventesImmobilieres) {
      (ventesImmobilieres as any[]).forEach((v: any) => {
        const assignedTo = v.bien?.assigned_to;
        if (assignedTo) ids.add(assignedTo);
      });
    }
    if (echeancesAchats) {
      (echeancesAchats as any[]).forEach((e: any) => {
        const assignedTo = e.achat?.bien?.assigned_to;
        if (assignedTo) ids.add(assignedTo);
      });
    }
    if (achatsImmobiliers) {
      (achatsImmobiliers as any[]).forEach((a: any) => {
        const assignedTo = a.bien?.assigned_to;
        if (assignedTo) ids.add(assignedTo);
      });
    }
    if (echeancesParcelles) {
      (echeancesParcelles as any[]).forEach((e: any) => {
        const assignedTo = e.vente?.sold_by || e.vente?.parcelle?.assigned_to;
        if (assignedTo) ids.add(assignedTo);
      });
    }
    if (ventesParcelles) {
      (ventesParcelles as any[]).forEach((v: any) => {
        const assignedTo = v.sold_by || v.parcelle?.assigned_to;
        if (assignedTo) ids.add(assignedTo);
      });
    }
    if (reservationsVente) {
      (reservationsVente as any[]).forEach((r: any) => {
        const assignedTo = r.bien?.assigned_to;
        if (assignedTo) ids.add(assignedTo);
      });
    }
    if (reservationsParcelles) {
      (reservationsParcelles as any[]).forEach((r: any) => {
        const assignedTo = r.parcelle?.assigned_to;
        if (assignedTo) ids.add(assignedTo);
      });
    }
    if (onlinePayments) {
      (onlinePayments as any[]).forEach((p: any) => {
        const assignedTo = p.tenant?.assigned_to;
        if (assignedTo) ids.add(assignedTo);
      });
    }
    if (cautions) {
      (cautions as any[]).forEach((c: any) => {
        const assignedTo = c.tenant?.assigned_to;
        if (assignedTo) ids.add(assignedTo);
      });
    }
    return Array.from(ids);
  }, [payments, echeancesVentes, ventesImmobilieres, echeancesAchats, achatsImmobiliers, echeancesParcelles, ventesParcelles, reservationsVente, reservationsParcelles, onlinePayments, cautions]);

  const { data: managerProfiles } = useQuery({
    queryKey: ["comptabilite-manager-profiles", managerUserIds],
    queryFn: async () => {
      if (managerUserIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", managerUserIds);
      if (error) throw error;
      return data;
    },
    enabled: managerUserIds.length > 0,
  });

  return useMemo(() => {
    const result: ComptabiliteData = {
      loyersEncaisses: 0,
      ventesEncaissees: 0,
      achatsEncaisses: 0,
      lotissementsEncaisses: 0,
      reservationsEncaissees: 0,
      cautionsEncaissees: 0,
      onlinePaymentsEncaisses: 0,
      loyersEnAttente: 0,
      ventesEnAttente: 0,
      achatsEnAttente: 0,
      lotissementsEnAttente: 0,
      loyersImpayes: 0,
      totalExpenses: 0,
      expensesByCategory: [],
      monthlyData: [],
      revenueByCategory: [],
      byPaymentMethod: [],
      paidRentDetails: [],
      paidRentsByManager: [],
      ventesByManager: [],
      achatsByManager: [],
      lotissementsByManager: [],
      reservationsByManager: [],
      cautionsByManager: [],
    };

    // Build monthly buckets
    const monthlyMap = new Map<string, MonthlyEntry>();
    const cursor = new Date(periodFrom.getFullYear(), periodFrom.getMonth(), 1);
    const endMonth = new Date(periodTo.getFullYear(), periodTo.getMonth(), 1);
    while (cursor <= endMonth) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      monthlyMap.set(key, {
        name: `${FRENCH_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`,
        loyers: 0,
        ventes: 0,
        achats: 0,
        lotissements: 0,
        cautions: 0,
        depenses: 0,
        total: 0,
        benefice: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const methodMap = new Map<string, number>();

    const normalizeStatus = (status: string): string => {
      const map: Record<string, string> = {
        paye: "paid",
        payé: "paid",
        en_attente: "pending",
        impaye: "overdue",
        impayé: "overdue",
        en_retard: "late",
      };
      return map[status.toLowerCase()] || status;
    };

    const processEntries = (
      entries: { amount: number; status: string; due_date: string; paid_date: string | null; payment_method: string | null }[] | undefined,
      category: "loyers" | "ventes" | "achats" | "lotissements",
      paidField: "loyersEncaisses" | "ventesEncaissees" | "achatsEncaisses" | "lotissementsEncaisses",
      pendingField: "loyersEnAttente" | "ventesEnAttente" | "achatsEnAttente" | "lotissementsEnAttente"
    ) => {
      if (!entries) return;
      entries.forEach((e) => {
        const amount = Number(e.amount);
        const date = new Date(e.due_date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const monthly = monthlyMap.get(key);
        const status = normalizeStatus(e.status);

        if (status === "paid") {
          result[paidField] += amount;
          if (monthly) {
            monthly[category] += amount;
            monthly.total += amount;
          }
          const method = e.payment_method || "Non spécifié";
          methodMap.set(method, (methodMap.get(method) || 0) + amount);
        } else if (status === "pending") {
          result[pendingField] += amount;
        } else if (status === "overdue" || status === "late") {
          if (category === "loyers") result.loyersImpayes += amount;
          else result[pendingField] += amount;
        }
      });
    };

    // Process payments - handle advance payments that cover multiple months
    if (payments) {
      payments.forEach((p: any) => {
        const totalAmount = Number(p.paid_amount) || Number(p.amount);
        const status = normalizeStatus(p.status);
        const paymentMonths = p.payment_months as string[] | null;
        const isMultiMonth = paymentMonths && Array.isArray(paymentMonths) && paymentMonths.length > 1;
        const paidDate = p.paid_date;
        const isPaidInPeriod = paidDate && paidDate >= fromDate && paidDate <= toDate;

        if (status === "paid") {
          if (isMultiMonth) {
            // Distribute across covered months
            const perMonth = Math.round(totalAmount / paymentMonths.length);
            const overlappingCount = countOverlappingMonths(paymentMonths, fromDate, toDate);
            const overlappingAmount = perMonth * overlappingCount;
            
            result.loyersEncaisses += overlappingAmount;
            
            // Add to monthly buckets for each overlapping month
            paymentMonths.forEach((m) => {
              const ym = toYearMonth(m);
              if (!ym) return;
              const fromYM = fromDate.substring(0, 7);
              const toYM = toDate.substring(0, 7);
              if (ym < fromYM || ym > toYM) return;
              
              const [yearStr, monthStr] = ym.split("-");
              const key = `${yearStr}-${parseInt(monthStr) - 1}`;
              const monthly = monthlyMap.get(key);
              if (monthly) {
                monthly.loyers += perMonth;
                monthly.total += perMonth;
              }
            });
            
            // Count payment method only for the portion within period
            if (overlappingAmount > 0) {
              const method = p.method || "Non spécifié";
              methodMap.set(method, (methodMap.get(method) || 0) + overlappingAmount);
            }
          } else {
            // Single month or no payment_months - use paid_date for bucket
            if (isPaidInPeriod) {
              result.loyersEncaisses += totalAmount;
              const date = new Date(paidDate);
              const key = `${date.getFullYear()}-${date.getMonth()}`;
              const monthly = monthlyMap.get(key);
              if (monthly) {
                monthly.loyers += totalAmount;
                monthly.total += totalAmount;
              }
              const method = p.method || "Non spécifié";
              methodMap.set(method, (methodMap.get(method) || 0) + totalAmount);
            } else if (paymentMonths && paymentMonths.length === 1) {
              // Single month advance paid before period but covering this period
              const ym = toYearMonth(paymentMonths[0]);
              const fromYM = fromDate.substring(0, 7);
              const toYM = toDate.substring(0, 7);
              if (ym && ym >= fromYM && ym <= toYM) {
                result.loyersEncaisses += totalAmount;
                const [yearStr, monthStr] = ym.split("-");
                const key = `${yearStr}-${parseInt(monthStr) - 1}`;
                const monthly = monthlyMap.get(key);
                if (monthly) {
                  monthly.loyers += totalAmount;
                  monthly.total += totalAmount;
                }
                const method = p.method || "Non spécifié";
                methodMap.set(method, (methodMap.get(method) || 0) + totalAmount);
              }
            }
          }
        } else if (status === "pending" || status === "overdue" || status === "late") {
          // For partial payments, count paid_amount as revenue and remainder as pending/impayé
          const paidPortion = Number(p.paid_amount) || 0;
          const remainder = Number(p.amount) - paidPortion;
          
          if (paidPortion > 0) {
            // Count the paid portion as collected revenue
            result.loyersEncaisses += paidPortion;
            
            // Add to monthly bucket based on paid_date first, then due_date
            const effectiveDate = (p.paid_date && p.paid_date >= fromDate && p.paid_date <= toDate) 
              ? p.paid_date 
              : p.due_date;
            if (effectiveDate && effectiveDate >= fromDate && effectiveDate <= toDate) {
              const date = new Date(effectiveDate);
              const key = `${date.getFullYear()}-${date.getMonth()}`;
              const monthly = monthlyMap.get(key);
              if (monthly) {
                monthly.loyers += paidPortion;
                monthly.total += paidPortion;
              }
              const method = p.method || "Non spécifié";
              methodMap.set(method, (methodMap.get(method) || 0) + paidPortion);
            }
          }
          
          if (status === "pending") {
            result.loyersEnAttente += remainder;
          } else {
            result.loyersImpayes += remainder;
          }
        }
      });
    }

    // Build detailed paid rent entries
    // Collect unique assigned_to user IDs for profile resolution
    const managerIds = new Set<string>();
    if (payments) {
      payments.forEach((p: any) => {
        const status = normalizeStatus(p.status);
        const isPaid = status === "paid";
        const isPartial = !isPaid && (Number(p.paid_amount) || 0) > 0;
        
        if (isPaid || isPartial) {
          const assignedTo = p.tenant?.assigned_to;
          if (assignedTo) managerIds.add(assignedTo);
          const tenantName = p.tenant?.name || "Locataire inconnu";
          const propertyTitle = p.tenant?.property?.title || "";
          const ownerName = p.tenant?.property?.owner?.name || "";
          const allMonths = p.payment_months || [];
          const totalAmount = isPaid ? (Number(p.paid_amount) || Number(p.amount)) : Number(p.paid_amount);
          const isMultiMonth = allMonths.length > 1;
          const paidDate = p.paid_date;
          const isPaidInPeriod = paidDate && paidDate >= fromDate && paidDate <= toDate;
          const suffix = isPartial ? " (partiel)" : "";

          if (isMultiMonth && isPaid) {
            // For multi-month advance payments, only count the portion within the period
            const overlapping = countOverlappingMonths(allMonths, fromDate, toDate);
            if (overlapping > 0) {
              const perMonth = Math.round(totalAmount / allMonths.length);
              // Filter months to only those in period
              const monthsInPeriod = allMonths.filter((m: string) => {
                const ym = toYearMonth(m);
                if (!ym) return false;
                return ym >= fromDate.substring(0, 7) && ym <= toDate.substring(0, 7);
              });
              result.paidRentDetails.push({
                tenantName,
                months: monthsInPeriod,
                amount: perMonth * overlapping,
                paidDate: paidDate || p.due_date,
                managerName: assignedTo || "__unassigned__",
                paymentMethod: p.method || "Non spécifié",
                ownerName,
                propertyTitle,
              });
            }
          } else if (isPartial) {
            // Partial payment - show the paid portion
            // Use paid_date if in period, otherwise due_date
            const effectiveDate = (paidDate && paidDate >= fromDate && paidDate <= toDate) 
              ? paidDate 
              : p.due_date;
            if (effectiveDate && effectiveDate >= fromDate && effectiveDate <= toDate) {
              result.paidRentDetails.push({
                tenantName: tenantName + suffix,
                months: allMonths.length > 0 ? allMonths : (p.due_date ? [p.due_date.substring(0, 7)] : []),
                amount: totalAmount,
                paidDate: paidDate || p.due_date,
                managerName: assignedTo || "__unassigned__",
                paymentMethod: p.method || "Non spécifié",
                ownerName,
                propertyTitle,
              });
            }
          } else if (isPaidInPeriod || (allMonths.length === 1 && paymentMonthsOverlapPeriod(allMonths, fromDate, toDate))) {
            result.paidRentDetails.push({
              tenantName,
              months: allMonths,
              amount: totalAmount,
              paidDate: paidDate || p.due_date,
              managerName: assignedTo || "__unassigned__",
              paymentMethod: p.method || "Non spécifié",
              ownerName,
              propertyTitle,
            });
          }
        }
      });
      // Resolve manager names from profiles
      const profileMap = new Map<string, string>();
      managerProfiles?.forEach((p) => {
        profileMap.set(p.user_id, p.full_name || "Gestionnaire");
      });

      result.paidRentDetails.forEach((d) => {
        if (d.managerName !== "__unassigned__") {
          d.managerName = profileMap.get(d.managerName) || "Gestionnaire";
        } else {
          d.managerName = "Non assigné";
        }
      });

      // Sort by manager then tenant name then date
      result.paidRentDetails.sort((a, b) => a.managerName.localeCompare(b.managerName) || a.tenantName.localeCompare(b.tenantName) || a.paidDate.localeCompare(b.paidDate));

      // Group by manager
      const managerGroupMap = new Map<string, PaidRentDetail[]>();
      result.paidRentDetails.forEach((d) => {
        const group = managerGroupMap.get(d.managerName) || [];
        group.push(d);
        managerGroupMap.set(d.managerName, group);
      });
      result.paidRentsByManager = Array.from(managerGroupMap.entries()).map(([managerName, details]) => ({
        managerName,
        details,
        total: details.reduce((s, d) => s + d.amount, 0),
      }));
    }
    processEntries(echeancesVentes as any, "ventes", "ventesEncaissees", "ventesEnAttente");
    // Split achats: intermediation (non-agency) → revenue, agency purchases → expenses
    const echeancesAchatsIntermediation = (echeancesAchats as any[] || []).filter((e: any) => !e.achat?.is_agency_purchase);
    const echeancesAchatsAgence = (echeancesAchats as any[] || []).filter((e: any) => e.achat?.is_agency_purchase);
    processEntries(echeancesAchatsIntermediation, "achats", "achatsEncaisses", "achatsEnAttente");
    // Agency purchase échéances → add to expenses (sorties)
    echeancesAchatsAgence.forEach((e: any) => {
      const amount = Number(e.amount);
      const status = normalizeStatus(e.status);
      if (status === "paid") {
        result.totalExpenses += amount;
        const date = new Date(e.paid_date || e.due_date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const monthly = monthlyMap.get(key);
        if (monthly) {
          monthly.depenses += amount;
        }
        const method = e.payment_method || "Non spécifié";
        methodMap.set(method, (methodMap.get(method) || 0) + amount);
      }
    });
    processEntries(echeancesParcelles as any, "lotissements", "lotissementsEncaisses", "lotissementsEnAttente");

    // Override "en attente" totals with ALL pending échéances (no period filter)
    // This matches the loyers behavior where virtual payments show all upcoming dues
    if (allPendingVentes) {
      result.ventesEnAttente = allPendingVentes.reduce((sum, e) => sum + Number(e.amount), 0);
    }
    if (allPendingAchats) {
      result.achatsEnAttente = allPendingAchats.reduce((sum, e) => sum + Number(e.amount), 0);
    }
    if (allPendingParcelles) {
      result.lotissementsEnAttente = allPendingParcelles.reduce((sum, e) => sum + Number(e.amount), 0);
    }

    // Add down_payments (acomptes) from parent tables
    const addDownPayments = (
      entries: any[] | undefined,
      category: "ventes" | "achats" | "lotissements",
      paidField: "ventesEncaissees" | "achatsEncaisses" | "lotissementsEncaisses",
      getPaymentType: (e: any) => string,
      getTotalPrice: (e: any) => number,
      getDownPayment: (e: any) => number,
      getSaleDate: (e: any) => string
    ) => {
      if (!entries) return;
      entries.forEach((e: any) => {
        const paymentType = getPaymentType(e);
        const downPayment = getDownPayment(e);
        const totalPrice = getTotalPrice(e);
        // For cash payments (comptant), use total_price if no down_payment
        const amount = paymentType === "comptant"
          ? (downPayment || totalPrice || 0)
          : (downPayment || 0);
        if (amount <= 0) return;

        result[paidField] += amount;
        const date = new Date(getSaleDate(e));
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const monthly = monthlyMap.get(key);
        if (monthly) {
          monthly[category] += amount;
          monthly.total += amount;
        }
      });
    };

    addDownPayments(
      ventesImmobilieres as any, "ventes", "ventesEncaissees",
      (v) => v.payment_type, (v) => Number(v.total_price), (v) => Number(v.down_payment || 0), (v) => v.sale_date
    );
    // Only intermediation achats as revenue
    const achatsIntermediation = (achatsImmobiliers as any[] || []).filter((a: any) => !a.is_agency_purchase);
    const achatsAgence = (achatsImmobiliers as any[] || []).filter((a: any) => a.is_agency_purchase);
    addDownPayments(
      achatsIntermediation, "achats", "achatsEncaisses",
      (a) => a.payment_type, (a) => Number(a.sale_price), (a) => Number(a.down_payment || 0), (a) => a.sale_date
    );
    // Agency purchases down payments → expenses
    achatsAgence.forEach((a: any) => {
      const paymentType = a.payment_type;
      const dp = Number(a.down_payment || 0);
      const total = Number(a.sale_price || 0);
      const amount = paymentType === "comptant" ? (dp || total || 0) : (dp || 0);
      if (amount <= 0) return;
      result.totalExpenses += amount;
      const date = new Date(a.sale_date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const monthly = monthlyMap.get(key);
      if (monthly) {
        monthly.depenses += amount;
      }
    });
    addDownPayments(
      ventesParcelles as any, "lotissements", "lotissementsEncaisses",
      (v) => v.payment_type, (v) => Number(v.total_price), (v) => Number(v.down_payment || 0), (v) => v.sale_date
    );

    // Build profile map for manager name resolution
    const profileMap = new Map<string, string>();
    managerProfiles?.forEach((p) => {
      profileMap.set(p.user_id, p.full_name || "Gestionnaire");
    });
    const resolveManager = (id: string | null | undefined) => {
      if (!id) return "Non assigné";
      return profileMap.get(id) || "Gestionnaire";
    };

    // Build numbering maps from complete échéance data (all periods)
    const buildNumberingMap = (allEcheances: { id: string; due_date: string }[] | undefined, parentIdKey: string) => {
      const map = new Map<string, { num: number; total: number }>();
      if (!allEcheances) return map;
      const groups = new Map<string, typeof allEcheances>();
      allEcheances.forEach((e: any) => {
        const parentId = e[parentIdKey];
        if (!parentId) return;
        if (!groups.has(parentId)) groups.set(parentId, []);
        groups.get(parentId)!.push(e);
      });
      groups.forEach((list) => {
        list.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
        list.forEach((e, idx) => {
          map.set(e.id, { num: idx + 1, total: list.length });
        });
      });
      return map;
    };

    const ventesNumMap = buildNumberingMap(allEcheancesVentesNum as any, "vente_id");
    const achatsNumMap = buildNumberingMap(allEcheancesAchatsNum as any, "achat_id");
    const parcellesNumMap = buildNumberingMap(allEcheancesParcellesNum as any, "vente_id");

    // Group by manager helper - combines echeances + down_payments
    const groupByManagerWithDownPayments = (
      echeances: any[] | undefined,
      parentEntries: any[] | undefined,
      numberingMap: Map<string, { num: number; total: number }>,
      getEcheanceAssignedTo: (e: any) => string | null,
      getEcheanceLabel: (e: any) => string,
      getEcheanceDesc: (e: any) => string,
      getParentAssignedTo: (e: any) => string | null,
      getParentLabel: (e: any) => string,
      getParentDesc: (e: any) => string,
      getParentPaymentType: (e: any) => string,
      getParentTotalPrice: (e: any) => number,
      getParentDownPayment: (e: any) => number
    ): ManagerRevenueGroup[] => {
      const details: RevenueDetail[] = [];
      if (echeances) {
        echeances.forEach((e: any) => {
          if (normalizeStatus(e.status) !== "paid") return;
          const numbering = numberingMap.get(e.id);
          const echeanceLabel = numbering ? `Éch. ${numbering.num}/${numbering.total}` : "Échéance";
          details.push({
            label: getEcheanceLabel(e),
            description: getEcheanceDesc(e) + ` (${echeanceLabel})`,
            amount: Number(e.paid_amount) || Number(e.amount),
            paidDate: e.paid_date || e.due_date,
            managerName: resolveManager(getEcheanceAssignedTo(e)),
          });
        });
      }
      if (parentEntries) {
        parentEntries.forEach((e: any) => {
          const paymentType = getParentPaymentType(e);
          const dp = getParentDownPayment(e);
          const total = getParentTotalPrice(e);
          const amount = paymentType === "comptant" ? (dp || total || 0) : (dp || 0);
          if (amount <= 0) return;
          details.push({
            label: getParentLabel(e),
            description: getParentDesc(e) + (paymentType === "comptant" ? " (Comptant)" : " (Acompte)"),
            amount,
            paidDate: e.sale_date,
            managerName: resolveManager(getParentAssignedTo(e)),
          });
        });
      }
      details.sort((a, b) => a.managerName.localeCompare(b.managerName) || a.label.localeCompare(b.label));
      const groupMap = new Map<string, RevenueDetail[]>();
      details.forEach((d) => {
        const group = groupMap.get(d.managerName) || [];
        group.push(d);
        groupMap.set(d.managerName, group);
      });
      return Array.from(groupMap.entries()).map(([managerName, dets]) => ({
        managerName,
        details: dets,
        total: dets.reduce((s, d) => s + d.amount, 0),
      }));
    };

    result.ventesByManager = groupByManagerWithDownPayments(
      echeancesVentes as any, ventesImmobilieres as any, ventesNumMap,
      (e) => e.vente?.bien?.assigned_to,
      (e) => e.vente?.bien?.title || "Bien inconnu",
      (e) => e.vente?.acquereur?.name || "Acquéreur inconnu",
      (v) => v.bien?.assigned_to,
      (v) => v.bien?.title || "Bien inconnu",
      (v) => v.acquereur?.name || "Acquéreur inconnu",
      (v) => v.payment_type, (v) => Number(v.total_price), (v) => Number(v.down_payment || 0)
    );

    result.achatsByManager = groupByManagerWithDownPayments(
      echeancesAchatsIntermediation, achatsIntermediation, achatsNumMap,
      (e) => e.achat?.bien?.assigned_to,
      (e) => e.achat?.bien?.title || "Bien inconnu",
      (e) => e.achat?.acquereur?.name || "Acquéreur inconnu",
      (a) => a.bien?.assigned_to,
      (a) => a.bien?.title || "Bien inconnu",
      (a) => a.acquereur?.name || "Acquéreur inconnu",
      (a) => a.payment_type, (a) => Number(a.sale_price), (a) => Number(a.down_payment || 0)
    );

    result.lotissementsByManager = groupByManagerWithDownPayments(
      echeancesParcelles as any, ventesParcelles as any, parcellesNumMap,
      (e) => e.vente?.sold_by || e.vente?.parcelle?.assigned_to,
      (e) => {
        const parcelle = e.vente?.parcelle;
        if (parcelle) {
          const lotName = parcelle.lotissement?.name || "";
          return `${lotName} - Parcelle ${parcelle.plot_number}`;
        }
        return "Parcelle inconnue";
      },
      (e) => e.vente?.acquereur?.name || "Acquéreur inconnu",
      (v) => v.sold_by || v.parcelle?.assigned_to,
      (v) => {
        const parcelle = v.parcelle;
        if (parcelle) {
          const lotName = parcelle.lotissement?.name || "";
          return `${lotName} - Parcelle ${parcelle.plot_number}`;
        }
        return "Parcelle inconnue";
      },
      (v) => v.acquereur?.name || "Acquéreur inconnu",
      (v) => v.payment_type, (v) => Number(v.total_price), (v) => Number(v.down_payment || 0)
    );

    // Process reservation deposits (ventes + parcelles)
    const reservationDetails: RevenueDetail[] = [];
    if (reservationsVente) {
      (reservationsVente as any[]).forEach((r: any) => {
        const amount = Number(r.deposit_amount || 0);
        if (amount <= 0) return;
        result.reservationsEncaissees += amount;
        const date = new Date(r.reservation_date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const monthly = monthlyMap.get(key);
        if (monthly) {
          monthly.ventes += amount;
          monthly.total += amount;
        }
        const method = r.payment_method || "Non spécifié";
        methodMap.set(method, (methodMap.get(method) || 0) + amount);
        reservationDetails.push({
          label: r.bien?.title || "Bien inconnu",
          description: `${r.acquereur?.name || "Acquéreur inconnu"} (Réservation vente)`,
          amount,
          paidDate: r.reservation_date,
          managerName: resolveManager(r.bien?.assigned_to),
        });
      });
    }
    if (reservationsParcelles) {
      (reservationsParcelles as any[]).forEach((r: any) => {
        const amount = Number(r.deposit_amount || 0);
        if (amount <= 0) return;
        result.reservationsEncaissees += amount;
        const date = new Date(r.reservation_date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const monthly = monthlyMap.get(key);
        if (monthly) {
          monthly.lotissements += amount;
          monthly.total += amount;
        }
        const method = r.payment_method || "Non spécifié";
        methodMap.set(method, (methodMap.get(method) || 0) + amount);
        const parcelle = r.parcelle;
        const lotName = parcelle?.lotissement?.name || "";
        reservationDetails.push({
          label: parcelle ? `${lotName} - Parcelle ${parcelle.plot_number}` : "Parcelle inconnue",
          description: `${r.acquereur?.name || "Acquéreur inconnu"} (Réservation parcelle)`,
          amount,
          paidDate: r.reservation_date,
          managerName: resolveManager(parcelle?.assigned_to),
        });
      });
    }
    // Group reservations by manager
    reservationDetails.sort((a, b) => a.managerName.localeCompare(b.managerName) || a.label.localeCompare(b.label));
    const resGroupMap = new Map<string, RevenueDetail[]>();
    reservationDetails.forEach((d) => {
      const group = resGroupMap.get(d.managerName) || [];
      group.push(d);
      resGroupMap.set(d.managerName, group);
    });
    result.reservationsByManager = Array.from(resGroupMap.entries()).map(([managerName, dets]) => ({
      managerName,
      details: dets,
      total: dets.reduce((s, d) => s + d.amount, 0),
    }));

    // Process cautions (security deposits from contracts)
    const cautionDetails: RevenueDetail[] = [];
    if (cautions) {
      (cautions as any[]).forEach((c: any) => {
        const amount = Number(c.deposit || 0);
        if (amount <= 0) return;

        const createdDate = c.created_at ? String(c.created_at).split("T")[0] : null;
        const cautionDate = createdDate && createdDate >= fromDate && createdDate <= toDate
          ? createdDate
          : c.start_date;

        result.cautionsEncaissees += amount;
        const date = new Date(cautionDate);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const monthly = monthlyMap.get(key);
        if (monthly) {
          monthly.cautions += amount;
          monthly.total += amount;
        }
        const tenantName = c.tenant?.name || "Locataire inconnu";
        const propertyName = c.tenant?.property?.title || "";
        const ownerName = c.tenant?.property?.owner?.name || "";
        cautionDetails.push({
          label: tenantName,
          description: propertyName ? `${propertyName} (Caution)` : "Caution locative",
          amount,
          paidDate: cautionDate,
          managerName: resolveManager(c.tenant?.assigned_to),
          ownerName,
        });
      });
    }
    cautionDetails.sort((a, b) => a.managerName.localeCompare(b.managerName) || a.label.localeCompare(b.label));
    const cautionGroupMap = new Map<string, RevenueDetail[]>();
    cautionDetails.forEach((d) => {
      const group = cautionGroupMap.get(d.managerName) || [];
      group.push(d);
      cautionGroupMap.set(d.managerName, group);
    });
    result.cautionsByManager = Array.from(cautionGroupMap.entries()).map(([managerName, dets]) => ({
      managerName,
      details: dets,
      total: dets.reduce((s, d) => s + d.amount, 0),
    }));

    // Process online rent payments (not linked to regular payments)
    if (onlinePayments) {
      (onlinePayments as any[]).forEach((p: any) => {
        const amount = Number(p.amount || 0);
        if (amount <= 0) return;
        result.onlinePaymentsEncaisses += amount;
        result.loyersEncaisses += amount;
        const date = new Date(p.paid_at);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const monthly = monthlyMap.get(key);
        if (monthly) {
          monthly.loyers += amount;
          monthly.total += amount;
        }
        const method = p.payment_method || "Mobile Money";
        methodMap.set(method, (methodMap.get(method) || 0) + amount);
        const assignedTo = p.tenant?.assigned_to;
        const tenantName = p.tenant?.name || "Locataire inconnu";
        result.paidRentDetails.push({
          tenantName,
          months: [],
          amount,
          paidDate: p.paid_at?.split("T")[0] || "",
          managerName: resolveManager(assignedTo),
          paymentMethod: p.payment_method || "en_ligne",
          ownerName: p.tenant?.property?.owner?.name || "",
          propertyTitle: p.tenant?.property?.title || "",
        });
      });
    }

    // Process expenses
    const expCategoryMap = new Map<string, number>();
    if (expenses) {
      expenses.forEach((exp) => {
        const amount = Number(exp.amount);
        result.totalExpenses += amount;
        expCategoryMap.set(exp.category, (expCategoryMap.get(exp.category) || 0) + amount);

        const date = new Date(exp.expense_date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const monthly = monthlyMap.get(key);
        if (monthly) {
          monthly.depenses += amount;
        }
      });
    }

    // Add agency purchases to expense categories
    let agencyPurchaseTotal = 0;
    echeancesAchatsAgence.forEach((e: any) => {
      if (normalizeStatus(e.status) === "paid") {
        agencyPurchaseTotal += Number(e.amount);
      }
    });
    achatsAgence.forEach((a: any) => {
      const paymentType = a.payment_type;
      const dp = Number(a.down_payment || 0);
      const total = Number(a.sale_price || 0);
      const amount = paymentType === "comptant" ? (dp || total || 0) : (dp || 0);
      if (amount > 0) agencyPurchaseTotal += amount;
    });
    if (agencyPurchaseTotal > 0) {
      expCategoryMap.set("achat_agence", (expCategoryMap.get("achat_agence") || 0) + agencyPurchaseTotal);
    }

    // Calculate benefice per month
    monthlyMap.forEach((m) => {
      m.benefice = m.total - m.depenses;
    });

    result.expensesByCategory = Array.from(expCategoryMap.entries())
      .map(([name, value], i) => ({ name, value, color: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }))
      .sort((a, b) => b.value - a.value);

    result.monthlyData = Array.from(monthlyMap.values());

    const totalRevenue = result.loyersEncaisses + result.ventesEncaissees + result.achatsEncaisses + result.lotissementsEncaisses + result.reservationsEncaissees + result.cautionsEncaissees;

    result.revenueByCategory = [
      { name: "Loyers", value: result.loyersEncaisses, color: "hsl(var(--primary))" },
      { name: "Ventes Immo.", value: result.ventesEncaissees, color: "hsl(var(--emerald))" },
      { name: "Achats Immo.", value: result.achatsEncaisses, color: "hsl(var(--sand))" },
      { name: "Lotissements", value: result.lotissementsEncaisses, color: "hsl(var(--navy-light))" },
      { name: "Réservations", value: result.reservationsEncaissees, color: "hsl(var(--accent))" },
      { name: "Cautions", value: result.cautionsEncaissees, color: "hsl(var(--muted-foreground))" },
    ].filter((c) => c.value > 0);

    result.byPaymentMethod = Array.from(methodMap.entries()).map(([name, value]) => ({ name, value }));

    return { data: result, totalRevenue };
  }, [payments, echeancesVentes, ventesImmobilieres, echeancesAchats, achatsImmobiliers, echeancesParcelles, ventesParcelles, reservationsVente, reservationsParcelles, onlinePayments, cautions, expenses, managerProfiles, allEcheancesVentesNum, allEcheancesAchatsNum, allEcheancesParcellesNum, allPendingVentes, allPendingAchats, allPendingParcelles, periodFrom, periodTo]);
}
