import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      buyerName,
      buyerEmail,
      signatureLink,
      propertyTitle,
      salePrice,
      documentType,
      agencyName,
      agencyEmail,
    } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docLabel = documentType === "acte_achat" ? "Acte d'achat" : "Compromis d'achat";
    const formattedPrice = Number(salePrice).toLocaleString("fr-FR");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1A365D; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${agencyName}</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1A365D;">Invitation à signer - ${docLabel}</h2>
          <p>Bonjour <strong>${buyerName}</strong>,</p>
          <p>${agencyName} vous invite à signer électroniquement le <strong>${docLabel}</strong> concernant le bien :</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #1A365D;">
            <p style="margin: 5px 0;"><strong>Bien :</strong> ${propertyTitle}</p>
            <p style="margin: 5px 0;"><strong>Prix :</strong> ${formattedPrice} FCFA</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${signatureLink}" style="background: #1A365D; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Signer le document
            </a>
          </div>
          <p style="color: #666; font-size: 13px;">Ce lien est valable pendant 7 jours.</p>
        </div>
        <div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">
          ${agencyName}${agencyEmail ? ` • ${agencyEmail}` : ""}
        </div>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${agencyName} <noreply@immoprestigeci.com>`,
        to: [buyerEmail],
        subject: `${docLabel} à signer - ${propertyTitle}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ error: "Erreur d'envoi email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Email envoyé" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
