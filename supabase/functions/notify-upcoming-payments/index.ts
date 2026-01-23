import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Calculate the date 3 days from now
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const targetDate = threeDaysFromNow.toISOString().split("T")[0];

    console.log(`Checking for payments due on ${targetDate}`);

    // Fetch payments due in exactly 3 days that are not yet paid for this user
    const { data: upcomingPayments, error: paymentsError } = await supabase
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
          email,
          property:properties(title)
        )
      `)
      .eq("due_date", targetDate)
      .eq("user_id", auth.userId)
      .in("status", ["pending"]);

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      throw paymentsError;
    }

    console.log(`Found ${upcomingPayments?.length || 0} payments due in 3 days`);

    let notificationsCreated = 0;
    let emailsSent = 0;

    for (const payment of upcomingPayments || []) {
      const tenant = Array.isArray(payment.tenant) ? payment.tenant[0] : payment.tenant;
      if (!tenant) continue;

      const property = Array.isArray(tenant.property) ? tenant.property[0] : tenant.property;
      const propertyTitle = property?.title || "Propriété";
      const formattedAmount = Number(payment.amount).toLocaleString("fr-FR");
      const formattedDate = new Date(payment.due_date).toLocaleDateString("fr-FR");

      // Check if a notification was already created for this payment today
      const todayStart = new Date().toISOString().split("T")[0];
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", payment.user_id)
        .eq("entity_id", payment.id)
        .eq("entity_type", "payment")
        .gte("created_at", `${todayStart}T00:00:00.000Z`)
        .like("title", "%Échéance proche%")
        .limit(1);

      if (existingNotif && existingNotif.length > 0) {
        console.log(`Notification already exists for payment ${payment.id}`);
        continue;
      }

      // Create the in-app notification
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: payment.user_id,
        title: "⏰ Échéance proche",
        message: `Le paiement de ${formattedAmount} F CFA pour ${tenant.name} (${propertyTitle}) est dû dans 3 jours (${formattedDate}).`,
        type: "warning",
        entity_type: "payment",
        entity_id: payment.id,
        read: false,
      });

      if (notifError) {
        console.error(`Error creating notification for payment ${payment.id}:`, notifError);
      } else {
        notificationsCreated++;
        console.log(`Notification created for payment ${payment.id} - ${tenant.name}`);
      }

      // Send email reminder if tenant has email and Resend is configured
      if (tenant.email && resend) {
        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                .amount { font-size: 28px; font-weight: bold; color: #f59e0b; margin: 20px 0; }
                .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                .warning-icon { font-size: 48px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="warning-icon">⏰</div>
                  <h1>Rappel : Échéance de paiement dans 3 jours</h1>
                </div>
                <div class="content">
                  <p>Bonjour <strong>${tenant.name}</strong>,</p>
                  <p>Nous vous rappelons que votre paiement de loyer arrive à échéance prochainement.</p>
                  
                  <div class="details">
                    <p><strong>📍 Propriété :</strong> ${propertyTitle}</p>
                    <p><strong>📅 Date d'échéance :</strong> ${formattedDate}</p>
                    <p class="amount">${formattedAmount} F CFA</p>
                  </div>
                  
                  <p>Merci de prévoir le règlement de cette somme avant la date d'échéance afin d'éviter tout retard.</p>
                  <p>Pour toute question, n'hésitez pas à nous contacter.</p>
                  
                  <p>Cordialement,<br>L'équipe de gestion immobilière</p>
                </div>
                <div class="footer">
                  <p>Ceci est un email automatique. Merci de ne pas y répondre directement.</p>
                </div>
              </div>
            </body>
            </html>
          `;

          const emailResponse = await resend.emails.send({
            from: "Gestion Immobilière <onboarding@resend.dev>",
            to: [tenant.email],
            subject: `⏰ Rappel : Paiement de ${formattedAmount} F CFA dû le ${formattedDate}`,
            html: emailHtml,
          });

          console.log(`Email sent to ${tenant.email}:`, emailResponse);

          // Log the email
          await supabase.from("email_logs").insert({
            user_id: payment.user_id,
            tenant_id: tenant.id,
            payment_id: payment.id,
            email_type: "upcoming_payment_reminder",
            recipient_email: tenant.email,
            subject: `Rappel : Paiement de ${formattedAmount} F CFA dû le ${formattedDate}`,
            status: "sent",
          });

          emailsSent++;
        } catch (emailError) {
          console.error(`Error sending email to ${tenant.email}:`, emailError);
          
          // Log the failed email attempt
          await supabase.from("email_logs").insert({
            user_id: payment.user_id,
            tenant_id: tenant.id,
            payment_id: payment.id,
            email_type: "upcoming_payment_reminder",
            recipient_email: tenant.email,
            subject: `Rappel : Paiement de ${formattedAmount} F CFA dû le ${formattedDate}`,
            status: "failed",
          });
        }
      }
    }

    const result = {
      success: true,
      paymentsChecked: upcomingPayments?.length || 0,
      notificationsCreated,
      emailsSent,
      targetDate,
    };

    console.log("Upcoming payment notifications result:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in notify-upcoming-payments:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
