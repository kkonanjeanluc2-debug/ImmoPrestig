import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CompleteSignatureRequest {
  token: string;
  signatureData?: string;
  signatureText?: string;
  signatureType: "drawn" | "typed";
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CompleteSignatureRequest = await req.json();
    const { token, signatureData, signatureText, signatureType } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token requis" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!signatureType || (signatureType !== "drawn" && signatureType !== "typed")) {
      return new Response(
        JSON.stringify({ error: "Type de signature invalide" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (signatureType === "drawn" && !signatureData) {
      return new Response(
        JSON.stringify({ error: "Données de signature requises pour signature dessinée" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (signatureType === "typed" && !signatureText) {
      return new Response(
        JSON.stringify({ error: "Texte de signature requis pour signature tapée" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get user agent from request
    const userAgent = req.headers.get("user-agent") || "";

    // Create admin client to bypass RLS - token validation is done via query
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // First, verify the token is valid and not yet used
    const { data: existingSignature, error: fetchError } = await supabaseAdmin
      .from("contract_signatures")
      .select("id, contract_id, signature_data, signature_text")
      .eq("signature_token", token)
      .gt("token_expires_at", new Date().toISOString())
      .maybeSingle();

    if (fetchError) {
      console.error("Database fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la vérification du token" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!existingSignature) {
      return new Response(
        JSON.stringify({ error: "Lien de signature invalide ou expiré" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check if already signed
    if (existingSignature.signature_data || existingSignature.signature_text) {
      return new Response(
        JSON.stringify({ error: "Cette signature a déjà été complétée" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Update the signature record
    const { data: updatedSignature, error: updateError } = await supabaseAdmin
      .from("contract_signatures")
      .update({
        signature_data: signatureData,
        signature_text: signatureText,
        signature_type: signatureType,
        signed_at: new Date().toISOString(),
        user_agent: userAgent,
      })
      .eq("id", existingSignature.id)
      .select()
      .single();

    if (updateError) {
      console.error("Database update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'enregistrement de la signature" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Update contract signature status
    if (existingSignature.contract_id) {
      // Get current contract status
      const { data: contractData } = await supabaseAdmin
        .from("contracts")
        .select("signature_status")
        .eq("id", existingSignature.contract_id)
        .single();

      const currentStatus = contractData?.signature_status || "pending";
      // If landlord has already signed, mark as fully signed, otherwise tenant signed
      const newStatus = currentStatus === "landlord_signed" ? "fully_signed" : "tenant_signed";

      await supabaseAdmin
        .from("contracts")
        .update({ signature_status: newStatus })
        .eq("id", existingSignature.contract_id);
    }

    return new Response(
      JSON.stringify({ data: updatedSignature, success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("Error in complete-tenant-signature:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
