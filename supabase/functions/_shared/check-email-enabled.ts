import { createClient } from "npm:@supabase/supabase-js@2";

export async function isEmailEnabled(): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get the active provider
  const { data: providerData } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "email_provider")
    .maybeSingle();

  const provider = providerData?.value || "resend";

  // Check the toggle for the active provider
  const enabledKey = provider === "maileroo" ? "maileroo_email_enabled" : "resend_email_enabled";

  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", enabledKey)
    .maybeSingle();

  // Default to true if setting doesn't exist
  return data?.value !== "false";
}
