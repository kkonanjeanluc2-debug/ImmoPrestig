import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { isEmailEnabled } from "../_shared/check-email-enabled.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionWithAgency {
  id: string;
  agency_id: string;
  plan_id: string;
  status: string;
  ends_at: string;
  billing_cycle: string;
  agency: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  plan: {
    name: string;
    price_monthly: number;
    price_yearly: number;
    currency: string;
  };
}

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
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date and calculate alert thresholds
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);
    
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    
    const in1Day = new Date(now);
    in1Day.setDate(in1Day.getDate() + 1);

    // Fetch subscriptions expiring soon
    const { data: subscriptions, error: subError } = await supabase
      .from("agency_subscriptions")
      .select(`
        *,
        agency:agencies!agency_subscriptions_agency_id_fkey(id, name, email, phone),
        plan:subscription_plans!agency_subscriptions_plan_id_fkey(name, price_monthly, price_yearly, currency)
      `)
      .eq("status", "active")
      .not("ends_at", "is", null)
      .lte("ends_at", in7Days.toISOString())
      .gte("ends_at", now.toISOString());

    if (subError) {
      throw new Error(`Error fetching subscriptions: ${subError.message}`);
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions expiring soon`);

    const results = {
      processed: 0,
      emailsSent: 0,
      smsSent: 0,
      errors: [] as string[],
    };

    // Email sending is handled by shared sendEmail utility

    for (const sub of (subscriptions || []) as SubscriptionWithAgency[]) {
      results.processed++;

      const endsAt = new Date(sub.ends_at);
      const daysRemaining = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine alert type based on days remaining
      let alertType: "7days" | "3days" | "1day" | null = null;
      if (daysRemaining <= 1) {
        alertType = "1day";
      } else if (daysRemaining <= 3) {
        alertType = "3days";
      } else if (daysRemaining <= 7) {
        alertType = "7days";
      }

      if (!alertType) continue;

      // Check if we already sent this alert today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("entity_type", "subscription_expiry")
        .eq("entity_id", sub.id)
        .gte("created_at", todayStart.toISOString())
        .single();

      if (existingNotification) {
        console.log(`Already notified subscription ${sub.id} today, skipping`);
        continue;
      }

      const agency = sub.agency;
      const plan = sub.plan;
      const renewalPrice = sub.billing_cycle === "yearly" ? plan.price_yearly : plan.price_monthly;

      // Create in-app notification
      const { data: agencyData } = await supabase
        .from("agencies")
        .select("user_id")
        .eq("id", sub.agency_id)
        .single();

      if (agencyData?.user_id) {
        const notificationTitle = daysRemaining <= 1 
          ? "⚠️ Abonnement expire demain !"
          : `Abonnement expire dans ${daysRemaining} jours`;

        const notificationMessage = `Votre forfait ${plan.name} expire le ${endsAt.toLocaleDateString("fr-FR")}. Renouvelez maintenant pour continuer à profiter de toutes les fonctionnalités.`;

        await supabase.from("notifications").insert({
          user_id: agencyData.user_id,
          title: notificationTitle,
          message: notificationMessage,
          type: daysRemaining <= 1 ? "error" : "warning",
          entity_type: "subscription_expiry",
          entity_id: sub.id,
        });
      }

      // Send email notification
      if (agency.email) {
        try {
          const urgencyText = daysRemaining <= 1
            ? "URGENT : Votre abonnement expire demain !"
            : daysRemaining <= 3
              ? "Attention : Votre abonnement expire bientôt"
              : "Rappel : Votre abonnement arrive à expiration";

          const emailResult = await sendEmail({
            from: "ImmoPrestige <noreply@immoprestigeci.com>",
            to: [agency.email],
            subject: `${urgencyText} - ${plan.name}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: ${daysRemaining <= 1 ? '#dc2626' : daysRemaining <= 3 ? '#f59e0b' : '#1F3A93'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                  .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1F3A93; }
                  .cta-button { display: inline-block; background: #2ECC71; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                  .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0;">⚡ ${urgencyText}</h1>
                  </div>
                  <div class="content">
                    <p>Bonjour <strong>${agency.name}</strong>,</p>
                    
                    <p>Nous vous informons que votre abonnement ImmoPrestige arrive à expiration.</p>
                    
                    <div class="info-box">
                      <p><strong>📦 Forfait :</strong> ${plan.name}</p>
                      <p><strong>📅 Expiration :</strong> ${endsAt.toLocaleDateString("fr-FR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p><strong>⏰ Temps restant :</strong> ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}</p>
                      <p><strong>💰 Renouvellement :</strong> ${renewalPrice.toLocaleString("fr-FR")} ${plan.currency}/${sub.billing_cycle === "yearly" ? "an" : "mois"}</p>
                    </div>
                    
                    <p>Pour éviter toute interruption de service, nous vous recommandons de renouveler votre abonnement dès maintenant.</p>
                    
                    <p style="text-align: center;">
                      <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/settings?tab=subscription" class="cta-button">
                        Renouveler mon abonnement
                      </a>
                    </p>
                    
                    <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
                    
                    <p>Cordialement,<br><strong>L'équipe ImmoPrestige</strong></p>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} ImmoPrestige - Gestion immobilière simplifiée</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          if (!emailResult.success) throw new Error(emailResult.error);

          results.emailsSent++;
          console.log(`Email sent to ${agency.email}`);
        } catch (emailError) {
          console.error(`Failed to send email to ${agency.email}:`, emailError);
          results.errors.push(`Email to ${agency.email}: ${emailError}`);
        }
      }

      // Send SMS for urgent notifications (1 or 3 days)
      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber && agency.phone && daysRemaining <= 3) {
        try {
          const smsMessage = daysRemaining <= 1
            ? `URGENT ImmoPrestige: Votre abonnement ${plan.name} expire DEMAIN! Renouvelez maintenant pour éviter l'interruption. Connectez-vous sur votre espace.`
            : `ImmoPrestige: Votre abonnement ${plan.name} expire dans ${daysRemaining} jours (${endsAt.toLocaleDateString("fr-FR")}). Pensez à renouveler!`;

          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
          const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

          const smsResponse = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${authHeader}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: agency.phone,
              From: twilioPhoneNumber,
              Body: smsMessage,
            }),
          });

          if (smsResponse.ok) {
            results.smsSent++;
            console.log(`SMS sent to ${agency.phone}`);
          } else {
            const smsError = await smsResponse.text();
            throw new Error(smsError);
          }
        } catch (smsError) {
          console.error(`Failed to send SMS to ${agency.phone}:`, smsError);
          results.errors.push(`SMS to ${agency.phone}: ${smsError}`);
        }
      }
    }

    // Log automation run
    const { data: systemUser } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin")
      .limit(1)
      .single();

    if (systemUser?.user_id) {
      await supabase.from("automation_logs").insert({
        user_id: systemUser.user_id,
        task_type: "subscription_expiry_alerts",
        status: results.errors.length > 0 ? "partial" : "completed",
        items_processed: results.processed,
        items_success: results.emailsSent + results.smsSent,
        items_failed: results.errors.length,
        completed_at: new Date().toISOString(),
        details: {
          emails_sent: results.emailsSent,
          sms_sent: results.smsSent,
          errors: results.errors,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} expiring subscriptions`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in subscription expiry alerts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
