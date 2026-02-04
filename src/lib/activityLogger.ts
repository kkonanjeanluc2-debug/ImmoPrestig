/**
 * Activity logging is disabled.
 * This is a no-op stub to maintain backward compatibility.
 */
export async function logActivityDirect(
  _userId: string,
  _actionType: string,
  _entityType: string,
  _entityName?: string,
  _entityId?: string,
  _details?: unknown
): Promise<void> {
  // Activity logging disabled - no-op
}
