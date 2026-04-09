import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

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

    const { otpCode } = await req.json();
    if (!otpCode || typeof otpCode !== "string") {
      return new Response(JSON.stringify({ error: "Code requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await adminClient
      .from("payout_otps")
      .select("*")
      .eq("user_id", user.id)
      .eq("otp_code", otpCode)
      .gt("expires_at", new Date().toISOString())
      .eq("verified", false)
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch OTP error:", fetchError);
      return new Response(JSON.stringify({ error: "Erreur interne" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!otpRecord) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Code invalide ou expiré" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as verified
    await adminClient
      .from("payout_otps")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    return new Response(JSON.stringify({ success: true }), {
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
