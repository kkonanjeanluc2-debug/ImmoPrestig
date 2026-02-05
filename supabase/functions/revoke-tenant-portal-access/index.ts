import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RevokeTenantAccessRequest {
  tenant_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RevokeTenantAccessRequest = await req.json();
    const { tenant_id } = body;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "ID du locataire requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Revoking portal access for tenant:", tenant_id, "by user:", callingUser.id);

    // Get the tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, user_id, has_portal_access")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Locataire non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user owns this tenant record
    const { data: tenantOwner } = await supabaseAdmin
      .from("tenants")
      .select("user_id")
      .eq("id", tenant_id)
      .single();

    // Check if user is agency owner or admin
    const { data: agency } = await supabaseAdmin
      .from("agencies")
      .select("id")
      .eq("user_id", callingUser.id)
      .maybeSingle();

    let isAdmin = false;
    if (!agency) {
      const { data: membership } = await supabaseAdmin
        .from("agency_members")
        .select("agency_id, role")
        .eq("user_id", callingUser.id)
        .eq("role", "admin")
        .eq("status", "active")
        .maybeSingle();
      
      if (membership) {
        isAdmin = true;
      }
    }

    if (tenantOwner?.user_id !== callingUser.id && !agency && !isAdmin) {
      const { data: isSuperAdmin } = await supabaseAdmin.rpc("is_super_admin", { _user_id: callingUser.id });
      
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: "Vous n'êtes pas autorisé à révoquer l'accès de ce locataire" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!tenant.has_portal_access) {
      return new Response(
        JSON.stringify({ error: "Ce locataire n'a pas d'accès portail" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update tenant to remove portal access (but keep user_id for reference)
    const { error: updateError } = await supabaseAdmin
      .from("tenants")
      .update({
        has_portal_access: false,
      })
      .eq("id", tenant_id);

    if (updateError) {
      console.error("Error updating tenant:", updateError);
      return new Response(
        JSON.stringify({ error: `Erreur lors de la révocation: ${updateError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Portal access revoked successfully for tenant:", tenant_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Accès portail révoqué avec succès" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne du serveur";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
