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

export interface RevenueDetail {
  label: string;
  description: string;
  amount: number;
  paidDate: string;
  managerName: string;
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
        .select("amount, status, due_date, paid_date, method, payment_months, paid_amount, tenant:tenants!payments_tenant_id_fkey(name, assigned_to)")
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
        .select("amount, status, due_date, paid_date, payment_method, paid_amount, vente:ventes_immobilieres(bien:biens_vente(assigned_to, title), acquereur:acquereurs(name))")
        .or(
          `and(status.eq.paid,paid_date.gte.${fromDate},paid_date.lte.${toDate}),and(status.neq.paid,due_date.gte.${fromDate},due_date.lte.${toDate})`
        );
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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
        .select("amount, status, due_date, paid_date, payment_method, paid_amount, achat:achats_immobiliers(bien:biens_achat(assigned_to, title), acquereur:acquereurs(name))")
        .or(
          `and(status.eq.paid,paid_date.gte.${fromDate},paid_date.lte.${toDate}),and(status.neq.paid,due_date.gte.${fromDate},due_date.lte.${toDate})`
        );
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch achats_immobiliers for down_payments (acomptes)
  const { data: achatsImmobiliers } = useQuery({
    queryKey: ["comptabilite-achats-immo", user?.id, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achats_immobiliers")
        .select("id, down_payment, sale_date, payment_type, sale_price, bien:biens_achat(assigned_to, title), acquereur:acquereurs(name)")
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
        .select("amount, status, due_date, paid_date, payment_method, paid_amount, vente:ventes_parcelles(sold_by, parcelle:parcelles(assigned_to, plot_number, lotissement:lotissements(name)), acquereur:acquereurs(name))")
        .or(
          `and(status.eq.paid,paid_date.gte.${fromDate},paid_date.lte.${toDate}),and(status.neq.paid,due_date.gte.${fromDate},due_date.lte.${toDate})`
        );
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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
    return Array.from(ids);
  }, [payments, echeancesVentes, ventesImmobilieres, echeancesAchats, achatsImmobiliers, echeancesParcelles, ventesParcelles]);

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
    // Collect unique assigned_to user IDs for profile resolution
    const managerIds = new Set<string>();
    if (payments) {
      payments.forEach((p: any) => {
        if (normalizeStatus(p.status) === "paid") {
          const assignedTo = p.tenant?.assigned_to;
          if (assignedTo) managerIds.add(assignedTo);
          const tenantName = p.tenant?.name || "Locataire inconnu";
          const months = p.payment_months || [];
          const amount = Number(p.paid_amount) || Number(p.amount);
          result.paidRentDetails.push({
            tenantName,
            months,
            amount,
            paidDate: p.paid_date || p.due_date,
            managerName: assignedTo || "__unassigned__",
          });
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
    processEntries(echeancesAchats as any, "achats", "achatsEncaisses", "achatsEnAttente");
    processEntries(echeancesParcelles as any, "lotissements", "lotissementsEncaisses", "lotissementsEnAttente");

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
    addDownPayments(
      achatsImmobiliers as any, "achats", "achatsEncaisses",
      (a) => a.payment_type, (a) => Number(a.sale_price), (a) => Number(a.down_payment || 0), (a) => a.sale_date
    );
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

    // Group by manager helper - combines echeances + down_payments
    const groupByManagerWithDownPayments = (
      echeances: any[] | undefined,
      parentEntries: any[] | undefined,
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
      // Paid echeances
      if (echeances) {
        echeances.forEach((e: any) => {
          if (normalizeStatus(e.status) !== "paid") return;
          details.push({
            label: getEcheanceLabel(e),
            description: getEcheanceDesc(e) + " (Échéance)",
            amount: Number(e.paid_amount) || Number(e.amount),
            paidDate: e.paid_date || e.due_date,
            managerName: resolveManager(getEcheanceAssignedTo(e)),
          });
        });
      }
      // Down payments from parent
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
      echeancesVentes as any, ventesImmobilieres as any,
      (e) => e.vente?.bien?.assigned_to,
      (e) => e.vente?.bien?.title || "Bien inconnu",
      (e) => e.vente?.acquereur?.name || "Acquéreur inconnu",
      (v) => v.bien?.assigned_to,
      (v) => v.bien?.title || "Bien inconnu",
      (v) => v.acquereur?.name || "Acquéreur inconnu",
      (v) => v.payment_type, (v) => Number(v.total_price), (v) => Number(v.down_payment || 0)
    );

    result.achatsByManager = groupByManagerWithDownPayments(
      echeancesAchats as any, achatsImmobiliers as any,
      (e) => e.achat?.bien?.assigned_to,
      (e) => e.achat?.bien?.title || "Bien inconnu",
      (e) => e.achat?.acquereur?.name || "Acquéreur inconnu",
      (a) => a.bien?.assigned_to,
      (a) => a.bien?.title || "Bien inconnu",
      (a) => a.acquereur?.name || "Acquéreur inconnu",
      (a) => a.payment_type, (a) => Number(a.sale_price), (a) => Number(a.down_payment || 0)
    );

    result.lotissementsByManager = groupByManagerWithDownPayments(
      echeancesParcelles as any, ventesParcelles as any,
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
  }, [payments, echeancesVentes, echeancesAchats, echeancesParcelles, expenses, managerProfiles, periodFrom, periodTo]);
}
