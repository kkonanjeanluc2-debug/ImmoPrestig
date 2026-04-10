import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, signatureData, signatureText, signatureType } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify token exists and is pending
    const { data: signature, error: fetchError } = await supabase
      .from("payout_signatures")
      .select("*")
      .eq("signature_token", token)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!signature) {
      return new Response(JSON.stringify({ error: "Lien invalide ou déjà utilisé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check expiration
    if (signature.token_expires_at && new Date(signature.token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Ce lien de signature a expiré" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get IP and user agent
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Update signature
    const { data: updated, error: updateError } = await supabase
      .from("payout_signatures")
      .update({
        signature_data: signatureData,
        signature_text: signatureText,
        signature_type: signatureType || "drawn",
        status: "signed",
        signed_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .eq("id", signature.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ data: updated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
