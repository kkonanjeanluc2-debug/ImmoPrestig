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

const AGENCY_LOGIN_PUBLIC_ORIGIN = "https://immoprestigeci.com";

function getAgencyLoginOrigin() {
  if (typeof window === "undefined") {
    return AGENCY_LOGIN_PUBLIC_ORIGIN;
  }

  const { origin, hostname } = window.location;
  const isLovableHosted =
    hostname.includes("lovableproject.com") ||
    hostname.includes("lovable.app");
  const isLocalDevelopment = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocalDevelopment) {
    return origin;
  }

  return isLovableHosted ? AGENCY_LOGIN_PUBLIC_ORIGIN : origin;
}

export function buildAgencyLoginUrl(slug: string) {
  return `${getAgencyLoginOrigin()}/${slug}/login`;
}