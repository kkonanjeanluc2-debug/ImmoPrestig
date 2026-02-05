import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateTenantAccessRequest {
  tenant_id: string;
  password: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract token and validate
    const token = authHeader.replace("Bearer ", "");
    
    // Create client with user's auth header to validate token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the calling user using getUser with explicit token
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !user) {
      console.error("User error:", userError);
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callingUserId = user.id;
    console.log("Authenticated user:", callingUserId);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body: CreateTenantAccessRequest = await req.json();
    const { tenant_id, password } = body;

    if (!tenant_id || !password) {
      return new Response(
        JSON.stringify({ error: "ID du locataire et mot de passe requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating portal access for tenant:", tenant_id, "by user:", callingUserId);

    // Get the tenant and verify ownership
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, name, email, phone, user_id, has_portal_access, portal_user_id")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Locataire non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user owns this tenant record (is the agency owner)
    // Get agency of the calling user
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from("agencies")
      .select("id, user_id")
      .eq("user_id", callingUserId)
      .maybeSingle();

    // Also check if user is an admin member
    let isAdmin = false;
    if (!agency) {
      const { data: membership } = await supabaseAdmin
        .from("agency_members")
        .select("agency_id, role")
        .eq("user_id", callingUserId)
        .eq("role", "admin")
        .eq("status", "active")
        .maybeSingle();
      
      if (membership) {
        isAdmin = true;
      }
    }

    // Check if the calling user is the owner of the tenant record
    const { data: tenantOwner } = await supabaseAdmin
      .from("tenants")
      .select("user_id")
      .eq("id", tenant_id)
      .single();

    if (tenantOwner?.user_id !== callingUserId && !isAdmin) {
      // Check if calling user is super_admin
      const { data: isSuperAdmin } = await supabaseAdmin.rpc("is_super_admin", { _user_id: callingUserId });
      
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: "Vous n'êtes pas autorisé à créer un accès pour ce locataire" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if tenant already has portal access
    if (tenant.has_portal_access && tenant.portal_user_id) {
      return new Response(
        JSON.stringify({ error: "Ce locataire a déjà un accès portail" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email is provided
    if (!tenant.email) {
      return new Response(
        JSON.stringify({ error: "Le locataire doit avoir une adresse email pour créer un accès" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get agency ID for subscription check
    let agencyId: string | null = null;
    if (agency) {
      agencyId = agency.id;
    } else {
      const { data: memberAgency } = await supabaseAdmin
        .from("agency_members")
        .select("agency_id")
        .eq("user_id", callingUserId)
        .eq("status", "active")
        .maybeSingle();
      
      if (memberAgency) {
        agencyId = memberAgency.agency_id;
      }
    }

    // Check subscription limits
    if (agencyId) {
      const { data: canAdd } = await supabaseAdmin.rpc("can_agency_add_tenant_portal", { p_agency_id: agencyId });
      
      if (!canAdd) {
        return new Response(
          JSON.stringify({ error: "Limite de locataires avec accès portail atteinte pour votre forfait. Veuillez mettre à niveau." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if user already exists with this email
    const { data: existingUsers } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", tenant.email.toLowerCase());

    let userId: string;

    if (existingUsers && existingUsers.length > 0) {
      // User already exists - update their password
      userId = existingUsers[0].user_id;
      console.log("User already exists, updating password:", userId);
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          full_name: tenant.name,
          is_tenant: true,
        },
      });

      if (updateError) {
        console.error("Error updating user password:", updateError);
        return new Response(
          JSON.stringify({ error: `Erreur lors de la mise à jour du mot de passe: ${updateError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Password updated successfully for user:", userId);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: tenant.email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: tenant.name,
          is_tenant: true,
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: `Erreur lors de la création du compte: ${createError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      console.log("Created new user:", userId);
    }

    // Add locataire role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "locataire",
      }, { onConflict: "user_id" });

    if (roleError) {
      console.error("Error setting user role:", roleError);
    }

    // Update tenant with portal_user_id and portal access (keep original user_id for ownership)
    const { error: updateError } = await supabaseAdmin
      .from("tenants")
      .update({
        portal_user_id: userId,
        has_portal_access: true,
      })
      .eq("id", tenant_id);

    if (updateError) {
      console.error("Error updating tenant:", updateError);
      return new Response(
        JSON.stringify({ error: `Erreur lors de la mise à jour du locataire: ${updateError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Portal access created successfully for tenant:", tenant_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId,
        message: "Accès portail créé avec succès" 
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
