import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRow {
  id: string;
  user_id: string;
  tenant_id: string;
  amount: number;
  due_date: string;
  status: string;
  tenant: {
    id: string;
    name: string;
    phone: string | null;
    property: {
      title: string;
    } | null;
  } | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error("Twilio credentials not configured");
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all late payments with tenant info
    const { data: latePayments, error: paymentsError } = await supabase
      .from("payments")
      .select(`
        id,
        user_id,
        tenant_id,
        amount,
        due_date,
        status,
        tenant:tenants(
          id,
          name,
          phone,
          property:properties(title)
        )
      `)
      .eq("status", "late");

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      throw paymentsError;
    }

    console.log(`Found ${latePayments?.length || 0} late payments`);

    // Filter payments where tenant has a phone number
    const paymentsWithPhone = (latePayments || []).filter(
      (p: any) => {
        const tenant = Array.isArray(p.tenant) ? p.tenant[0] : p.tenant;
        return tenant?.phone;
      }
    ).map((p: any) => ({
      ...p,
      tenant: Array.isArray(p.tenant) ? p.tenant[0] : p.tenant
    }));

    console.log(`${paymentsWithPhone.length} payments have tenant phone numbers`);

    // Check which ones already received SMS today
    const today = new Date().toISOString().split("T")[0];
    const { data: sentToday, error: logsError } = await supabase
      .from("email_logs")
      .select("payment_id")
      .eq("email_type", "sms_reminder")
      .gte("created_at", `${today}T00:00:00.000Z`);

    if (logsError) {
      console.error("Error fetching logs:", logsError);
    }

    const sentTodayIds = new Set((sentToday || []).map((l) => l.payment_id));
    const paymentsToNotify = paymentsWithPhone.filter(
      (p) => !sentTodayIds.has(p.id)
    );

    console.log(`${paymentsToNotify.length} payments need SMS notification`);

    let sent = 0;
    let errors = 0;

    for (const payment of paymentsToNotify) {
      try {
        const tenant = payment.tenant;
        if (!tenant) continue;
        
        const property = Array.isArray(tenant.property) ? tenant.property[0] : tenant.property;
        const propertyTitle = property?.title || "votre logement";
        const formattedAmount = Number(payment.amount).toLocaleString("fr-FR");
        const formattedDate = new Date(payment.due_date).toLocaleDateString("fr-FR");

        const message = `URGENT - Rappel de loyer impayé\n\nBonjour ${tenant.name},\n\nVotre loyer de ${formattedAmount} F CFA pour "${propertyTitle}" était dû le ${formattedDate}.\n\nMerci de régulariser votre situation rapidement.`;

        // Send SMS via Twilio
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

        const formData = new URLSearchParams();
        formData.append("To", tenant.phone!);
        formData.append("From", TWILIO_PHONE_NUMBER);
        formData.append("Body", message);

        const twilioResponse = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        });

        const twilioData = await twilioResponse.json();

        if (!twilioResponse.ok) {
          console.error(`Twilio error for ${tenant.name}:`, twilioData);
          errors++;
          continue;
        }

        // Log the SMS
        await supabase.from("email_logs").insert({
          user_id: payment.user_id,
          tenant_id: tenant.id,
          payment_id: payment.id,
          email_type: "sms_reminder",
          recipient_email: tenant.phone!,
          subject: "SMS - Rappel automatique loyer en retard",
          status: "sent",
        });

        sent++;
        console.log(`SMS sent to ${tenant.name} (${tenant.phone})`);
      } catch (error) {
        console.error(`Error sending SMS for payment ${payment.id}:`, error);
        errors++;
      }
    }

    const result = {
      success: true,
      processed: paymentsToNotify.length,
      sent,
      errors,
      skipped: paymentsWithPhone.length - paymentsToNotify.length,
    };

    console.log("Daily SMS reminders result:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in daily SMS reminders:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
