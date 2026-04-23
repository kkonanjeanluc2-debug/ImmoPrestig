const DEDICATED_LOGIN_SLUG_KEY = "dedicated_login_slug";

function readDedicatedLoginSlug() {
  if (typeof window === "undefined") return null;

  return (
    window.sessionStorage.getItem(DEDICATED_LOGIN_SLUG_KEY) ||
    window.localStorage.getItem(DEDICATED_LOGIN_SLUG_KEY)
  );
}

export function setDedicatedLoginSlug(slug?: string | null) {
  if (typeof window === "undefined") return;

  if (slug) {
    window.sessionStorage.setItem(DEDICATED_LOGIN_SLUG_KEY, slug);
    window.localStorage.setItem(DEDICATED_LOGIN_SLUG_KEY, slug);
    return;
  }

  window.sessionStorage.removeItem(DEDICATED_LOGIN_SLUG_KEY);
  window.localStorage.removeItem(DEDICATED_LOGIN_SLUG_KEY);
}

export function hasDedicatedLoginSlug() {
  return !!readDedicatedLoginSlug();
}

export function getDedicatedLoginPath() {
  if (typeof window === "undefined") return "/login";

  const slug = readDedicatedLoginSlug();
  return slug ? `/${slug}/login` : "/login";
}

export function getDedicatedInstallPath() {
  if (typeof window === "undefined") return "/install";

  const slug = readDedicatedLoginSlug();
  return slug ? `/${slug}/install` : "/install";
}