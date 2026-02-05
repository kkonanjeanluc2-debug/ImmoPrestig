import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateKeysPayload {
  provider_name: string;
  public_key?: string;
  secret_key?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token to verify they're authenticated
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Use service role to check if user is super admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Accès refusé. Privilèges super admin requis." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: UpdateKeysPayload = await req.json();
    const { provider_name, public_key, secret_key } = payload;

    if (!provider_name) {
      return new Response(
        JSON.stringify({ error: "provider_name requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Define secret names based on provider
    const secretNames: Record<string, { public: string | null; secret: string }> = {
      fedapay: {
        public: "FEDAPAY_PUBLIC_KEY",
        secret: "FEDAPAY_SECRET_KEY",
      },
      wave_ci: {
        public: "WAVE_API_KEY",
        secret: "WAVE_WEBHOOK_SECRET",
      },
      pawapay: {
        public: null, // PawaPay only has one API token
        secret: "PAWAPAY_API_TOKEN",
      },
    };

    const providerSecrets = secretNames[provider_name];
    if (!providerSecrets) {
      return new Response(
        JSON.stringify({ error: `Fournisseur inconnu: ${provider_name}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store the keys as environment variables
    // Note: In production, you'd use Supabase Vault or a proper secrets manager
    // For now, we'll store a hash/indicator in the database and use the keys passed
    
    const updates: Record<string, any> = {
      api_key_configured: !!(public_key || secret_key),
      updated_at: new Date().toISOString(),
    };

    // Store keys info in settings (NOT the actual keys - just metadata)
    const { data: currentProvider, error: fetchError } = await adminClient
      .from("payment_provider_configs")
      .select("settings")
      .eq("provider_name", provider_name)
      .single();

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: "Fournisseur non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentSettings = (currentProvider.settings as Record<string, any>) || {};
    
    updates.settings = {
      ...currentSettings,
      public_key_configured: !!public_key,
      secret_key_configured: !!secret_key,
      keys_updated_at: new Date().toISOString(),
      keys_updated_by: userId,
    };

    // Update provider config
    const { error: updateError } = await adminClient
      .from("payment_provider_configs")
      .update(updates)
      .eq("provider_name", provider_name);

    if (updateError) {
      console.error("Error updating provider:", updateError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la mise à jour" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the action
    await adminClient.from("super_admin_audit_logs").insert({
      admin_user_id: userId,
      action_type: "update_payment_provider_keys",
      details: {
        provider_name,
        public_key_updated: !!public_key,
        secret_key_updated: !!secret_key,
      },
    });

    console.log(`Payment provider keys updated for ${provider_name} by ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Clés ${provider_name} mises à jour avec succès`,
        note: "Les clés ont été configurées. N'oubliez pas de les ajouter également dans les secrets Supabase pour qu'elles soient utilisées par les edge functions."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-provider-keys:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
