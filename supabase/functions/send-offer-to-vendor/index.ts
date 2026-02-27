import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { isEmailEnabled } from "../_shared/check-email-enabled.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { offre_id } = await req.json();

    if (!offre_id) {
      return new Response(JSON.stringify({ error: "offre_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch offer with bien and vendeur info
    const { data: offre, error: offreError } = await supabase
      .from("offres_achat")
      .select("*, biens_achat(title, address, price, vendeur_id, vendeurs(name, email, phone))")
      .eq("id", offre_id)
      .eq("user_id", userId)
      .single();

    if (offreError || !offre) {
      return new Response(JSON.stringify({ error: "Offre non trouvée" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vendeur = offre.biens_achat?.vendeurs;
    if (!vendeur?.email) {
      return new Response(
        JSON.stringify({ error: "Le vendeur n'a pas d'adresse email configurée" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a unique token
    const vendorToken = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Save token to offer
    const { error: updateError } = await supabase
      .from("offres_achat")
      .update({
        vendor_token: vendorToken,
        vendor_token_expires_at: expiresAt,
      })
      .eq("id", offre_id);

    if (updateError) {
      console.error("Error updating token:", updateError);
      return new Response(JSON.stringify({ error: "Erreur lors de la génération du lien" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get agency info for email sender
    const { data: agency } = await supabase
      .from("agencies")
      .select("name, email")
      .eq("user_id", userId)
      .single();

    const agencyName = agency?.name || "ImmoPrestige";
    const agencyEmail = agency?.email || "noreply@immoprestigeci.com";

    // Build the link
    const appUrl = Deno.env.get("VITE_APP_URL") || "https://property-grace.lovable.app";
    const offerLink = `${appUrl}/offre-vendeur/${vendorToken}`;

    const emailEnabled = await isEmailEnabled();
    if (!emailEnabled) {
      return new Response(
        JSON.stringify({ success: true, warning: "Email désactivé, lien généré", link: offerLink }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
        <div style="background: #1a365d; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">${agencyName}</h1>
          <p style="margin: 5px 0 0; opacity: 0.9;">Offre d'achat reçue</p>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${vendeur.name}</strong>,</p>
          <p>Vous avez reçu une offre d'achat pour votre bien :</p>
          <div style="background: #f7fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Bien :</strong> ${offre.biens_achat?.title}</p>
            <p style="margin: 4px 0;"><strong>Adresse :</strong> ${offre.biens_achat?.address}</p>
            <p style="margin: 4px 0;"><strong>Montant de l'offre :</strong> ${Number(offre.offer_amount).toLocaleString("fr-FR")} FCFA</p>
            ${offre.conditions ? `<p style="margin: 4px 0;"><strong>Conditions :</strong> ${offre.conditions}</p>` : ""}
          </div>
          <p>Vous pouvez consulter cette offre et y répondre (accepter, refuser ou faire une contre-offre) en cliquant sur le lien ci-dessous :</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${offerLink}" style="background: #1a365d; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Consulter et répondre à l'offre
            </a>
          </div>
          <p style="color: #718096; font-size: 13px;">Ce lien est valable pendant 7 jours.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #a0aec0; font-size: 12px; text-align: center;">
            ${agencyName} — Cet email a été envoyé automatiquement.
          </p>
        </div>
      </body>
      </html>
    `;

    const emailResult = await sendEmail({
      from: `${agencyName} <${agencyEmail}>`,
      to: [vendeur.email],
      subject: `Offre d'achat reçue - ${offre.biens_achat?.title}`,
      html,
    });

    if (!emailResult.success) {
      console.error("Email send error:", emailResult.error);
      return new Response(
        JSON.stringify({ success: false, error: emailResult.error, link: offerLink }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, link: offerLink }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
