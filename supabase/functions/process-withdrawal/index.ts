import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authResult = await validateAuth(req);
    if (!authResult.authenticated) {
      return unauthorizedResponse(authResult.error);
    }

    const { withdrawal_id } = await req.json();

    if (!withdrawal_id) {
      return new Response(
        JSON.stringify({ success: false, error: "ID de demande requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("*")
      .eq("id", withdrawal_id)
      .eq("user_id", authResult.userId)
      .single();

    if (withdrawalError || !withdrawal) {
      return new Response(
        JSON.stringify({ success: false, error: "Demande non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (withdrawal.status !== "pending") {
      return new Response(
        JSON.stringify({ success: false, error: "Cette demande a déjà été traitée" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number for display
    const formatPhone = (phone: string): string => {
      let cleaned = phone.replace(/[\s\-\(\)]/g, "");
      if (cleaned.startsWith("0")) {
        cleaned = "+225" + cleaned.substring(1);
      } else if (!cleaned.startsWith("+")) {
        cleaned = "+225" + cleaned;
      }
      return cleaned;
    };

    const formattedPhone = formatPhone(withdrawal.recipient_phone);
    
    // Get payment method display name
    const getMethodName = (method: string): string => {
      const methods: Record<string, string> = {
        "wave": "Wave",
        "orange_money": "Orange Money",
        "mtn_money": "MTN Mobile Money",
        "moov": "Moov Money",
        "card": "Carte bancaire"
      };
      return methods[method] || method;
    };

    // Update status to processing - the withdrawal will be processed manually via KKiaPay dashboard
    // KKiaPay doesn't offer a direct payout API for merchants - payouts are handled through their dashboard
    const { error: updateError } = await supabaseAdmin
      .from("withdrawal_requests")
      .update({ 
        status: "processing",
        notes: (withdrawal.notes || "") + 
          `\n[${new Date().toISOString()}] Demande soumise - À traiter via KKiaPay Dashboard` +
          `\nMontant: ${withdrawal.amount.toLocaleString("fr-FR")} F CFA` +
          `\nDestinataire: ${formattedPhone} (${getMethodName(withdrawal.payment_method)})` +
          (withdrawal.recipient_name ? `\nNom: ${withdrawal.recipient_name}` : "")
      })
      .eq("id", withdrawal_id);

    if (updateError) {
      console.error("Error updating withdrawal:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la mise à jour" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notification for the user
    await supabaseAdmin.from("notifications").insert({
      user_id: authResult.userId,
      title: "Demande de reversement soumise",
      message: `Votre demande de reversement de ${withdrawal.amount.toLocaleString("fr-FR")} F CFA vers ${formattedPhone} a été soumise. Elle sera traitée dans les plus brefs délais.`,
      type: "info",
      entity_type: "withdrawal",
      entity_id: withdrawal_id,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Demande de reversement soumise avec succès",
        status: "processing",
        details: {
          amount: withdrawal.amount,
          recipient: formattedPhone,
          method: getMethodName(withdrawal.payment_method)
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Process withdrawal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
