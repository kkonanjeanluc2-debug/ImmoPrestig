import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { isEmailEnabled } from "../_shared/check-email-enabled.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OwnerData {
  id: string;
  name: string;
  email: string;
  user_id: string;
  management_type: {
    id: string;
    name: string;
    percentage: number;
    type: string;
  }[] | null;
}

interface PropertyData {
  id: string;
  title: string;
  owner_id: string;
}

interface TenantData {
  id: string;
  name: string;
  property_id: string;
}

interface PaymentData {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string;
  tenant_id: string;
}

interface AgencyData {
  name: string;
  email: string;
  phone: string | null;
  logo_url: string | null;
}

interface CommissionDetail {
  tenantName: string;
  propertyTitle: string;
  amount: number;
  paidDate: string;
  commission: number;
}

const getMonthName = (month: number): string => {
  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  return months[month];
};

const generateCommissionReportHtml = (
  ownerName: string,
  period: string,
  commissionDetails: CommissionDetail[],
  totalRevenue: number,
  totalCommission: number,
  netAmount: number,
  percentage: number,
  managementTypeName: string,
  agency: AgencyData | null
): string => {
  const agencyName = agency?.name || "Votre gestionnaire immobilier";
  const agencyContact = [agency?.phone, agency?.email].filter(Boolean).join(" | ");

  const detailsRows = commissionDetails.map(detail => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${detail.propertyTitle}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${detail.tenantName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${new Date(detail.paidDate).toLocaleDateString("fr-FR")}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${detail.amount.toLocaleString("fr-FR")} F</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #e53e3e;">${detail.commission.toLocaleString("fr-FR")} F</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #1a365d; color: white; padding: 25px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { padding: 25px; }
        .period-box { background: #e8f4f8; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 20px; font-weight: bold; color: #1a365d; }
        .summary { display: flex; gap: 15px; margin-bottom: 25px; }
        .summary-box { flex: 1; padding: 15px; border-radius: 8px; text-align: center; }
        .summary-box.revenue { background: #e8f5e9; }
        .summary-box.commission { background: #fff3e0; }
        .summary-box.net { background: #e3f2fd; }
        .summary-box .label { font-size: 12px; color: #666; text-transform: uppercase; }
        .summary-box .value { font-size: 20px; font-weight: bold; margin-top: 5px; }
        .summary-box.revenue .value { color: #2e7d32; }
        .summary-box.commission .value { color: #ef6c00; }
        .summary-box.net .value { color: #1565c0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f8f9fa; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; }
        th:last-child, th:nth-last-child(2) { text-align: right; }
        .total-row { background: #1a365d; color: white; font-weight: bold; }
        .total-row td { padding: 15px 12px; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; background: #f0f0f0; }
        .management-type { font-size: 13px; color: #666; text-align: center; margin-bottom: 15px; }
        .management-type strong { color: #1a365d; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${agency?.logo_url ? `<img src="${agency.logo_url}" alt="Logo" style="max-height: 50px; margin-bottom: 10px;">` : ''}
          <h1>📊 RAPPORT DE COMMISSIONS</h1>
          <p>${ownerName}</p>
        </div>
        <div class="content">
          <div class="period-box">
            📅 Période : ${period}
          </div>
          
          <div class="management-type">
            Type de gestion : <strong>${managementTypeName}</strong> (${percentage}%)
          </div>
          
          <div class="summary">
            <div class="summary-box revenue">
              <div class="label">💰 Loyers perçus</div>
              <div class="value">${totalRevenue.toLocaleString("fr-FR")} F</div>
            </div>
            <div class="summary-box commission">
              <div class="label">📊 Commission agence</div>
              <div class="value">-${totalCommission.toLocaleString("fr-FR")} F</div>
            </div>
            <div class="summary-box net">
              <div class="label">✅ Net à reverser</div>
              <div class="value">${netAmount.toLocaleString("fr-FR")} F</div>
            </div>
          </div>
          
          <h3 style="color: #1a365d; margin-bottom: 10px;">Détail des paiements</h3>
          <table>
            <thead>
              <tr>
                <th>Bien</th>
                <th>Locataire</th>
                <th>Date paiement</th>
                <th>Montant</th>
                <th>Commission</th>
              </tr>
            </thead>
            <tbody>
              ${detailsRows}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3">TOTAL</td>
                <td style="text-align: right;">${totalRevenue.toLocaleString("fr-FR")} F</td>
                <td style="text-align: right;">${totalCommission.toLocaleString("fr-FR")} F</td>
              </tr>
            </tfoot>
          </table>
          
          <div style="margin-top: 25px; padding: 15px; background: #e8f5e9; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #2e7d32; font-size: 16px;">
              <strong>💵 Montant net à vous reverser : ${netAmount.toLocaleString("fr-FR")} F CFA</strong>
            </p>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0 0 5px 0;"><strong>${agencyName}</strong></p>
          ${agencyContact ? `<p style="margin: 0;">${agencyContact}</p>` : ''}
          <p style="margin: 10px 0 0 0; font-size: 11px; color: #aaa;">Ce rapport est généré automatiquement chaque mois.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailEnabled = await isEmailEnabled();
    if (!emailEnabled) {
      return new Response(
        JSON.stringify({ success: false, error: "L'envoi d'emails est désactivé par l'administrateur" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let targetMonth: Date;
    let targetUserId: string | null = null;

    try {
      const body = await req.json();
      if (body.month && body.year) {
        targetMonth = new Date(body.year, body.month - 1, 1);
      } else {
        const now = new Date();
        targetMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }
      targetUserId = body.user_id || null;
    } catch {
      const now = new Date();
      targetMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    const firstDayOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    const period = `${getMonthName(targetMonth.getMonth())} ${targetMonth.getFullYear()}`;

    console.log(`Processing commission reports for ${period}`);

    // Get all owners with management types
    let ownersQuery = supabase
      .from("owners")
      .select(`
        id,
        name,
        email,
        user_id,
        management_type:management_types(id, name, percentage, type)
      `)
      .eq("status", "actif");

    if (targetUserId) {
      ownersQuery = ownersQuery.eq("user_id", targetUserId);
    }

    const { data: owners, error: ownersError } = await ownersQuery;

    if (ownersError) {
      throw ownersError;
    }

    console.log(`Found ${owners?.length || 0} active owners`);

    // Get properties
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("id, title, owner_id");

    if (propertiesError) {
      throw propertiesError;
    }

    // Get tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name, property_id");

    if (tenantsError) {
      throw tenantsError;
    }

    // Get paid payments for the month
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("id, amount, due_date, paid_date, tenant_id")
      .eq("status", "paid")
      .gte("due_date", firstDayOfMonth.toISOString().split("T")[0])
      .lte("due_date", lastDayOfMonth.toISOString().split("T")[0]);

    if (paymentsError) {
      throw paymentsError;
    }

    console.log(`Found ${payments?.length || 0} paid payments for the month`);

    // Build lookup maps
    const propertyMap = new Map<string, PropertyData>();
    (properties || []).forEach((p: PropertyData) => propertyMap.set(p.id, p));

    const tenantMap = new Map<string, TenantData>();
    (tenants || []).forEach((t: TenantData) => tenantMap.set(t.id, t));

    // Get agency info for each unique user
    const userIds = [...new Set((owners || []).map((o: OwnerData) => o.user_id))];
    const agencyMap = new Map<string, AgencyData | null>();

    for (const userId of userIds) {
      const { data: agency } = await supabase
        .from("agencies")
        .select("name, email, phone, logo_url")
        .eq("user_id", userId)
        .single();
      agencyMap.set(userId, agency);
    }

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const owner of (owners || []) as OwnerData[]) {
      results.processed++;

      // Check if report was already sent
      const { data: existingLog } = await supabase
        .from("email_logs")
        .select("id")
        .eq("tenant_id", owner.id)
        .eq("email_type", "commission_report")
        .gte("created_at", firstDayOfMonth.toISOString())
        .lte("created_at", lastDayOfMonth.toISOString())
        .single();

      if (existingLog) {
        console.log(`Commission report already sent to ${owner.email} for ${period}, skipping`);
        results.skipped++;
        continue;
      }

      if (!owner.email) {
        console.log(`No email for owner ${owner.name}, skipping`);
        results.skipped++;
        continue;
      }

      // Get management type info
      const managementType = Array.isArray(owner.management_type) 
        ? owner.management_type[0] 
        : owner.management_type;
      
      const percentage = managementType?.percentage || 0;
      const managementTypeName = managementType?.name || "Non défini";

      // Get owner's properties
      const ownerProperties = (properties || []).filter((p: PropertyData) => p.owner_id === owner.id);
      const ownerPropertyIds = ownerProperties.map((p: PropertyData) => p.id);

      // Get tenants for owner's properties
      const ownerTenants = (tenants || []).filter((t: TenantData) => ownerPropertyIds.includes(t.property_id));
      const ownerTenantIds = ownerTenants.map((t: TenantData) => t.id);

      // Get payments for owner's tenants
      const ownerPayments = (payments || []).filter((p: PaymentData) => ownerTenantIds.includes(p.tenant_id));

      if (ownerPayments.length === 0) {
        console.log(`No payments for owner ${owner.name} this month, skipping`);
        results.skipped++;
        continue;
      }

      // Calculate commissions
      const commissionDetails: CommissionDetail[] = [];
      let totalRevenue = 0;
      let totalCommission = 0;

      for (const payment of ownerPayments) {
        const tenant = tenantMap.get(payment.tenant_id);
        const property = tenant ? propertyMap.get(tenant.property_id) : null;
        const amount = Number(payment.amount);
        const commission = (amount * percentage) / 100;

        commissionDetails.push({
          tenantName: tenant?.name || "Locataire inconnu",
          propertyTitle: property?.title || "Bien inconnu",
          amount,
          paidDate: payment.paid_date,
          commission,
        });

        totalRevenue += amount;
        totalCommission += commission;
      }

      const netAmount = totalRevenue - totalCommission;
      const agency = agencyMap.get(owner.user_id) || null;

      try {
        const fromName = agency?.name || "Gestion Locative";
        const emailResponse = await sendEmail({
          from: `${fromName} <noreply@immoprestigeci.com>`,
          to: [owner.email],
          subject: `📊 Rapport de commissions - ${period}`,
          html: generateCommissionReportHtml(
            owner.name,
            period,
            commissionDetails,
            totalRevenue,
            totalCommission,
            netAmount,
            percentage,
            managementTypeName,
            agency
          ),
        });

        if (!emailResponse.success) throw new Error(emailResponse.error);

        console.log(`Commission report sent to ${owner.email}:`, emailResponse);

        // Log the email (using tenant_id field for owner_id for compatibility)
        await supabase.from("email_logs").insert({
          user_id: owner.user_id,
          tenant_id: owner.id,
          email_type: "commission_report",
          recipient_email: owner.email,
          subject: `Rapport de commissions - ${period}`,
          status: "sent",
        });

        // Create notification
        await supabase.from("notifications").insert({
          user_id: owner.user_id,
          title: "Rapport de commissions envoyé",
          message: `Rapport ${period} envoyé à ${owner.name}`,
          type: "info",
          entity_type: "owner",
          entity_id: owner.id,
        });

        results.sent++;
      } catch (emailError: unknown) {
        const errorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
        console.error(`Failed to send commission report to ${owner.email}:`, emailError);
        results.errors.push(`Owner ${owner.name}: ${errorMessage}`);
      }
    }

    console.log("Processing complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Traitement terminé: ${results.sent} rapports envoyés, ${results.skipped} ignorés`,
        period,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-commission-reports:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
