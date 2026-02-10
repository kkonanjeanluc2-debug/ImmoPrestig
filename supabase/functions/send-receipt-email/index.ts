import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { isEmailEnabled } from "../_shared/check-email-enabled.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendReceiptRequest {
  tenantName: string;
  tenantEmail: string;
  propertyTitle: string;
  amount: number;
  period: string;
  pdfBase64: string;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const emailEnabled = await isEmailEnabled();
  if (!emailEnabled) {
    return new Response(
      JSON.stringify({ success: false, error: "L'envoi d'emails est désactivé par l'administrateur" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const auth = await validateAuth(req);
  if (!auth.authenticated) {
    return new Response(
      JSON.stringify({ success: false, error: auth.error }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { tenantName, tenantEmail, propertyTitle, amount, period, pdfBase64 }: SendReceiptRequest = await req.json();

    if (!tenantEmail) {
      return new Response(JSON.stringify({ success: false, error: "Email du locataire non disponible" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }
    if (!pdfBase64) {
      return new Response(JSON.stringify({ success: false, error: "PDF non fourni" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const formattedAmount = Number(amount).toLocaleString("fr-FR");
    const fileName = `quittance_${tenantName.replace(/\s+/g, "_")}_${period.replace(/\s+/g, "_")}.pdf`;

    const emailResponse = await sendEmail({
      from: "QUITTANCE LOYER <noreply@immoprestigeci.com>",
      to: [tenantEmail],
      subject: `Quittance de loyer - ${period} - ${propertyTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background-color: #1a365d; color: white; padding: 25px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; }
            .content { background-color: #f8f9fa; padding: 30px; }
            .info-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38a169; }
            .amount { font-size: 24px; font-weight: bold; color: #38a169; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>✅ Quittance de loyer</h1></div>
            <div class="content">
              <p>Bonjour <strong>${tenantName}</strong>,</p>
              <p>Veuillez trouver ci-joint votre quittance de loyer pour la période de <strong>${period}</strong>.</p>
              <div class="info-box">
                <p style="margin: 0 0 10px 0; color: #666;">Récapitulatif</p>
                <p><strong>📍 Bien :</strong> ${propertyTitle}</p>
                <p><strong>📅 Période :</strong> ${period}</p>
                <p><strong>💰 Montant :</strong> <span class="amount">${formattedAmount} F CFA</span></p>
              </div>
              <p>Ce document atteste du paiement de votre loyer. Conservez-le précieusement pour vos archives.</p>
              <p>Cordialement,<br><strong>Votre gestionnaire immobilier</strong></p>
            </div>
            <div class="footer"><p>Ceci est un email automatique. Merci de ne pas y répondre directement.</p></div>
          </div>
        </body>
        </html>
      `,
      attachments: [{ filename: fileName, content: pdfBase64 }],
    });

    if (!emailResponse.success) {
      throw new Error(emailResponse.error);
    }

    console.log(`Receipt email sent to ${tenantEmail}:`, emailResponse);

    return new Response(JSON.stringify({ success: true, message: `Quittance envoyée à ${tenantEmail}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-receipt-email function:", error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
