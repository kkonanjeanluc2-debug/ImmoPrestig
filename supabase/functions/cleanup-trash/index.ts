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

    // Delete old lotissements from trash
    const { data: deletedLotissements, error: lotissementsError } = await supabase
      .from("lotissements")
      .delete()
      .lt("deleted_at", cutoffDate)
      .not("deleted_at", "is", null)
      .select("id, name");

    if (lotissementsError) {
      console.error("Error deleting lotissements:", lotissementsError);
    } else {
      console.log(`Deleted ${deletedLotissements?.length || 0} lotissements from trash`);
    }

    // Delete old parcelles from trash
    const { data: deletedParcelles, error: parcellesError } = await supabase
      .from("parcelles")
      .delete()
      .lt("deleted_at", cutoffDate)
      .not("deleted_at", "is", null)
      .select("id, plot_number");

    if (parcellesError) {
      console.error("Error deleting parcelles:", parcellesError);
    } else {
      console.log(`Deleted ${deletedParcelles?.length || 0} parcelles from trash`);
    }

    // Delete old ilots from trash
    const { data: deletedIlots, error: ilotsError } = await supabase
      .from("ilots")
      .delete()
      .lt("deleted_at", cutoffDate)
      .not("deleted_at", "is", null)
      .select("id, name");

    if (ilotsError) {
      console.error("Error deleting ilots:", ilotsError);
    } else {
      console.log(`Deleted ${deletedIlots?.length || 0} ilots from trash`);
    }

    // Delete old prospects from trash
    const { data: deletedProspects, error: prospectsError } = await supabase
      .from("parcelle_prospects")
      .delete()
      .lt("deleted_at", cutoffDate)
      .not("deleted_at", "is", null)
      .select("id, name");

    if (prospectsError) {
      console.error("Error deleting prospects:", prospectsError);
    } else {
      console.log(`Deleted ${deletedProspects?.length || 0} prospects from trash`);
    }

    const summary = {
      tenants: deletedTenants?.length || 0,
      properties: deletedProperties?.length || 0,
      owners: deletedOwners?.length || 0,
      lotissements: deletedLotissements?.length || 0,
      parcelles: deletedParcelles?.length || 0,
      ilots: deletedIlots?.length || 0,
      prospects: deletedProspects?.length || 0,
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
