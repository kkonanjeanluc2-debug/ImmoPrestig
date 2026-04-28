import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDedicatedLoginPath, hasDedicatedLoginSlug } from "@/lib/dedicatedLogin";

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function readSlug(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.sessionStorage.getItem("dedicated_login_slug") ||
    window.localStorage.getItem("dedicated_login_slug")
  );
}

// Routes publiques autorisées même en mode standalone (signature, réponse vendeur, reset)
const ALWAYS_ALLOWED_PREFIXES = [
  "/sign-contract",
  "/sign-vente",
  "/sign-achat",
  "/sign-payout",
  "/offre-vendeur",
  "/reset-password",
  "/forgot-password",
];

/**
 * En mode PWA standalone, si l'agence a installé l'application via son lien dédié
 * (/:slug/login ou /:slug/install), on force toute ouverture à passer par
 * /:slug/login tant que l'utilisateur n'est pas connecté.
 */
export default function StandaloneSlugGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isStandaloneApp()) return;
    if (!hasDedicatedLoginSlug()) return;

    const slug = readSlug();
    if (!slug) return;

    const path = location.pathname;

    // Toujours autoriser les routes du slug dédié
    if (path.startsWith(`/${slug}/`) || path === `/${slug}`) return;

    // Routes publiques (signatures, etc.)
    if (ALWAYS_ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) return;

    // Si pas connecté → forcer le login dédié
    if (!user) {
      const target = getDedicatedLoginPath();
      if (path !== target) {
        navigate(target, { replace: true });
      }
      return;
    }

    // Connecté : on autorise les routes app authentifiées (dashboard, etc.)
    // mais on bloque les routes de login/signup génériques.
    const blockedWhenAuthed = ["/login", "/signup", "/"];
    if (blockedWhenAuthed.includes(path)) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  return null;
}
