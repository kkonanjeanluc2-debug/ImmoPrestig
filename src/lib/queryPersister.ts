import { get, set, del } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/query-persist-client-core";

const IDB_KEY = "immoprestige_query_cache";

/**
 * Creates an IndexedDB-backed persister for TanStack Query.
 * This allows cached data to survive page reloads and work offline.
 */
export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(IDB_KEY, client);
      } catch {
        // Storage quota exceeded or other IDB error — silently ignore
      }
    },
    restoreClient: async () => {
      try {
        return await get<PersistedClient>(IDB_KEY);
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(IDB_KEY);
      } catch {
        // ignore
      }
    },
  };
}
