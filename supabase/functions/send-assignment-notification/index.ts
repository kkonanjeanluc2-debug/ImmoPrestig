import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { isEmailEnabled } from "../_shared/check-email-enabled.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignmentNotificationRequest {
  assignee_user_id: string;
  assignment_type: "property" | "tenant";
  items: Array<{ id: string; name: string; details?: string }>;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const emailEnabled = await isEmailEnabled();
    if (!emailEnabled) {
      return new Response(JSON.stringify({ success: false, error: "L'envoi d'emails est désactivé par l'administrateur" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { assignee_user_id, assignment_type, items }: AssignmentNotificationRequest = await req.json();

    if (!assignee_user_id || !assignment_type || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: "Données manquantes" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: assigneeProfile, error: profileError } = await supabase
      .from("profiles").select("email, full_name").eq("user_id", assignee_user_id).single();

    if (profileError || !assigneeProfile?.email) {
      return new Response(JSON.stringify({ error: "Profil du gestionnaire introuvable" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: agency } = await supabase.from("agencies").select("name, logo_url, primary_color").eq("user_id", user.id).single();
    const agencyName = agency?.name || "Votre agence";
    const primaryColor = agency?.primary_color || "#1e3a5f";

    const typeLabel = assignment_type === "property" ? "bien(s)" : "locataire(s)";
    const typeSingular = assignment_type === "property" ? "bien" : "locataire";
    const icon = assignment_type === "property" ? "🏠" : "👤";

    const itemsList = items.map(item => `
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid #eee;">
        <strong>${item.name}</strong>${item.details ? `<br><span style="color: #666; font-size: 13px;">${item.details}</span>` : ""}
      </td></tr>`).join("");

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;"><tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
            <tr><td style="background-color: ${primaryColor}; padding: 30px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px;">${icon} Nouvelle affectation</h1></td></tr>
            <tr><td style="padding: 30px;">
              <p style="font-size: 16px;">Bonjour <strong>${assigneeProfile.full_name || "Gestionnaire"}</strong>,</p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                ${items.length > 1 ? `<strong>${items.length} ${typeLabel}</strong> vous ont été affectés` : `Un nouveau <strong>${typeSingular}</strong> vous a été affecté`} par <strong>${agencyName}</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; overflow: hidden; margin-bottom: 25px;">
                <tr><td style="padding: 12px 16px; background-color: ${primaryColor}; color: #fff; font-weight: 600;">${assignment_type === "property" ? "Biens affectés" : "Locataires affectés"}</td></tr>
                ${itemsList}
              </table>
              <p style="font-size: 14px; color: #666;">Connectez-vous à votre espace pour gérer ${items.length > 1 ? "ces " + typeLabel : "ce " + typeSingular}.</p>
            </td></tr>
            <tr><td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;"><p style="font-size: 13px; color: #999; margin: 0;">${agencyName} • Gestion immobilière</p></td></tr>
          </table>
        </td></tr></table>
      </body></html>`;

    const emailResponse = await sendEmail({
      from: `${agencyName} <noreply@lagrace.ci>`,
      to: [assigneeProfile.email],
      subject: `${icon} ${items.length > 1 ? `${items.length} ${typeLabel} affectés` : `Nouveau ${typeSingular} affecté`} - ${agencyName}`,
      html: emailHtml,
    });

    if (!emailResponse.success) throw new Error(emailResponse.error);
    console.log("Assignment notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: unknown) {
    console.error("Error sending assignment notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
