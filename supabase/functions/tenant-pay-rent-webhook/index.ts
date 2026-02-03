import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fedapay-signature",
};

// Verify FedaPay webhook signature
async function verifyFedaPaySignature(
  payload: string,
  signature: string | null,
  secretKey: string
): Promise<boolean> {
  if (!signature) {
    console.warn("No signature provided in webhook request");
    return false;
  }

  try {
    // FedaPay uses HMAC-SHA256 for signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // FedaPay signature format may include prefix like "sha256="
    const cleanSignature = signature.replace(/^sha256=/, "").toLowerCase();
    const isValid = expectedSignature.toLowerCase() === cleanSignature;

    if (!isValid) {
      console.warn("Signature mismatch:", { expected: expectedSignature, received: cleanSignature });
    }

    return isValid;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fedapaySecretKey = Deno.env.get("FEDAPAY_SECRET_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("X-FedaPay-Signature") || req.headers.get("x-fedapay-signature");

    // Verify signature if secret key is configured
    if (fedapaySecretKey) {
      const isValid = await verifyFedaPaySignature(rawBody, signature, fedapaySecretKey);
      if (!isValid) {
        console.error("Invalid FedaPay webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("FedaPay webhook signature verified successfully");
    } else {
      console.warn("FEDAPAY_SECRET_KEY not configured, skipping signature verification");
    }

    const body = JSON.parse(rawBody);
    console.log("Tenant rent webhook received:", JSON.stringify(body));

    // FedaPay sends event in 'entity' field
    const event = body.entity || body;
    const status = event.status;
    const metadata = event.custom_metadata || event.metadata || {};

    // Only process if this is a rent payment
    if (metadata.type !== "rent_payment") {
      console.log("Not a rent payment, skipping");
      return new Response(
        JSON.stringify({ received: true, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentId = metadata.payment_id;

    if (!paymentId) {
      console.error("Missing payment_id in metadata");
      return new Response(
        JSON.stringify({ error: "Missing payment_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing rent payment: ${paymentId}, status: ${status}`);

    // Check if payment is approved/completed
    if (status === "approved" || status === "completed" || status === "transferred") {
      const { data: payment, error: fetchError } = await supabase
        .from("payments")
        .select("id, status")
        .eq("id", paymentId)
        .single();

      if (fetchError || !payment) {
        console.error("Payment not found:", paymentId);
        return new Response(
          JSON.stringify({ error: "Payment not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only update if not already paid
      if (payment.status !== "paid") {
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: "paid",
            paid_date: new Date().toISOString().split("T")[0],
            method: "mobile_money",
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentId);

        if (updateError) {
          console.error("Error updating payment:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update payment" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Payment ${paymentId} marked as paid`);
      } else {
        console.log(`Payment ${paymentId} already paid, skipping`);
      }
    } else if (status === "declined" || status === "canceled" || status === "failed") {
      console.log(`Payment ${paymentId} failed with status: ${status}`);
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
