import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { isEmailEnabled } from "../_shared/check-email-enabled.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const emailEnabled = await isEmailEnabled();
    if (!emailEnabled) {
      return new Response(JSON.stringify({ error: "L'envoi d'emails est désactivé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const jwtToken = authHeader.replace("Bearer ", "");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwtToken);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub as string;

    const { ownerName, ownerEmail, amount, payoutMonth, payoutYear, paymentMethod, agencyName, agencyEmail } = await req.json();

    if (!ownerName || !ownerEmail) {
      return new Response(JSON.stringify({ error: "Champs requis manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate cryptographically secure 6-digit OTP using Web Crypto API
    const otpArray = new Uint32Array(1);
    crypto.getRandomValues(otpArray);
    const otp = String(100000 + (otpArray[0] % 900000)).padStart(6, "0");
    
    // Store OTP with 15 min expiry
    const serviceSupabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const { error: insertError } = await serviceSupabase
      .from("payout_otp_codes")
      .insert({
        user_id: userId,
        owner_email: ownerEmail,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        amount,
        payout_month: payoutMonth,
        payout_year: payoutYear,
      });

    if (insertError) throw insertError;

    const emailHtml = `
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💰 Code de confirmation</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px;">Bonjour <strong>${ownerName}</strong>,</p>
          <p style="font-size: 16px;"><strong>${agencyName}</strong> procède au reversement de vos loyers. Veuillez communiquer le code ci-dessous à votre agence pour confirmer la réception.</p>
          <div style="background-color: white; padding: 25px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">Votre code de confirmation :</p>
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1f2937; font-family: monospace;">${otp}</div>
          </div>
          <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">📋 Détails du reversement</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Montant :</td><td style="padding: 8px 0; font-weight: 600;">${Number(amount).toLocaleString("fr-FR")} FCFA</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Période :</td><td style="padding: 8px 0; font-weight: 600;">${payoutMonth} ${payoutYear}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Mode :</td><td style="padding: 8px 0; font-weight: 600;">${paymentMethod}</td></tr>
            </table>
          </div>
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>⏰ Important :</strong> Ce code expire dans 15 minutes.</p>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">Si vous n'êtes pas concerné, vous pouvez ignorer cet email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">Cet email a été envoyé par ${agencyName}${agencyEmail ? ` (${agencyEmail})` : ""}</p>
        </div>
      </body></html>`;

    const emailResponse = await sendEmail({
      from: "REVERSEMENT <noreply@immoprestigeci.com>",
      to: [ownerEmail],
      subject: `💰 Code de confirmation reversement - ${payoutMonth} ${payoutYear}`,
      html: emailHtml,
    });

    if (!emailResponse.success) throw new Error(emailResponse.error);

    return new Response(JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
