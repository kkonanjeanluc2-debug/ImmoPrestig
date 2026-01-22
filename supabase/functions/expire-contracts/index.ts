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

    const today = new Date().toISOString().split("T")[0];

    // Find all active contracts with end_date < today
    const { data: expiredContracts, error: fetchError } = await supabase
      .from("contracts")
      .select("id, property_id")
      .eq("status", "active")
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
