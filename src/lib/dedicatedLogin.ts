const DEDICATED_LOGIN_SLUG_KEY = "dedicated_login_slug";

export function setDedicatedLoginSlug(slug?: string | null) {
  if (typeof window === "undefined") return;

  if (slug) {
    window.sessionStorage.setItem(DEDICATED_LOGIN_SLUG_KEY, slug);
    return;
  }

  window.sessionStorage.removeItem(DEDICATED_LOGIN_SLUG_KEY);
}

export function getDedicatedLoginPath() {
  if (typeof window === "undefined") return "/login";

  const slug = window.sessionStorage.getItem(DEDICATED_LOGIN_SLUG_KEY);
  return slug ? `/${slug}/login` : "/login";
}