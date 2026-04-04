import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { isEmailEnabled } from "../_shared/check-email-enabled.ts";
import { sendEmail } from "../_shared/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, agencyName, tenantName, title, category, priority, description } = await req.json();

    if (typeof to !== "string" || typeof title !== "string" || !to.trim() || !title.trim()) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailEnabled = await isEmailEnabled();

    if (!emailEnabled) {
      return new Response(JSON.stringify({ success: false, message: "Email provider is disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agencyNameText = (agencyName || "ImmoPrestige").trim();
    const tenantNameText = (tenantName || "Non spécifié").trim();
    const categoryText = (category || "Non spécifiée").trim();
    const priorityText = (priority || "Normale").trim();
    const titleText = title.trim();
    const descriptionText = description ? String(description).trim() : "";

    const safeAgencyName = escapeHtml(agencyNameText);
    const safeTenantName = escapeHtml(tenantNameText);
    const safeCategory = escapeHtml(categoryText);
    const safePriority = escapeHtml(priorityText);
    const safeTitle = escapeHtml(titleText);
    const safeDescription = descriptionText ? escapeHtml(descriptionText) : "";

    const emailResult = await sendEmail({
      from: `${agencyNameText} <noreply@immoprestigeci.com>`,
      to: [to.trim()],
      subject: `🔔 Nouvelle requête locataire: ${titleText}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a365d; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">🔔 Nouvelle requête locataire</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Locataire:</td>
                <td style="padding: 8px 0;">${safeTenantName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Catégorie:</td>
                <td style="padding: 8px 0;">${safeCategory}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Priorité:</td>
                <td style="padding: 8px 0; ${safePriority === "Urgente" ? "color: red; font-weight: bold;" : ""}">${safePriority}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Titre:</td>
                <td style="padding: 8px 0;">${safeTitle}</td>
              </tr>
              ${safeDescription ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568; vertical-align: top;">Description:</td>
                <td style="padding: 8px 0;">${safeDescription}</td>
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
    });

    return new Response(JSON.stringify(emailResult), {
      status: emailResult.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
