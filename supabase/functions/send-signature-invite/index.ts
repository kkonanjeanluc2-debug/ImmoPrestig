import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { isEmailEnabled } from "../_shared/check-email-enabled.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SignatureInviteRequest {
  contractId: string;
  tenantName: string;
  tenantEmail: string;
  signatureToken: string;
  signatureLink: string;
  propertyTitle: string;
  rentAmount: number;
  startDate: string;
  endDate: string;
  agencyName: string;
  agencyEmail?: string;
  hasPortalAccess?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailEnabled = await isEmailEnabled();
    if (!emailEnabled) {
      return new Response(
        JSON.stringify({ error: "L'envoi d'emails est désactivé par l'administrateur" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("Claims error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", claimsData.claims.sub);

    const {
      contractId,
      tenantName,
      tenantEmail,
      signatureToken,
      signatureLink,
      propertyTitle,
      rentAmount,
      startDate,
      endDate,
      agencyName,
      agencyEmail,
      hasPortalAccess,
    }: SignatureInviteRequest = await req.json();

    // Validate required fields
    if (!contractId || !tenantName || !tenantEmail || !signatureLink) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Format dates
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    // Build portal info if tenant has access
    const portalSection = hasPortalAccess
      ? `
        <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #1a73e8;">
            <strong>💡 Vous avez également accès à votre espace locataire</strong><br/>
            Vous pouvez aussi signer ce contrat directement depuis votre espace personnel.
          </p>
        </div>
      `
      : "";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📝 Invitation à signer votre contrat</h1>
        </div>
        
        <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px;">Bonjour <strong>${tenantName}</strong>,</p>
          
          <p style="font-size: 16px;">
            <strong>${agencyName}</strong> vous invite à signer électroniquement votre contrat de location.
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">📋 Détails du contrat</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Bien :</td>
                <td style="padding: 8px 0; font-weight: 600;">${propertyTitle}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Loyer mensuel :</td>
                <td style="padding: 8px 0; font-weight: 600;">${rentAmount.toLocaleString("fr-FR")} FCFA</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Période :</td>
                <td style="padding: 8px 0; font-weight: 600;">Du ${formatDate(startDate)} au ${formatDate(endDate)}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signatureLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              ✍️ Signer le contrat
            </a>
          </div>
          
          ${portalSection}
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>⏰ Important :</strong> Ce lien de signature expire dans 7 jours. 
              Après cette date, vous devrez demander un nouveau lien au bailleur.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Si vous n'êtes pas concerné par ce contrat, vous pouvez ignorer cet email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            Cet email a été envoyé par ${agencyName}${agencyEmail ? ` (${agencyEmail})` : ""}<br/>
            Signature électronique sécurisée avec horodatage
          </p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Signature de contrat <noreply@immoprestige.lovable.app>",
      to: [tenantEmail],
      subject: `📝 Invitation à signer votre contrat de location - ${propertyTitle}`,
      html: emailHtml,
    });

    console.log("Signature invite email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending signature invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
