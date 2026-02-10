import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { isEmailEnabled } from "../_shared/check-email-enabled.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  paymentId: string;
  tenantName: string;
  tenantEmail: string;
  propertyTitle: string;
  amount: number;
  dueDate: string;
  isLate: boolean;
}

async function validateAuth(req: Request): Promise<{ authenticated: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { authenticated: false, error: "Missing or invalid Authorization header" };
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { authenticated: false, error: error?.message || "Invalid token" };
  return { authenticated: true, userId: data.user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const emailEnabled = await isEmailEnabled();
  if (!emailEnabled) {
    return new Response(JSON.stringify({ success: false, error: "L'envoi d'emails est désactivé par l'administrateur" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const auth = await validateAuth(req);
  if (!auth.authenticated) {
    return new Response(JSON.stringify({ success: false, error: auth.error }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { tenantName, tenantEmail, propertyTitle, amount, dueDate, isLate }: ReminderRequest = await req.json();

    if (!tenantEmail) {
      return new Response(JSON.stringify({ success: false, error: "Email du locataire non disponible" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const formattedAmount = Number(amount).toLocaleString("fr-FR");
    const formattedDueDate = new Date(dueDate).toLocaleDateString("fr-FR");
    const subject = isLate
      ? `⚠️ Rappel urgent : Loyer en retard - ${propertyTitle}`
      : `📅 Rappel : Échéance de loyer à venir - ${propertyTitle}`;
    const headerColor = isLate ? "#e53e3e" : "#1a365d";
    const headerIcon = isLate ? "⚠️" : "📅";
    const statusText = isLate ? "en retard" : "à venir";
    const urgencyText = isLate
      ? "Nous vous rappelons que le paiement de votre loyer est actuellement en retard."
      : "Nous vous rappelons que l'échéance de paiement de votre loyer approche.";

    const emailResponse = await sendEmail({
      from: "RAPPEL ECHEANCE <noreply@immoprestigeci.com>",
      to: [tenantEmail],
      subject,
      html: `
        <!DOCTYPE html><html><head><style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background-color: ${headerColor}; color: white; padding: 25px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; }
          .content { background-color: #f8f9fa; padding: 30px; }
          .amount-box { background-color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border-left: 4px solid ${headerColor}; }
          .amount { font-size: 28px; font-weight: bold; color: ${headerColor}; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .label { color: #666; } .value { font-weight: 600; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #eee; }
        </style></head><body>
          <div class="container">
            <div class="header"><h1>${headerIcon} Rappel de paiement</h1></div>
            <div class="content">
              <p>Bonjour <strong>${tenantName}</strong>,</p>
              <p>${urgencyText}</p>
              <div class="amount-box">
                <p style="margin: 0 0 10px 0; color: #666;">Montant ${statusText}</p>
                <p class="amount">${formattedAmount} F CFA</p>
              </div>
              <div style="background: white; padding: 15px; border-radius: 8px;">
                <div class="info-row"><span class="label">📍 Bien</span><span class="value">${propertyTitle}</span></div>
                <div class="info-row"><span class="label">📅 Échéance</span><span class="value">${formattedDueDate}</span></div>
                <div class="info-row" style="border: none;"><span class="label">💰 Montant</span><span class="value">${formattedAmount} F CFA</span></div>
              </div>
              <p style="margin-top: 20px;">Nous vous prions de bien vouloir procéder au règlement dans les plus brefs délais.</p>
              <p>Pour toute question concernant ce paiement, n'hésitez pas à nous contacter.</p>
              <p>Cordialement,<br><strong>Votre gestionnaire immobilier</strong></p>
            </div>
            <div class="footer"><p>Ceci est un email automatique. Merci de ne pas y répondre directement.</p></div>
          </div>
        </body></html>
      `,
    });

    if (!emailResponse.success) throw new Error(emailResponse.error);
    console.log(`Reminder email sent to ${tenantEmail}:`, emailResponse);

    return new Response(JSON.stringify({ success: true, message: `Rappel envoyé à ${tenantEmail}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-payment-reminder function:", error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
