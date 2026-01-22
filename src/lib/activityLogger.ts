import { supabase } from "@/integrations/supabase/client";
import type { ActionType, EntityType } from "@/hooks/useActivityLogs";
import type { Json } from "@/integrations/supabase/types";

/**
 * Utility function to log activity directly to the database.
 * This is used inside mutation hooks where we can't use React hooks.
 */
export async function logActivityDirect(
  userId: string,
  actionType: ActionType,
  entityType: EntityType,
  entityName?: string,
  entityId?: string,
  details?: Json
): Promise<void> {
  try {
    await supabase.from("activity_logs").insert([{
      user_id: userId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_name: entityName || null,
      details: details || null,
    }]);
  } catch (error) {
    // Silent fail - activity logging should not block main operations
    console.error("Failed to log activity:", error);
  }
}
