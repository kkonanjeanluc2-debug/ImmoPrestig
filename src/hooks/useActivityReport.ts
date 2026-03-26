import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCollectedRevenueForPeriod } from "@/lib/revenueCollections";

export interface ActivityReportData {
  userId: string;
  userName: string;
  role: string;
  // Prospection
  prospectsContacted: number;
  // Ventes
  ventesConclues: number;
  ventesAmount: number;
  // Locations
  contratsSignes: number;
  loyersEncaisses: number;
  // Recouvrement
  montantRecouvre: number;
  impayesSuivis: number;
  // Lotissements
  parcellesVendues: number;
  parcellesAmount: number;
  // Achats
  achatsEffectues: number;
  achatsAmount: number;
  // Conversion
  tauxConversion: number;
  // Total
  totalRevenue: number;
}

/**
 * Fetches all raw data needed for activity reports in bulk,
 * then distributes per-user based on assigned_to / sold_by fields
 * to match the dashboard logic exactly.
 */
async function fetchAllReportData(periodFrom: string, periodTo: string) {
  // 1. All properties (to map assigned_to)
  const { data: properties } = await supabase
    .from("properties")
    .select("id, assigned_to")
    .is("deleted_at", null);

  // 2. All tenants (to link property → tenant)
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, property_id")
    .is("deleted_at", null);

  // 3. All payments in period
  const { data: payments } = await supabase
    .from("payments")
    .select("id, tenant_id, amount, status, paid_amount, due_date, paid_date, payment_months")
    .or(
      `and(status.eq.paid,paid_date.gte.${periodFrom},paid_date.lte.${periodTo}),and(status.neq.paid,due_date.gte.${periodFrom},due_date.lte.${periodTo}),and(status.neq.paid,paid_amount.gt.0,paid_date.gte.${periodFrom},paid_date.lte.${periodTo})`
    );

  // 4. Contracts created in period
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, property_id, created_at")
    .is("deleted_at", null)
    .gte("created_at", periodFrom)
    .lte("created_at", periodTo + "T23:59:59");

  // 5. Vente prospects
  const { data: prospects } = await supabase
    .from("vente_prospects")
    .select("id, status, user_id")
    .gte("created_at", periodFrom)
    .lte("created_at", periodTo + "T23:59:59");

  // 6. Ventes immobilières with bien info for assigned_to
  const { data: ventesImmo } = await supabase
    .from("ventes_immobilieres")
    .select("id, total_price, sale_date, sold_by, down_payment, payment_type, bien_id")
    .gte("sale_date", periodFrom)
    .lte("sale_date", periodTo);

  // 6b. Biens vente for assigned_to mapping
  const { data: biensVente } = await supabase
    .from("biens_vente")
    .select("id, assigned_to")
    .is("deleted_at", null);

  // 7. Échéances ventes paid in period
  const { data: echeancesVentes } = await supabase
    .from("echeances_ventes")
    .select("id, vente_id, amount, status, paid_date, paid_amount")
    .eq("status", "paid")
    .gte("paid_date", periodFrom)
    .lte("paid_date", periodTo);

  // 8. Ventes parcelles
  const { data: ventesParcelles } = await supabase
    .from("ventes_parcelles")
    .select("id, total_price, sale_date, sold_by, down_payment, payment_type, parcelle_id")
    .gte("sale_date", periodFrom)
    .lte("sale_date", periodTo);

  // 8b. Parcelles for assigned_to mapping
  const { data: parcelles } = await supabase
    .from("parcelles")
    .select("id, assigned_to");

  // 9. Échéances parcelles paid in period
  const { data: echeancesParcelles } = await supabase
    .from("echeances_parcelles")
    .select("id, vente_id, amount, status, paid_date, paid_amount")
    .eq("status", "paid")
    .gte("paid_date", periodFrom)
    .lte("paid_date", periodTo);

  // 10. Achats immobiliers
  const { data: achatsImmo } = await supabase
    .from("achats_immobiliers")
    .select("id, sale_price, sale_date, bien_id, down_payment, payment_type")
    .gte("sale_date", periodFrom)
    .lte("sale_date", periodTo);

  // 10b. Biens achat for assigned_to mapping
  const { data: biensAchat } = await supabase
    .from("biens_achat")
    .select("id, assigned_to")
    .is("deleted_at", null);

  // 11. Échéances achats paid in period
  const { data: echeancesAchats } = await supabase
    .from("echeances_achats")
    .select("id, achat_id, amount, status, paid_date, paid_amount")
    .or(`status.eq.paye,status.eq.paid`)
    .gte("paid_date", periodFrom)
    .lte("paid_date", periodTo);

  return {
    properties: properties || [],
    tenants: tenants || [],
    payments: payments || [],
    contracts: contracts || [],
    prospects: prospects || [],
    ventesImmo: ventesImmo || [],
    biensVente: biensVente || [],
    echeancesVentes: echeancesVentes || [],
    ventesParcelles: ventesParcelles || [],
    parcelles: parcelles || [],
    echeancesParcelles: echeancesParcelles || [],
    achatsImmo: achatsImmo || [],
    biensAchat: biensAchat || [],
    echeancesAchats: echeancesAchats || [],
  };
}

