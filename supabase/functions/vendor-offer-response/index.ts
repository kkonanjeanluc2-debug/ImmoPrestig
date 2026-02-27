import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      // Fetch offer by token
      const url = new URL(req.url);
      const token = url.searchParams.get("token");

      if (!token) {
        return new Response(JSON.stringify({ error: "Token requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: offre, error } = await supabase
        .from("offres_achat")
        .select("id, offer_amount, offer_date, status, conditions, counter_amount, vendor_response_notes, vendor_responded_at, vendor_token_expires_at, biens_achat(title, address, price, property_type, area, city, vendeurs(name))")
        .eq("vendor_token", token)
        .single();

      if (error || !offre) {
        return new Response(JSON.stringify({ error: "Offre non trouvée ou lien invalide" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry
      if (offre.vendor_token_expires_at && new Date(offre.vendor_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Ce lien a expiré" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ offre }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      // Vendor submits response
      const { token, action, counter_amount, notes } = await req.json();

      if (!token || !action) {
        return new Response(JSON.stringify({ error: "Token et action requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!["acceptee", "refusee", "contre_offre"].includes(action)) {
        return new Response(JSON.stringify({ error: "Action invalide" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "contre_offre" && (!counter_amount || counter_amount <= 0)) {
        return new Response(JSON.stringify({ error: "Montant de contre-offre requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Verify token and status
      const { data: offre, error: fetchError } = await supabase
        .from("offres_achat")
        .select("id, status, vendor_token_expires_at")
        .eq("vendor_token", token)
        .single();

      if (fetchError || !offre) {
        return new Response(JSON.stringify({ error: "Offre non trouvée" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (offre.vendor_token_expires_at && new Date(offre.vendor_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Ce lien a expiré" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!["en_attente", "contre_offre"].includes(offre.status)) {
        return new Response(JSON.stringify({ error: "Cette offre ne peut plus être modifiée" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update offer
      const updateData: Record<string, unknown> = {
        status: action,
        vendor_response_notes: notes || null,
        vendor_responded_at: new Date().toISOString(),
      };

      if (action === "contre_offre") {
        updateData.counter_amount = counter_amount;
      }

      const { error: updateError } = await supabase
        .from("offres_achat")
        .update(updateData)
        .eq("id", offre.id);

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(JSON.stringify({ error: "Erreur lors de la mise à jour" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const messages: Record<string, string> = {
        acceptee: "Vous avez accepté l'offre. L'agence sera notifiée.",
        refusee: "Vous avez refusé l'offre. L'agence sera notifiée.",
        contre_offre: "Votre contre-offre a été envoyée. L'agence sera notifiée.",
      };

      return new Response(
        JSON.stringify({ success: true, message: messages[action] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
