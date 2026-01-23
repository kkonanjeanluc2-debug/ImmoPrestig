import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TenantData {
  id: string;
  name: string;
  email: string;
  property: PropertyData[] | null;
}

interface PropertyData {
  id: string;
  title: string;
  address: string;
  owner: OwnerData[] | null;
}

interface OwnerData {
  name: string;
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

async function validateAuth(req: Request): Promise<{ authenticated: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return { authenticated: false, error: "Missing or invalid Authorization header" };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data?.user) {
    return { authenticated: false, error: error?.message || "Invalid token" };
  }

  return { authenticated: true, userId: data.user.id };
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
  period: string
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a365d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
        .amount-box { background: #1a365d; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .amount { font-size: 24px; font-weight: bold; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .row:last-child { border-bottom: none; }
        .label { color: #666; }
        .value { font-weight: 500; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">QUITTANCE DE LOYER</h1>
        <p style="margin: 10px 0 0 0;">N° ${paymentId.substring(0, 8).toUpperCase()}</p>
      </div>
      <div class="content">
        <div style="background: #e8e8e8; padding: 10px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <strong>Période : ${period}</strong>
        </div>
        
        ${ownerName ? `
        <div class="details">
          <p style="margin: 0 0 5px 0; color: #1a365d; font-weight: bold; font-size: 12px;">BAILLEUR</p>
          <p style="margin: 0;">${ownerName}</p>
        </div>
        ` : ''}
        
        <div class="details">
          <p style="margin: 0 0 5px 0; color: #1a365d; font-weight: bold; font-size: 12px;">LOCATAIRE</p>
          <p style="margin: 0;">${tenantName}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${tenantEmail}</p>
        </div>
        
        <div class="details">
          <p style="margin: 0 0 5px 0; color: #1a365d; font-weight: bold; font-size: 12px;">BIEN LOUÉ</p>
          <p style="margin: 0;">${propertyTitle}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${propertyAddress}</p>
        </div>
        
        <div class="amount-box">
          <p style="margin: 0 0 5px 0; font-size: 14px;">Montant du loyer reçu</p>
          <p class="amount" style="margin: 0;">${amount.toLocaleString("fr-FR")} F CFA</p>
        </div>
        
        <div class="details">
          <div class="row">
            <span class="label">Date d'échéance</span>
            <span class="value">${new Date(dueDate).toLocaleDateString("fr-FR")}</span>
          </div>
          <div class="row">
            <span class="label">Date de paiement</span>
            <span class="value">${new Date(paidDate).toLocaleDateString("fr-FR")}</span>
          </div>
          <div class="row">
            <span class="label">Mode de paiement</span>
            <span class="value">${method || 'Non spécifié'}</span>
          </div>
        </div>
        
        <p style="font-size: 13px; color: #555; margin-top: 20px;">
          Je soussigné(e), propriétaire du bien désigné ci-dessus, déclare avoir reçu de ${tenantName} 
          la somme de ${amount.toLocaleString("fr-FR")} F CFA au titre du loyer pour la période indiquée, 
          et lui en donne quittance, sous réserve de tous mes droits.
        </p>
        
        <p style="text-align: right; margin-top: 20px;">
          Fait le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
      <div class="footer">
        <p>Ce document est une quittance de loyer générée automatiquement.</p>
      </div>
    </body>
    </html>
  `;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate authentication
  const auth = await validateAuth(req);
  if (!auth.authenticated) {
    return new Response(
      JSON.stringify({ success: false, error: auth.error }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current month's date range
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    console.log(`Processing receipts for ${firstDayOfMonth.toISOString()} to ${lastDayOfMonth.toISOString()}`);

    // Find all paid payments for the current month for this user
    const { data: payments, error: paymentsError } = await supabase
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
          property:properties(
            id,
            title,
            address,
            owner:owners(name)
          )
        )
      `)
      .eq("status", "paid")
      .eq("user_id", auth.userId)
      .gte("due_date", firstDayOfMonth.toISOString().split("T")[0])
      .lte("due_date", lastDayOfMonth.toISOString().split("T")[0]);

    if (paymentsError) {
      throw paymentsError;
    }

    console.log(`Found ${payments?.length || 0} paid payments for the month`);

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

      const period = getPaymentPeriod(payment.due_date);
      const propertyTitle = property?.title || "Bien loué";
      const propertyAddress = property?.address || "";
      const ownerName = owner?.name || null;

      try {
        // Send the receipt email
        const emailResponse = await resend.emails.send({
          from: "Gestion Locative <onboarding@resend.dev>",
          to: [tenant.email],
          subject: `Quittance de loyer - ${period} - ${propertyTitle}`,
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
            period
          ),
        });

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

        results.sent++;
      } catch (emailError: any) {
        console.error(`Failed to send email for payment ${payment.id}:`, emailError);
        results.errors.push(`Payment ${payment.id}: ${emailError.message}`);
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
  } catch (error: any) {
    console.error("Error in generate-monthly-receipts:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
