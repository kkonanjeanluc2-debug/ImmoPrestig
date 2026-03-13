import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if called by authenticated user (manual) or cron (automatic)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const token = authHeader.replace("Bearer ", "");
      
      // If token is NOT the anon key, it's a user token - validate it
      if (token !== anonKey) {
        const userClient = createClient(supabaseUrl, anonKey!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data, error } = await userClient.auth.getUser();
        if (error || !data?.user) {
          return new Response(
            JSON.stringify({ success: false, error: "Invalid token" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        userId = data.user.id;
      }
      // If token IS the anon key, it's a cron call - process all users (userId stays null)
    }

    const today = new Date().toISOString().split("T")[0];

    // Build query - filter by user if manual call, all users if cron
    let query = supabase
      .from("contracts")
      .select(`
        id, 
        user_id,
        property_id,
        unit_id,
        tenant_id,
        tenant:tenants(name),
        property:properties(title)
      `)
      .eq("status", "active")
      .lt("end_date", today);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: expiredContracts, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!expiredContracts || expiredContracts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucun contrat à expirer",
          expired_count: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const contractIds = expiredContracts.map((c) => c.id);
    
    // Separate contracts with and without units
    const contractsWithUnits = expiredContracts.filter((c) => c.unit_id);
    const contractsWithoutUnits = expiredContracts.filter((c) => !c.unit_id);
    
    const unitIds = contractsWithUnits
      .map((c) => c.unit_id)
      .filter((id): id is string => id !== null);
    
    const propertyIdsWithoutUnits = contractsWithoutUnits
      .map((c) => c.property_id)
      .filter((id): id is string => id !== null);

    // Update contracts to expired status
    const { error: updateContractsError } = await supabase
      .from("contracts")
      .update({ status: "expired" })
      .in("id", contractIds);

    if (updateContractsError) throw updateContractsError;

    // Update units to disponible status
    if (unitIds.length > 0) {
      const { error: updateUnitsError } = await supabase
        .from("property_units")
        .update({ status: "disponible" })
        .in("id", unitIds);

      if (updateUnitsError) console.error("Error updating units:", updateUnitsError);
    }

    // For contracts with units, check if property should be set to disponible
    const propertyIdsToCheck = [...new Set(contractsWithUnits.map((c) => c.property_id).filter((id): id is string => id !== null))];
    
    for (const propertyId of propertyIdsToCheck) {
      const { data: occupiedUnits, error: checkError } = await supabase
        .from("property_units")
        .select("id")
        .eq("property_id", propertyId)
        .eq("status", "loué");

      if (!checkError && (!occupiedUnits || occupiedUnits.length === 0)) {
        await supabase
          .from("properties")
          .update({ status: "disponible" })
          .eq("id", propertyId);
      }
    }

    // Update properties without units to disponible status
    if (propertyIdsWithoutUnits.length > 0) {
      const { error: updatePropertiesError } = await supabase
        .from("properties")
        .update({ status: "disponible" })
        .in("id", propertyIdsWithoutUnits);

      if (updatePropertiesError) console.error("Error updating properties:", updatePropertiesError);
    }

    // Mark tenants as "ancien" and revoke portal access for tenants with no remaining active contracts
    const tenantIds = [...new Set(expiredContracts.map((c: any) => c.tenant_id).filter(Boolean))];
    for (const tenantId of tenantIds) {
      const { data: otherActive } = await supabase
        .from("contracts")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .limit(1);

      if (!otherActive || otherActive.length === 0) {
        const { error: updateErr } = await supabase
          .from("tenants")
          .update({ status: "ancien", has_portal_access: false })
          .eq("id", tenantId);

        if (updateErr) {
          console.error(`Failed to update tenant ${tenantId} to ancien:`, updateErr);
        } else {
          console.log(`Tenant ${tenantId} marked as ancien, portal access revoked`);
        }
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
          message: contract.unit_id 
            ? `Le contrat de ${tenantName} pour ${propertyTitle} a expiré. La porte a été libérée.`
            : `Le contrat de ${tenantName} pour ${propertyTitle} a expiré. Le bien a été remis en disponible.`,
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
      `Expired ${contractIds.length} contracts, updated ${unitIds.length} units and ${propertyIdsWithoutUnits.length} properties`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `${contractIds.length} contrat(s) expiré(s)`,
        expired_count: contractIds.length,
        updated_units: unitIds.length,
        updated_properties: propertyIdsWithoutUnits.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in expire-contracts function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