function computeReportForUser(
  userId: string,
  data: Awaited<ReturnType<typeof fetchAllReportData>>,
  periodFrom: string,
  periodTo: string
): Omit<ActivityReportData, "userId" | "userName" | "role"> {
  // --- LOYERS: property.assigned_to → tenants → payments (same as dashboard) ---
  const assignedPropertyIds = new Set(
    data.properties.filter((p: any) => p.assigned_to === userId).map((p: any) => p.id)
  );
  const assignedTenantIds = new Set(
    data.tenants.filter((t: any) => t.property_id && assignedPropertyIds.has(t.property_id)).map((t: any) => t.id)
  );
  const userPayments = data.payments.filter((p: any) => assignedTenantIds.has(p.tenant_id));

  // Use the same centralized revenue calculation as accounting
  const loyersEncaisses = getCollectedRevenueForPeriod(userPayments, periodFrom, periodTo);

  const montantRecouvre = getCollectedRevenueForPeriod(userPayments, periodFrom, periodTo);

  const impayesSuivis = userPayments.filter(
    (p: any) => p.status === "late" || p.status === "pending"
  ).length;

  // --- CONTRATS: contracts on assigned properties ---
  const contratsSignes = data.contracts.filter(
    (c: any) => c.property_id && assignedPropertyIds.has(c.property_id)
  ).length;

  // --- PROSPECTS ---
  const userProspects = data.prospects.filter((p: any) => p.user_id === userId);
  const prospectsContacted = userProspects.length;
  const prospectsConverted = userProspects.filter(
    (p: any) => p.status === "converted" || p.status === "won"
  ).length;

  // --- VENTES IMMOBILIÈRES: sold_by OR bien.assigned_to ---
  const bienVenteAssignMap = new Map(data.biensVente.map((b: any) => [b.id, b.assigned_to]));
  const userVentesImmo = data.ventesImmo.filter((v: any) => {
    return v.sold_by === userId || bienVenteAssignMap.get(v.bien_id) === userId;
  });
  const ventesConclues = userVentesImmo.length;

  // Calculate ventes revenue: down_payment + échéances paid
  let ventesAmount = 0;
  const venteImmoIds = new Set(userVentesImmo.map((v: any) => v.id));
  userVentesImmo.forEach((v: any) => {
    if (v.payment_type === "comptant") {
      ventesAmount += Number(v.total_price || 0);
    } else {
      ventesAmount += Number(v.down_payment || 0);
    }
  });
  data.echeancesVentes.forEach((e: any) => {
    if (venteImmoIds.has(e.vente_id)) {
      ventesAmount += Number(e.paid_amount || e.amount || 0);
    }
  });

  // --- VENTES PARCELLES: sold_by OR parcelle.assigned_to ---
  const parcelleAssignMap = new Map(data.parcelles.map((p: any) => [p.id, p.assigned_to]));
  const userVentesParcelles = data.ventesParcelles.filter((v: any) => {
    return v.sold_by === userId || parcelleAssignMap.get(v.parcelle_id) === userId;
  });
  const parcellesVendues = userVentesParcelles.length;

  let parcellesAmount = 0;
  const venteParcelleIds = new Set(userVentesParcelles.map((v: any) => v.id));
  userVentesParcelles.forEach((v: any) => {
    if (v.payment_type === "comptant") {
      parcellesAmount += Number(v.total_price || 0);
    } else {
      parcellesAmount += Number(v.down_payment || 0);
    }
  });
  data.echeancesParcelles.forEach((e: any) => {
    if (venteParcelleIds.has(e.vente_id)) {
      parcellesAmount += Number(e.paid_amount || e.amount || 0);
    }
  });

  // --- ACHATS: bien_achat.assigned_to ---
  const bienAchatAssignMap = new Map(data.biensAchat.map((b: any) => [b.id, b.assigned_to]));
  const userAchats = data.achatsImmo.filter((a: any) => bienAchatAssignMap.get(a.bien_id) === userId);
  const achatsEffectues = userAchats.length;

  let achatsAmount = 0;
  const achatIds = new Set(userAchats.map((a: any) => a.id));
  userAchats.forEach((a: any) => {
    if (a.payment_type === "comptant") {
      achatsAmount += Number(a.sale_price || 0);
    } else {
      achatsAmount += Number(a.down_payment || 0);
    }
  });
  data.echeancesAchats.forEach((e: any) => {
    if (achatIds.has(e.achat_id)) {
      achatsAmount += Number(e.paid_amount || e.amount || 0);
    }
  });

  const tauxConversion = prospectsContacted > 0
    ? Math.round((prospectsConverted / prospectsContacted) * 100)
    : 0;

  const totalRevenue = ventesAmount + loyersEncaisses + parcellesAmount + achatsAmount;

  return {
    prospectsContacted,
    ventesConclues,
    ventesAmount,
    contratsSignes,
    loyersEncaisses,
    montantRecouvre,
    impayesSuivis,
    parcellesVendues,
    parcellesAmount,
    achatsEffectues,
    achatsAmount,
    tauxConversion,
    totalRevenue,
  };
}

