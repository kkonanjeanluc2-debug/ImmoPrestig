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
}

export interface ManagerRentGroup {
  managerName: string;
  details: PaidRentDetail[];
  total: number;
}

export interface ComptabiliteData {
  // Revenue sources
  loyersEncaisses: number;
  ventesEncaissees: number;
  achatsEncaisses: number;
  lotissementsEncaisses: number;
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
}

export interface MonthlyEntry {
  name: string;
  loyers: number;
  ventes: number;
  achats: number;
  lotissements: number;
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

export function useComptabilite(periodFrom: Date, periodTo: Date) {
  const { user } = useAuth();
  const fromDate = periodFrom.toISOString().split("T")[0];
  const toDate = periodTo.toISOString().split("T")[0];

  const { data: payments } = useQuery({
    queryKey: ["comptabilite-payments", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, status, due_date, paid_date, method, payment_months, paid_amount, tenant:tenants!payments_tenant_id_fkey(name)")
        .or(
          `and(status.eq.paid,paid_date.gte.${fromDate},paid_date.lte.${toDate}),and(status.neq.paid,due_date.gte.${fromDate},due_date.lte.${toDate})`
        );
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: echeancesVentes } = useQuery({
    queryKey: ["comptabilite-ventes", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_ventes")
        .select("amount, status, due_date, paid_date, payment_method")
        .gte("due_date", periodFrom.toISOString().split("T")[0])
        .lte("due_date", periodTo.toISOString().split("T")[0]);
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
        .select("amount, status, due_date, paid_date, payment_method")
        .gte("due_date", periodFrom.toISOString().split("T")[0])
        .lte("due_date", periodTo.toISOString().split("T")[0]);
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
        .select("amount, status, due_date, paid_date, payment_method")
        .gte("due_date", periodFrom.toISOString().split("T")[0])
        .lte("due_date", periodTo.toISOString().split("T")[0]);
      if (error) throw error;
      return data;
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

  return useMemo(() => {
    const result: ComptabiliteData = {
      loyersEncaisses: 0,
      ventesEncaissees: 0,
      achatsEncaisses: 0,
      lotissementsEncaisses: 0,
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

    processEntries(
      (payments || []).map((p: any) => ({
        ...p,
        payment_method: p.method,
        due_date: p.status === "paid" && p.paid_date ? p.paid_date : p.due_date,
      })),
      "loyers",
      "loyersEncaisses",
      "loyersEnAttente"
    );

    // Build detailed paid rent entries
    if (payments) {
      payments.forEach((p: any) => {
        if (normalizeStatus(p.status) === "paid") {
          const tenantName = p.tenant?.name || "Locataire inconnu";
          const months = p.payment_months || [];
          const amount = Number(p.paid_amount) || Number(p.amount);
          result.paidRentDetails.push({
            tenantName,
            months,
            amount,
            paidDate: p.paid_date || p.due_date,
          });
        }
      });
      // Sort by tenant name then date
      result.paidRentDetails.sort((a, b) => a.tenantName.localeCompare(b.tenantName) || a.paidDate.localeCompare(b.paidDate));
    }
    processEntries(echeancesVentes as any, "ventes", "ventesEncaissees", "ventesEnAttente");
    processEntries(echeancesAchats as any, "achats", "achatsEncaisses", "achatsEnAttente");
    processEntries(echeancesParcelles as any, "lotissements", "lotissementsEncaisses", "lotissementsEnAttente");

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

    // Calculate benefice per month
    monthlyMap.forEach((m) => {
      m.benefice = m.total - m.depenses;
    });

    result.expensesByCategory = Array.from(expCategoryMap.entries())
      .map(([name, value], i) => ({ name, value, color: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }))
      .sort((a, b) => b.value - a.value);

    result.monthlyData = Array.from(monthlyMap.values());

    const totalRevenue = result.loyersEncaisses + result.ventesEncaissees + result.achatsEncaisses + result.lotissementsEncaisses;

    result.revenueByCategory = [
      { name: "Loyers", value: result.loyersEncaisses, color: "hsl(var(--primary))" },
      { name: "Ventes Immo.", value: result.ventesEncaissees, color: "hsl(var(--emerald))" },
      { name: "Achats Immo.", value: result.achatsEncaisses, color: "hsl(var(--sand))" },
      { name: "Lotissements", value: result.lotissementsEncaisses, color: "hsl(var(--navy-light))" },
    ].filter((c) => c.value > 0);

    result.byPaymentMethod = Array.from(methodMap.entries()).map(([name, value]) => ({ name, value }));

    return { data: result, totalRevenue };
  }, [payments, echeancesVentes, echeancesAchats, echeancesParcelles, expenses, periodFrom, periodTo]);
}
