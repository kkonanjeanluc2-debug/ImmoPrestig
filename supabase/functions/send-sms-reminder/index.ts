import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
  propertyTitle: string;
  amount: number;
  dueDate: string;
  status: string;
  paymentId?: string;
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

  // Validate authentication
  const auth = await validateAuth(req);
  if (!auth.authenticated) {
    return new Response(
      JSON.stringify({ success: false, error: auth.error }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Check if SMS is enabled globally
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: smsSetting } = await supabaseAdmin
      .from("platform_settings")
      .select("value")
      .eq("key", "sms_enabled")
      .maybeSingle();
    if (smsSetting?.value === "false") {
      return new Response(
        JSON.stringify({ success: false, error: "L'envoi de SMS est désactivé par l'administrateur" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error("Twilio credentials not configured");
    }

    const { tenantId, tenantName, tenantPhone, propertyTitle, amount, dueDate, status, paymentId }: SMSRequest = await req.json();

    if (!tenantPhone) {
      return new Response(
        JSON.stringify({ error: "Le locataire n'a pas de numéro de téléphone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format amount
    const formattedAmount = Number(amount).toLocaleString('fr-FR');
    const formattedDate = new Date(dueDate).toLocaleDateString('fr-FR');

    // Create message based on status
    let message: string;
    if (status === 'late') {
      message = `URGENT - Rappel de loyer impayé\n\nBonjour ${tenantName},\n\nVotre loyer de ${formattedAmount} F CFA pour "${propertyTitle}" était dû le ${formattedDate}.\n\nMerci de régulariser votre situation rapidement.`;
    } else {
      message = `Rappel de loyer\n\nBonjour ${tenantName},\n\nVotre loyer de ${formattedAmount} F CFA pour "${propertyTitle}" arrive à échéance le ${formattedDate}.\n\nMerci de procéder au paiement.`;
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", tenantPhone);
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioData);
      throw new Error(twilioData.message || "Erreur lors de l'envoi du SMS");
    }

    // Log the SMS in database using service role to insert
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseClient.from('email_logs').insert({
      user_id: auth.userId,
      tenant_id: tenantId,
      payment_id: paymentId || null,
      email_type: 'sms_reminder',
      recipient_email: tenantPhone,
      subject: status === 'late' ? 'SMS - Rappel urgent' : 'SMS - Rappel de paiement',
      status: 'sent'
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "SMS envoyé avec succès",
        sid: twilioData.sid 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