export function useActivityReport(periodFrom: string, periodTo: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activity-report", user?.id, periodFrom, periodTo],
    queryFn: async () => {
      if (!user?.id) return null;

      const [profileRes, roleRes, rawData] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
        fetchAllReportData(periodFrom, periodTo),
      ]);

      const report = computeReportForUser(user.id, rawData, periodFrom, periodTo);

      return {
        ...report,
        userId: user.id,
        userName: profileRes.data?.full_name || "Utilisateur",
        role: roleRes.data?.role || "gestionnaire",
      } as ActivityReportData;
    },
    enabled: !!user?.id && !!periodFrom && !!periodTo,
  });
}

export function useAllManagersReport(periodFrom: string, periodTo: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-managers-report", periodFrom, periodTo],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get agency
      const { data: agency } = await supabase
        .from("agencies")
        .select("id, user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!agency) return [];

      // Get all team members
      const { data: members } = await supabase
        .from("agency_members")
        .select("user_id, role")
        .eq("agency_id", agency.id)
        .eq("status", "active");

      // Include agency owner + all members
      const userIds = [...new Set([agency.user_id, ...(members?.map(m => m.user_id) || [])])];

      // Fetch profiles, roles, and all report data in parallel
      const [profilesRes, rolesRes, rawData] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
        fetchAllReportData(periodFrom, periodTo),
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p.full_name || "Utilisateur"]) || []);
      const roleMap = new Map(rolesRes.data?.map(r => [r.user_id, r.role]) || []);

      const reports: ActivityReportData[] = userIds.map(uid => {
        const report = computeReportForUser(uid, rawData, periodFrom, periodTo);
        return {
          ...report,
          userId: uid,
          userName: profileMap.get(uid) || "Utilisateur",
          role: roleMap.get(uid) || "admin",
        };
      });

      return reports.sort((a, b) => b.totalRevenue - a.totalRevenue);
    },
    enabled: !!user?.id && !!periodFrom && !!periodTo,
  });
}
