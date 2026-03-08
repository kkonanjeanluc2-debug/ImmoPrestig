import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, signatureData, signatureText, signatureType } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!signatureData && !signatureText) {
      return new Response(JSON.stringify({ error: "Signature requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify token
    const { data: existing, error: fetchError } = await supabase
      .from("achat_signatures")
      .select("*")
      .eq("signature_token", token)
      .single();

    if (fetchError || !existing) {
      return new Response(JSON.stringify({ error: "Signature non trouvée" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existing.token_expires_at && new Date(existing.token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Le lien a expiré" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existing.signature_data || existing.signature_text) {
      return new Response(JSON.stringify({ error: "Déjà signé" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const { data, error } = await supabase
      .from("achat_signatures")
      .update({
        signature_data: signatureData || null,
        signature_text: signatureText || null,
        signature_type: signatureType,
        signed_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ data, message: "Signature enregistrée" }), {
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
