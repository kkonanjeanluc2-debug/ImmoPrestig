import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, agencyName, tenantName, title, category, priority, description } = await req.json();

    if (!to || !title) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    // Use Resend if available, otherwise use a simple SMTP approach
    if (RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${agencyName || "ImmoPrestige"} <noreply@immoprestigeci.com>`,
          to: [to],
          subject: `🔔 Nouvelle requête locataire: ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1a365d; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🔔 Nouvelle requête locataire</h2>
              </div>
              <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Locataire:</td>
                    <td style="padding: 8px 0;">${tenantName || "Non spécifié"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Catégorie:</td>
                    <td style="padding: 8px 0;">${category}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Priorité:</td>
                    <td style="padding: 8px 0; ${priority === "Urgente" ? "color: red; font-weight: bold;" : ""}">${priority}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Titre:</td>
                    <td style="padding: 8px 0;">${title}</td>
                  </tr>
                  ${description ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #4a5568; vertical-align: top;">Description:</td>
                    <td style="padding: 8px 0;">${description}</td>
                  </tr>
                  ` : ""}
                </table>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
                <p style="color: #718096; font-size: 12px;">
                  Connectez-vous à votre espace pour traiter cette requête.
                </p>
              </div>
            </div>
          `,
        }),
      });

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.ok ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: just log the notification
    console.log("Email notification (no email provider configured):", { to, title, tenantName });
    return new Response(JSON.stringify({ message: "No email provider configured" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
