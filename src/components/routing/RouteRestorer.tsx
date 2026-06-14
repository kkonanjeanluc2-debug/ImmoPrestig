import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "_last_route";

// Paths that should not be saved nor restored to
const SKIP = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/dashboard", "/pricing"];
function shouldSkip(path: string): boolean {
  return (
    SKIP.includes(path) ||
    path.startsWith("/sign-") ||
    path.startsWith("/offre-") ||
    path.startsWith("/install")
  );
}

function isPageReload(): boolean {
  try {
    const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return entry?.type === "reload";
  } catch {
    return false;
  }
}

/**
 * Sauvegarde le chemin actuel à chaque navigation.
 * Au rechargement de page, restaure ce chemin si l'app a redirigé vers /dashboard
 * avant que les données soient chargées.
 */
export default function RouteRestorer() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Evaluate once at module init (synchronously before React renders)
  const isReload = useRef(isPageReload());
  // The path we intend to be on (captured at mount, i.e. the browser's URL bar)
  const intendedPath = useRef<string | null>(null);
  const done = useRef(false);

  // Capture intended path synchronously on first render
  if (intendedPath.current === null && isReload.current) {
    const p = location.pathname + (location.search || "");
    intendedPath.current = shouldSkip(p) ? null : p;
  }

  // Save current path on every deliberate navigation (not on reload - that's the intended path)
  useEffect(() => {
    if (isReload.current) return; // Don't overwrite until after restore is done
    const p = location.pathname + (location.search || "");
    if (!shouldSkip(p)) {
      sessionStorage.setItem(STORAGE_KEY, p);
    }
  }, [location.pathname, location.search]);

  // After auth resolves on a reload: if the route changed (redirect happened), restore
  useEffect(() => {
    if (loading || !user || done.current || !isReload.current || !intendedPath.current) return;

    const target = intendedPath.current;

    if (location.pathname === target) {
      // Correct page - mark done so we don't block future intentional navigation
      // Wait briefly in case a route guard hasn't fired yet
      const t = setTimeout(() => {
        done.current = true;
        isReload.current = false; // Allow path saving to resume
      }, 600);
      return () => clearTimeout(t);
    }

    // We were redirected away - navigate back to intended page
    done.current = true;
    isReload.current = false;
    navigate(target, { replace: true });
  }, [loading, user, location.pathname, navigate]);

  return null;
}
