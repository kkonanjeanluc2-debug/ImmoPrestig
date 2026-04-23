export function createAgencySlug(value: string, fallback?: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (normalized) return normalized;

  if (fallback) {
    return fallback
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "agence";
  }

  return "agence";
}

export function createDefaultAgencySlug(name: string, uniqueSeed?: string) {
  const base = createAgencySlug(name);
  const suffix = uniqueSeed?.slice(0, 8).toLowerCase();

  return suffix ? `${base}-${suffix}` : base;
}

export function buildAgencyLoginUrl(slug: string) {
  return `${window.location.origin}/${slug}/login`;
}