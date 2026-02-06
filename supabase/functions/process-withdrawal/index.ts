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

    // Get KKiaPay API keys
    const privateKey = Deno.env.get("KKIAPAY_PRIVATE_KEY");
    const publicKey = Deno.env.get("KKIAPAY_PUBLIC_KEY");
    const secretKey = Deno.env.get("KKIAPAY_SECRET");

    if (!privateKey || !publicKey || !secretKey) {
      // Update status to indicate configuration issue
      await supabaseAdmin
        .from("withdrawal_requests")
        .update({ 
          status: "failed",
          notes: (withdrawal.notes || "") + "\n[Erreur: Clés KKiaPay non configurées]"
        })
        .eq("id", withdrawal_id);

      return new Response(
        JSON.stringify({ success: false, error: "Configuration KKiaPay manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map payment method to KKiaPay destination type
    const getDestinationType = (method: string): string => {
      switch (method) {
        case "wave":
        case "orange_money":
        case "mtn_money":
        case "moov":
          return "MOBILE_MONEY";
        case "card":
          return "BANK";
        default:
          return "MOBILE_MONEY";
      }
    };

    // Format phone number for KKiaPay (ensure it starts with country code)
    const formatPhone = (phone: string): string => {
      // Remove any spaces or special characters
      let cleaned = phone.replace(/[\s\-\(\)]/g, "");
      
      // If starts with 0, replace with 225 (Ivory Coast)
      if (cleaned.startsWith("0")) {
        cleaned = "225" + cleaned.substring(1);
      }
      
      // If doesn't start with country code, add 225
      if (!cleaned.startsWith("225") && !cleaned.startsWith("+")) {
        cleaned = "225" + cleaned;
      }
      
      // Remove + if present
      cleaned = cleaned.replace("+", "");
      
      return cleaned;
    };

    const destinationType = getDestinationType(withdrawal.payment_method);
    const formattedPhone = formatPhone(withdrawal.recipient_phone);

    // Update status to processing
    await supabaseAdmin
      .from("withdrawal_requests")
      .update({ status: "processing" })
      .eq("id", withdrawal_id);

    // KKiaPay Payout API - Using the setup_payout endpoint for instant payout
    // Note: KKiaPay requires Pro subscription for instant payouts
    // This implementation schedules a payout request
    
    try {
      // KKiaPay uses their own payout system through the dashboard
      // For API-based payouts, we need to use their REST API
      const kkiapayBaseUrl = "https://api.kkiapay.me/api/v1";
      
      // Create payout request to KKiaPay
      const payoutResponse = await fetch(`${kkiapayBaseUrl}/payout/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PRIVATE-KEY": privateKey,
          "X-PUBLIC-KEY": publicKey,
          "X-SECRET-KEY": secretKey,
        },
        body: JSON.stringify({
          amount: withdrawal.amount,
          destination: formattedPhone,
          destination_type: destinationType,
          reason: `Reversement ImmoPrestige - ${withdrawal.id.substring(0, 8)}`,
        }),
      });

      const payoutResult = await payoutResponse.json();

      if (payoutResponse.ok && payoutResult.status === "SUCCESS") {
        // Payout successful
        await supabaseAdmin
          .from("withdrawal_requests")
          .update({
            status: "completed",
            processed_at: new Date().toISOString(),
            kkiapay_payout_id: payoutResult.transactionId || payoutResult.id,
          })
          .eq("id", withdrawal_id);

        // Create notification for the user
        await supabaseAdmin.from("notifications").insert({
          user_id: authResult.userId,
          title: "Reversement effectué",
          message: `Votre reversement de ${withdrawal.amount.toLocaleString("fr-FR")} F CFA a été envoyé avec succès.`,
          type: "success",
          entity_type: "withdrawal",
          entity_id: withdrawal_id,
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Reversement effectué avec succès",
            transaction_id: payoutResult.transactionId || payoutResult.id
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Payout failed or pending
        const errorMessage = payoutResult.message || payoutResult.error || "Erreur lors du payout";
        
        await supabaseAdmin
          .from("withdrawal_requests")
          .update({
            status: payoutResult.status === "PENDING" ? "processing" : "failed",
            notes: (withdrawal.notes || "") + `\n[KKiaPay: ${errorMessage}]`,
          })
          .eq("id", withdrawal_id);

        // If it's a pending status, it might still succeed
        if (payoutResult.status === "PENDING") {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Reversement en cours de traitement",
              status: "processing"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (payoutError) {
      console.error("KKiaPay payout error:", payoutError);
      
      // Update status to failed with error details
      await supabaseAdmin
        .from("withdrawal_requests")
        .update({
          status: "failed",
          notes: (withdrawal.notes || "") + `\n[Erreur technique: ${payoutError.message}]`,
        })
        .eq("id", withdrawal_id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Erreur lors de la communication avec KKiaPay" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Process withdrawal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
