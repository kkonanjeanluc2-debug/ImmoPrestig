/**
 * Centralized React Query key factory.
 *
 * Use these helpers instead of inlining array literals in `queryKey` so all
 * components share the exact same cache entries and invalidations stay
 * consistent. Each domain exposes a small set of helpers; prefer extending
 * this file over re-inventing keys at call sites.
 *
 * Convention:
 *   <domain>.all                       -> root key (invalidate everything for that domain)
 *   <domain>.list(filters?)            -> a list query
 *   <domain>.detail(id)                -> a single-record query
 *   <domain>.<custom>(...)             -> any other stable subset
 */

export const parcellesKeys = {
  all: ["parcelles"] as const,
  list: (lotissementId?: string) =>
    [...parcellesKeys.all, "list", lotissementId ?? null] as const,
  detail: (id: string) => [...parcellesKeys.all, "detail", id] as const,
  ventesAcquereurs: (lotissementId: string | undefined, soldIdsKey: string) =>
    [
      ...parcellesKeys.all,
      "ventes-acquereurs",
      lotissementId ?? null,
      soldIdsKey,
    ] as const,
};

export const lotissementsKeys = {
  all: ["lotissements"] as const,
  list: () => [...lotissementsKeys.all, "list"] as const,
  detail: (id: string) => [...lotissementsKeys.all, "detail", id] as const,
  deleted: (userId?: string) =>
    ["deleted-lotissements", userId ?? null] as const,
};

export const propertiesKeys = {
  all: ["properties"] as const,
  list: () => [...propertiesKeys.all, "list"] as const,
  detail: (id: string) => [...propertiesKeys.all, "detail", id] as const,
  deleted: (userId?: string) => ["deleted-properties", userId ?? null] as const,
};

export const ownersKeys = {
  all: ["owners"] as const,
  list: () => [...ownersKeys.all, "list"] as const,
  detail: (id: string) => [...ownersKeys.all, "detail", id] as const,
  deleted: (userId?: string) => ["deleted-owners", userId ?? null] as const,
};

export const biensVenteKeys = {
  all: ["biens-vente"] as const,
  list: () => [...biensVenteKeys.all, "list"] as const,
  detail: (id: string) => [...biensVenteKeys.all, "detail", id] as const,
  deleted: () => [...biensVenteKeys.all, "deleted"] as const,
};

export const activityLogsKeys = {
  all: ["activity-logs"] as const,
};

export const trashKeys = {
  count: ["trash-count"] as const,
};
