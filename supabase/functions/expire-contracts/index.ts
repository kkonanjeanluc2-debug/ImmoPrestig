import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function validateAuth(req: Request): Promise<{ authenticated: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return { authenticated: false, error: "Missing or invalid Authorization header" };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data?.user) {
    return { authenticated: false, error: error?.message || "Invalid token" };
  }

  return { authenticated: true, userId: data.user.id };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate authentication
  const auth = await validateAuth(req);
  if (!auth.authenticated) {
    return new Response(
      JSON.stringify({ success: false, error: auth.error }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];

    // Find all active contracts with end_date < today for this user
    const { data: expiredContracts, error: fetchError } = await supabase
      .from("contracts")
      .select(`
        id, 
        user_id,
        property_id,
        tenant:tenants(name),
        property:properties(title)
      `)
      .eq("status", "active")
      .eq("user_id", auth.userId)
      .lt("end_date", today);

    if (fetchError) {
      throw fetchError;
    }

    if (!expiredContracts || expiredContracts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucun contrat à expirer",
          expired_count: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const contractIds = expiredContracts.map((c) => c.id);
    const propertyIds = expiredContracts
      .map((c) => c.property_id)
      .filter((id): id is string => id !== null);

    // Update contracts to expired status
    const { error: updateContractsError } = await supabase
      .from("contracts")
      .update({ status: "expired" })
      .in("id", contractIds);

    if (updateContractsError) {
      throw updateContractsError;
    }

    // Update properties to disponible status
    if (propertyIds.length > 0) {
      const { error: updatePropertiesError } = await supabase
        .from("properties")
        .update({ status: "disponible" })
        .in("id", propertyIds);

      if (updatePropertiesError) {
        console.error("Error updating properties:", updatePropertiesError);
      }
    }

    // Create in-app notifications for expired contracts
    const notificationPromises = expiredContracts.map(async (contract: any) => {
      const tenantName = contract.tenant?.name || "Locataire";
      const propertyTitle = contract.property?.title || "Bien immobilier";

      try {
        await supabase.from("notifications").insert({
          user_id: contract.user_id,
          title: "Contrat expiré",
          message: `Le contrat de ${tenantName} pour ${propertyTitle} a expiré. Le bien a été remis en disponible.`,
          type: "info",
          entity_type: "contract",
          entity_id: contract.id,
        });
        return { contractId: contract.id, notificationCreated: true };
      } catch (err) {
        console.error(`Failed to create notification for contract ${contract.id}:`, err);
        return { contractId: contract.id, notificationCreated: false };
      }
    });

    await Promise.all(notificationPromises);

    console.log(
      `Expired ${contractIds.length} contracts and updated ${propertyIds.length} properties`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `${contractIds.length} contrat(s) expiré(s)`,
        expired_count: contractIds.length,
        updated_properties: propertyIds.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in expire-contracts function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
