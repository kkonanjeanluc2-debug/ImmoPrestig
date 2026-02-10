import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function isEmailEnabled(): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "resend_email_enabled")
    .maybeSingle();

  // Default to true if setting doesn't exist
  return data?.value !== "false";
}
