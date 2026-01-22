import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentWithTenant {
  id: string;
  amount: number;
  due_date: string;
  tenant: {
    name: string;
    email: string;
    property: {
      title: string;
    } | null;
  } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];

    // Find all pending payments with due_date < today (late payments)
    const { data: latePayments, error: fetchError } = await supabase
      .from("payments")
      .select(`
        id,
        amount,
        due_date,
        tenant:tenants(
          name,
          email,
          property:properties(title)
        )
      `)
      .eq("status", "pending")
      .lt("due_date", today);

    if (fetchError) {
      throw fetchError;
    }

    if (!latePayments || latePayments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucun paiement en retard",
          notified_count: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Update late payments status to "late"
    const latePaymentIds = latePayments.map((p) => p.id);
    await supabase
      .from("payments")
      .update({ status: "late" })
      .in("id", latePaymentIds);

    // Send email notifications
    const emailPromises = latePayments.map(async (payment: any) => {
      const tenant = payment.tenant;
      if (!tenant?.email) {
        console.log(`Skipping payment ${payment.id}: no tenant email`);
        return null;
      }

      const propertyTitle = tenant.property?.title || "Votre logement";
      const dueDate = new Date(payment.due_date).toLocaleDateString("fr-FR");
      const amount = Number(payment.amount).toLocaleString("fr-FR");

      try {
        const emailResponse = await resend.emails.send({
          from: "Gestion Immobilière <onboarding@resend.dev>",
          to: [tenant.email],
          subject: `Rappel: Paiement en retard - ${propertyTitle}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #1a365d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                .amount { font-size: 24px; font-weight: bold; color: #e53e3e; }
                .info-box { background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e53e3e; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⚠️ Rappel de paiement</h1>
                </div>
                <div class="content">
                  <p>Bonjour <strong>${tenant.name}</strong>,</p>
                  
                  <p>Nous vous informons que le paiement du loyer pour <strong>${propertyTitle}</strong> est en retard.</p>
                  
                  <div class="info-box">
                    <p><strong>Détails du paiement :</strong></p>
                    <p>📍 Bien : ${propertyTitle}</p>
                    <p>📅 Date d'échéance : ${dueDate}</p>
                    <p>💰 Montant : <span class="amount">${amount} F CFA</span></p>
                  </div>
                  
                  <p>Nous vous prions de bien vouloir régulariser votre situation dans les plus brefs délais.</p>
                  
                  <p>Pour toute question, n'hésitez pas à nous contacter.</p>
                  
                  <p>Cordialement,<br>Votre gestionnaire immobilier</p>
                </div>
                <div class="footer">
                  <p>Ceci est un email automatique. Merci de ne pas y répondre directement.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log(`Email sent to ${tenant.email}:`, emailResponse);
        return { paymentId: payment.id, email: tenant.email, success: true };
      } catch (emailError) {
        console.error(`Failed to send email to ${tenant.email}:`, emailError);
        return { paymentId: payment.id, email: tenant.email, success: false, error: emailError };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r?.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `${successCount} notification(s) envoyée(s)`,
        notified_count: successCount,
        late_payments_count: latePayments.length,
        results: results.filter(Boolean),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-late-payments function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
