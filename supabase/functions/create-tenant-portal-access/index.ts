import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, unauthorizedResponse, validateAuth } from "../_shared/auth.ts";

interface CreateTenantAccessRequest {
  tenant_id: string;
  password: string;
}

// Generate a deterministic pseudo-email from phone number for Supabase Auth
function phoneToEmail(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  return `phone_${cleaned}@tenant.immoprestige.local`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = await validateAuth(req);
    if (!auth.authenticated || !auth.userId) {
      return unauthorizedResponse("Token invalide");
    }

    const callingUserId = auth.userId;
    console.log("Authenticated user:", callingUserId);

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

    // Verify authorization
    const { data: agency } = await supabaseAdmin
      .from("agencies")
      .select("id, user_id")
      .eq("user_id", callingUserId)
      .maybeSingle();

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

    const { data: tenantOwner } = await supabaseAdmin
      .from("tenants")
      .select("user_id")
      .eq("id", tenant_id)
      .single();

    if (tenantOwner?.user_id !== callingUserId && !isAdmin) {
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

    // Determine the auth email: real email or pseudo-email from phone
    let authEmail: string;
    let loginIdentifier: string;

    if (tenant.email) {
      authEmail = tenant.email.toLowerCase();
      loginIdentifier = tenant.email;
    } else if (tenant.phone) {
      authEmail = phoneToEmail(tenant.phone);
      loginIdentifier = tenant.phone;
    } else {
      return new Response(
        JSON.stringify({ error: "Le locataire doit avoir une adresse email ou un numéro de téléphone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription limits
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
      .eq("email", authEmail);

    let userId: string;

    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].user_id;
      console.log("User already exists, updating password:", userId);
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          full_name: tenant.name,
          is_tenant: true,
          login_identifier: loginIdentifier,
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
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: tenant.name,
          is_tenant: true,
          login_identifier: loginIdentifier,
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

    // Update tenant with portal_user_id and portal access
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

    console.log("Portal access created successfully for tenant:", tenant_id, "login:", loginIdentifier);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId,
        login_identifier: loginIdentifier,
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
