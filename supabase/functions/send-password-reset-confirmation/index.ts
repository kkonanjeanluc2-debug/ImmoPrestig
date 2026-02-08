import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetConfirmationRequest {
  email: string;
  userName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userName }: PasswordResetConfirmationRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email non fourni",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const displayName = userName || "Utilisateur";
    const currentDate = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailResponse = await resend.emails.send({
      from: "Gestion Immobilière <noreply@immoprestigeci.com>",
      to: [email],
      subject: "✅ Votre mot de passe a été réinitialisé",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .header .icon { font-size: 48px; margin-bottom: 10px; }
            .content { padding: 30px; }
            .info-box { background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .warning-box { background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #f8f9fa; }
            .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">🔒</div>
              <h1>Mot de passe réinitialisé</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${displayName}</strong>,</p>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>✅ Confirmation</strong></p>
                <p style="margin: 10px 0 0 0;">Votre mot de passe a été réinitialisé avec succès le <strong>${currentDate}</strong>.</p>
              </div>
              
              <p>Vous pouvez maintenant vous connecter à votre compte avec votre nouveau mot de passe.</p>
              
              <div class="warning-box">
                <p style="margin: 0;"><strong>⚠️ Sécurité</strong></p>
                <p style="margin: 10px 0 0 0;">Si vous n'êtes pas à l'origine de cette modification, veuillez contacter immédiatement notre support et sécurisez votre compte en réinitialisant à nouveau votre mot de passe.</p>
              </div>
              
              <p><strong>Conseils de sécurité :</strong></p>
              <ul>
                <li>Utilisez un mot de passe unique pour ce compte</li>
                <li>Ne partagez jamais votre mot de passe avec d'autres personnes</li>
                <li>Déconnectez-vous toujours après utilisation sur un appareil partagé</li>
              </ul>
              
              <p>Cordialement,<br><strong>L'équipe de Gestion Immobilière</strong></p>
            </div>
            <div class="footer">
              <p>Ceci est un email automatique de confirmation. Merci de ne pas y répondre directement.</p>
              <p>© ${new Date().getFullYear()} Gestion Immobilière - Tous droits réservés</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Password reset confirmation email sent to ${email}:`, emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email de confirmation envoyé à ${email}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-password-reset-confirmation function:", error);
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
