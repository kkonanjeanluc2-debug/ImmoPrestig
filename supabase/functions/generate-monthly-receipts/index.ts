import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { validateAuth, corsHeaders, unauthorizedResponse } from "../_shared/auth.ts";
import { isEmailEnabled } from "../_shared/check-email-enabled.ts";

interface TenantData {
  id: string;
  name: string;
  email: string;
  property: PropertyData[] | null;
  unit?: UnitData[] | null;
}

interface UnitData {
  unit_number: string | null;
}

interface PropertyData {
  id: string;
  title: string;
  address: string;
  assigned_to?: string | null;
  owner: OwnerData[] | null;
}

interface OwnerData {
  name: string;
}

interface AgencyData {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  logo_url: string | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string;
  method: string | null;
  user_id: string;
  tenant_id: string;
  tenant: TenantData[] | null;
}

const getPaymentPeriod = (dueDate: string): string => {
  const date = new Date(dueDate);
  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const generateReceiptHtml = (
  paymentId: string,
  amount: number,
  dueDate: string,
  paidDate: string,
  method: string | null,
  tenantName: string,
  tenantEmail: string,
  propertyTitle: string,
  propertyAddress: string,
  ownerName: string | null,
  period: string,
  agency: AgencyData | null,
  unitNumber?: string | null,
  gestionnaireName?: string | null
): string => {
  const agencyName = agency?.name || "Votre gestionnaire immobilier";
  const agencyContact = [agency?.phone, agency?.email].filter(Boolean).join(" | ");
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #1a365d; color: white; padding: 25px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { padding: 25px; }
        .period-box { background: #e8f4f8; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 20px; font-weight: bold; color: #1a365d; }
        .amount-box { background: #1a365d; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .amount { font-size: 28px; font-weight: bold; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .details-title { color: #1a365d; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .row:last-child { border-bottom: none; }
        .label { color: #666; }
        .value { font-weight: 500; }
        .declaration { font-size: 13px; color: #555; margin-top: 20px; line-height: 1.6; padding: 15px; background: #fafafa; border-radius: 8px; border-left: 3px solid #1a365d; }
        .signature { text-align: right; margin-top: 25px; font-style: italic; color: #666; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; background: #f0f0f0; }
        .badge { display: inline-block; background: #38a169; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${agency?.logo_url ? `<img src="${agency.logo_url}" alt="Logo" style="max-height: 50px; margin-bottom: 10px;">` : ''}
          <h1>QUITTANCE DE LOYER</h1>
          <p>N° ${paymentId.substring(0, 8).toUpperCase()}</p>
        </div>
        <div class="content">
          <div class="period-box">
            📅 Période : ${period}
          </div>
          
          <div style="display: flex; gap: 15px; margin-bottom: 15px;">
            <div class="details" style="flex: 1;">
              <p class="details-title">👤 Bailleur</p>
              <p style="margin: 0; font-weight: 500;">${ownerName || agencyName}</p>
            </div>
            <div class="details" style="flex: 1;">
              <p class="details-title">🏠 Locataire</p>
              <p style="margin: 0; font-weight: 500;">${tenantName}</p>
              <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">${tenantEmail}</p>
            </div>
          </div>
          
          <div class="details">
            <p class="details-title">📍 Bien loué</p>
            <p style="margin: 0; font-weight: 500;">${propertyTitle}</p>
            ${unitNumber ? `<p style="margin: 5px 0 0 0; font-weight: 600; color: #1a365d; font-size: 13px;">Porte : ${unitNumber}</p>` : ''}
            ${propertyAddress ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">${propertyAddress}</p>` : ''}
          </div>
          
          <div class="amount-box">
            <p style="margin: 0 0 5px 0; font-size: 14px; opacity: 0.9;">Montant du loyer reçu</p>
            <p class="amount" style="margin: 0;">${amount.toLocaleString("fr-FR")} F CFA</p>
            <span class="badge" style="margin-top: 10px;">✓ PAYÉ</span>
          </div>
          
          <div class="details">
            <div class="row">
              <span class="label">📆 Date d'échéance</span>
              <span class="value">${new Date(dueDate).toLocaleDateString("fr-FR")}</span>
            </div>
            <div class="row">
              <span class="label">✅ Date de paiement</span>
              <span class="value">${new Date(paidDate).toLocaleDateString("fr-FR")}</span>
            </div>
            <div class="row">
              <span class="label">💳 Mode de paiement</span>
              <span class="value">${method || 'Non spécifié'}</span>
            </div>
            ${gestionnaireName ? `<div class="row">
              <span class="label">👤 Gestionnaire</span>
              <span class="value">${gestionnaireName}</span>
            </div>` : ''}
          </div>
          
          <div class="declaration">
            Je soussigné(e), ${ownerName || agencyName}, propriétaire/gestionnaire du bien désigné ci-dessus, 
            déclare avoir reçu de ${tenantName} la somme de ${amount.toLocaleString("fr-FR")} F CFA 
            au titre du loyer pour la période de ${period}, et lui en donne quittance, sous réserve de tous mes droits.
          </div>
          
          <p class="signature">
            Fait le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}<br>
            <strong>${ownerName || agencyName}</strong>
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 5px 0;"><strong>${agencyName}</strong></p>
          ${agencyContact ? `<p style="margin: 0;">${agencyContact}</p>` : ''}
          <p style="margin: 10px 0 0 0; font-size: 11px; color: #aaa;">Ce document est une quittance de loyer générée automatiquement.</p>
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

    // Validate authentication
    const auth = await validateAuth(req);
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use authenticated user's ID - ignore any user_id from body for security
    const targetUserId = auth.userId!;

    console.log(`Processing receipts for user ${targetUserId} - paid payments without receipts yet`);

    // Build query for paid payments that haven't had receipts sent yet
    // Filter by authenticated user for security
    let query = supabase
      .from("payments")
      .select(`
        id,
        amount,
        due_date,
        paid_date,
        method,
        user_id,
        tenant_id,
        tenant:tenants(
          id,
          name,
          email,
          unit_id,
          unit:property_units(unit_number),
          property:properties(
            id,
            title,
            address,
            assigned_to,
            owner:owners(name)
          )
        )
      `)
      .eq("status", "paid")
      .not("paid_date", "is", null)
      .eq("user_id", targetUserId); // Always filter by authenticated user

    const { data: payments, error: paymentsError } = await query;

    if (paymentsError) {
      throw paymentsError;
    }

    console.log(`Found ${payments?.length || 0} paid payments for the month`);

    // Get agency info for each unique user
    const userIds = [...new Set((payments || []).map((p: PaymentRow) => p.user_id))];
    const agencyMap = new Map<string, AgencyData | null>();

    for (const userId of userIds) {
      const { data: agency } = await supabase
        .from("agencies")
        .select("name, email, phone, address, city, country, logo_url")
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

    for (const payment of (payments || []) as PaymentRow[]) {
      results.processed++;

      // Check if a receipt email was already sent for this payment
      const { data: existingLog } = await supabase
        .from("email_logs")
        .select("id")
        .eq("payment_id", payment.id)
        .eq("email_type", "receipt")
        .eq("status", "sent")
        .single();

      if (existingLog) {
        console.log(`Receipt already sent for payment ${payment.id}, skipping`);
        results.skipped++;
        continue;
      }

      // Extract tenant data (Supabase returns arrays for joins)
      const tenantArray = payment.tenant;
      const tenant = Array.isArray(tenantArray) ? tenantArray[0] : null;
      
      if (!tenant?.email) {
        console.log(`No email for tenant of payment ${payment.id}, skipping`);
        results.skipped++;
        continue;
      }

      // Extract property and owner data
      const propertyArray = tenant.property;
      const property = Array.isArray(propertyArray) ? propertyArray[0] : null;
      const ownerArray = property?.owner;
      const owner = Array.isArray(ownerArray) ? ownerArray[0] : null;

      // Extract unit number
      const unitArray = tenant.unit;
      const unit = Array.isArray(unitArray) ? unitArray[0] : null;
      const unitNumber = unit?.unit_number || null;

      // Get gestionnaire name if property is assigned
      let gestionnaireName: string | null = null;
      if (property?.assigned_to) {
        const { data: gProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", property.assigned_to)
          .maybeSingle();
        gestionnaireName = gProfile?.full_name || null;
      }

      const period = getPaymentPeriod(payment.due_date);
      const propertyTitle = property?.title || "Bien loué";
      const propertyAddress = property?.address || "";
      const ownerName = owner?.name || null;
      const agency = agencyMap.get(payment.user_id) || null;

      try {
        // Send the receipt email
        const fromName = agency?.name || "Gestion Locative";
        const emailResponse = await sendEmail({
          from: `QUITTANCE LOYER <noreply@immoprestigeci.com>`,
          to: [tenant.email],
          subject: `✅ Quittance de loyer - ${period} - ${propertyTitle}`,
          html: generateReceiptHtml(
            payment.id,
            payment.amount,
            payment.due_date,
            payment.paid_date,
            payment.method,
            tenant.name,
            tenant.email,
            propertyTitle,
            propertyAddress,
            ownerName,
            period,
            agency,
            unitNumber,
            gestionnaireName
          ),
        });

        if (!emailResponse.success) throw new Error(emailResponse.error);

        console.log(`Email sent to ${tenant.email}:`, emailResponse);

        // Log the email
        await supabase.from("email_logs").insert({
          user_id: payment.user_id,
          tenant_id: tenant.id,
          payment_id: payment.id,
          email_type: "receipt",
          recipient_email: tenant.email,
          subject: `Quittance de loyer - ${period} - ${propertyTitle}`,
          status: "sent",
        });

        // Create a notification for the user
        await supabase.from("notifications").insert({
          user_id: payment.user_id,
          title: "Quittance envoyée",
          message: `Quittance de ${period} envoyée à ${tenant.name}`,
          type: "info",
          entity_type: "payment",
          entity_id: payment.id,
        });

        results.sent++;
      } catch (emailError: unknown) {
        const errorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
        console.error(`Failed to send email for payment ${payment.id}:`, emailError);
        results.errors.push(`Payment ${payment.id}: ${errorMessage}`);
      }
    }

    console.log("Processing complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Traitement terminé: ${results.sent} quittances envoyées, ${results.skipped} ignorées`,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-monthly-receipts:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
