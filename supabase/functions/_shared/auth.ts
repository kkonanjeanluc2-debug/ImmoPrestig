import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  error?: string;
}

/**
 * Validates the JWT token from the Authorization header using getClaims.
 * Returns the user ID if valid, otherwise returns an error.
 */
export async function validateAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return { authenticated: false, error: "Missing or invalid Authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data?.user) {
    return { authenticated: false, error: error?.message || "Invalid token" };
  }

  return { authenticated: true, userId: data.user.id };
}

/**
 * Creates an unauthorized response with proper CORS headers.
 */
export function unauthorizedResponse(message: string = "Unauthorized"): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}
