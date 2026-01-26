import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    console.log(`Cleaning up trash items deleted before ${cutoffDate}`);

    // Delete old tenants from trash
    const { data: deletedTenants, error: tenantsError } = await supabase
      .from("tenants")
      .delete()
      .lt("deleted_at", cutoffDate)
      .not("deleted_at", "is", null)
      .select("id, name");

    if (tenantsError) {
      console.error("Error deleting tenants:", tenantsError);
    } else {
      console.log(`Deleted ${deletedTenants?.length || 0} tenants from trash`);
    }

    // Delete old properties from trash
    const { data: deletedProperties, error: propertiesError } = await supabase
      .from("properties")
      .delete()
      .lt("deleted_at", cutoffDate)
      .not("deleted_at", "is", null)
      .select("id, title");

    if (propertiesError) {
      console.error("Error deleting properties:", propertiesError);
    } else {
      console.log(`Deleted ${deletedProperties?.length || 0} properties from trash`);
    }

    // Delete old owners from trash
    const { data: deletedOwners, error: ownersError } = await supabase
      .from("owners")
      .delete()
      .lt("deleted_at", cutoffDate)
      .not("deleted_at", "is", null)
      .select("id, name");

    if (ownersError) {
      console.error("Error deleting owners:", ownersError);
    } else {
      console.log(`Deleted ${deletedOwners?.length || 0} owners from trash`);
    }

    const summary = {
      tenants: deletedTenants?.length || 0,
      properties: deletedProperties?.length || 0,
      owners: deletedOwners?.length || 0,
      cutoffDate,
    };

    console.log("Cleanup completed:", summary);

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Cleanup error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
