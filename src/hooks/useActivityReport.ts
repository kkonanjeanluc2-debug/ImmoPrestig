import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

async function fetchReportForUser(
  userId: string,
  periodFrom: string,
  periodTo: string
): Promise<Omit<ActivityReportData, "userId" | "userName" | "role">> {
  // 1. Prospects (vente_prospects)
  const { data: prospects } = await supabase
    .from("vente_prospects")
    .select("id, status")
    .eq("user_id", userId)
    .gte("created_at", periodFrom)
    .lte("created_at", periodTo + "T23:59:59");

  const prospectsContacted = prospects?.length || 0;
  const prospectsConverted = prospects?.filter(p => p.status === "converted" || p.status === "won").length || 0;

  // 2. Ventes immobilières (sold_by)
  const { data: ventesImmo } = await supabase
    .from("ventes_immobilieres")
    .select("id, total_price, sale_date")
    .eq("sold_by", userId)
    .gte("sale_date", periodFrom)
    .lte("sale_date", periodTo);

  const ventesConclues = ventesImmo?.length || 0;
  const ventesAmount = ventesImmo?.reduce((s, v) => s + Number(v.total_price || 0), 0) || 0;

  // 3. Contrats de location signés
  const { data: contrats } = await supabase
    .from("contracts")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", periodFrom)
    .lte("created_at", periodTo + "T23:59:59")
    .is("deleted_at", null);

  const contratsSignes = contrats?.length || 0;

  // 4. Loyers encaissés (payments for tenants assigned to this user)
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id")
    .eq("assigned_to", userId)
    .is("deleted_at", null);

  const tenantIds = tenants?.map(t => t.id) || [];
  let loyersEncaisses = 0;
  let montantRecouvre = 0;
  let impayesSuivis = 0;

  if (tenantIds.length > 0) {
    const { data: payments } = await supabase
      .from("payments")
      .select("amount, status, paid_amount")
      .in("tenant_id", tenantIds)
      .gte("due_date", periodFrom)
      .lte("due_date", periodTo);

    loyersEncaisses = payments
      ?.filter(p => p.status === "paid")
      .reduce((s, p) => s + Number(p.amount || 0), 0) || 0;

    montantRecouvre = payments?.reduce((s, p) => {
      if (p.status === "paid") return s + Number(p.amount || 0);
      return s + Number(p.paid_amount || 0);
    }, 0) || 0;

    impayesSuivis = payments?.filter(p => p.status === "late" || p.status === "pending").length || 0;
  }

  // 5. Parcelles vendues
  const { data: ventesParcelles } = await supabase
    .from("ventes_parcelles")
    .select("id, total_price, sale_date")
    .eq("sold_by", userId)
    .gte("sale_date", periodFrom)
    .lte("sale_date", periodTo);

  const parcellesVendues = ventesParcelles?.length || 0;
  const parcellesAmount = ventesParcelles?.reduce((s, v) => s + Number(v.total_price || 0), 0) || 0;

  // 6. Achats immobiliers (biens assigned to user)
  const { data: biensAchat } = await supabase
    .from("biens_achat")
    .select("id")
    .eq("assigned_to", userId)
    .is("deleted_at", null);

  const bienAchatIds = biensAchat?.map(b => b.id) || [];
  let achatsEffectues = 0;
  let achatsAmount = 0;

  if (bienAchatIds.length > 0) {
    const { data: achats } = await supabase
      .from("achats_immobiliers")
      .select("id, sale_price, sale_date")
      .in("bien_id", bienAchatIds)
      .gte("sale_date", periodFrom)
      .lte("sale_date", periodTo);

    achatsEffectues = achats?.length || 0;
    achatsAmount = achats?.reduce((s, a) => s + Number(a.sale_price || 0), 0) || 0;
  }

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
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const report = await fetchReportForUser(user.id, periodFrom, periodTo);
      
      return {
        ...report,
        userId: user.id,
        userName: profile?.full_name || "Utilisateur",
        role: roleData?.role || "gestionnaire",
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
      const userIds = [agency.user_id, ...(members?.map(m => m.user_id) || [])];

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name || "Utilisateur"]) || []);

      // Get roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const reports: ActivityReportData[] = [];
      for (const uid of userIds) {
        const report = await fetchReportForUser(uid, periodFrom, periodTo);
        reports.push({
          ...report,
          userId: uid,
          userName: profileMap.get(uid) || "Utilisateur",
          role: roleMap.get(uid) || "admin",
        });
      }

      return reports.sort((a, b) => b.totalRevenue - a.totalRevenue);
    },
    enabled: !!user?.id && !!periodFrom && !!periodTo,
  });
}
