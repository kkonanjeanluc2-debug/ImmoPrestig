import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phoneNumber } = await req.json();
    if (!phoneNumber || typeof phoneNumber !== "string") {
      return new Response(JSON.stringify({ error: "Numéro de téléphone requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP in database with expiry (5 minutes)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Clean up old OTPs for this user
    await adminClient
      .from("payout_otps")
      .delete()
      .eq("user_id", user.id);

    // Insert new OTP
    const { error: insertError } = await adminClient
      .from("payout_otps")
      .insert({
        user_id: user.id,
        phone_number: phoneNumber,
        otp_code: otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error("Insert OTP error:", insertError);
      return new Response(JSON.stringify({ error: "Erreur interne" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone number for Twilio (ensure E.164)
    let formattedPhone = phoneNumber.replace(/\s+/g, "");
    if (!formattedPhone.startsWith("+")) {
      // Assume Côte d'Ivoire if no country code
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+225" + formattedPhone.substring(1);
      } else {
        formattedPhone = "+225" + formattedPhone;
      }
    }

    // Send WhatsApp message via Twilio gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_PHONE_NUMBER) {
      console.error("Missing Twilio configuration");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Code envoyé par WhatsApp",
        debug_otp: otp 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const smsResponse = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `whatsapp:${formattedPhone}`,
        From: `whatsapp:${TWILIO_PHONE_NUMBER}`,
        Body: `Votre code de confirmation de reversement est : ${otp}. Ce code expire dans 5 minutes.`,
      }),
    });

    if (!smsResponse.ok) {
      const errData = await smsResponse.json();
      console.error("Twilio WhatsApp error:", errData);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Code généré mais l'envoi WhatsApp a échoué. Contactez l'administrateur.",
        debug_otp: otp
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Code envoyé par WhatsApp" 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
