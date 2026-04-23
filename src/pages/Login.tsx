import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, User, Lock, CreditCard, Eye, EyeOff } from "lucide-react";
import { usePlatformBranding } from "@/hooks/usePlatformBranding";
import { DemoRequestButton } from "@/components/common/DemoRequestButton";
import { isValidEmail, EMAIL_ERROR_MESSAGE } from "@/lib/emailValidation";

// Convert phone number to pseudo-email for auth (must match edge function logic)
function phoneToEmail(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  return `phone_${cleaned}@tenant.immoprestige.local`;
}

function isPhoneNumber(value: string): boolean {
  const cleaned = value.replace(/[^0-9+]/g, "");
  return /^[+]?[0-9]{8,15}$/.test(cleaned);
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60_000; // 1 minute

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // Bot trap
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [agencyBranding, setAgencyBranding] = useState<{ agency_name: string; logo_url: string | null; login_image_url: string | null; slug: string; is_default?: boolean; } | null>(null);
  const { signIn } = useAuth();
  const { logoUrl: platformLogo, appName: platformAppName } = usePlatformBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const { agencySlug } = useParams();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    let cancelled = false;

    const loadAgencyBranding = async () => {
      if (!agencySlug) {
        setAgencyBranding(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke("get-agency-login-branding", {
        body: { slug: agencySlug },
      });

      if (!cancelled) {
        if (error || !data?.branding) {
          setAgencyBranding(null);
          return;
        }

        setAgencyBranding(data.branding);
      }
    };

    void loadAgencyBranding();

    return () => {
      cancelled = true;
    };
  }, [agencySlug]);

  const displayLogo = agencyBranding?.logo_url || platformLogo;
  const displayAppName = agencyBranding?.agency_name || platformAppName;
  const isDefaultBranding = agencyBranding?.is_default ?? false;
  const backgroundStyle = agencyBranding?.login_image_url
    ? {
        backgroundImage: `linear-gradient(hsl(var(--background) / 0.76), hsl(var(--background) / 0.88)), url(${agencyBranding.login_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Anti-bot: honeypot check
    if (honeypot) {
      console.warn("[Auth] Bot detected via honeypot");
      return;
    }

    // Rate limiting
    if (lockedUntil && Date.now() < lockedUntil) {
      const secondsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
      toast({
        variant: "destructive",
        title: "Trop de tentatives",
        description: `Veuillez patienter ${secondsLeft} secondes avant de réessayer.`,
      });
      return;
    }

    let loginEmail: string;
    const trimmed = identifier.trim();

    if (isPhoneNumber(trimmed)) {
      // Phone-based login: resolve actual auth email via edge function
      setIsLoading(true);
      try {
        const { data, error: resolveError } = await supabase.functions.invoke("resolve-tenant-login", {
          body: { phone: trimmed },
        });
        if (resolveError || !data?.auth_email) {
          loginEmail = phoneToEmail(trimmed);
        } else {
          loginEmail = data.auth_email;
        }
      } catch {
        loginEmail = phoneToEmail(trimmed);
      }
    } else if (isValidEmail(trimmed)) {
      loginEmail = trimmed;
      setIsLoading(true);
    } else {
      toast({
        variant: "destructive",
        title: "Identifiant invalide",
        description: "Veuillez entrer un email valide ou un numéro de téléphone",
      });
      return;
    }

    if (!isLoading) setIsLoading(true);

    const { error } = await signIn(loginEmail, password);

    if (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_DURATION);
        setAttempts(0);
      }
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: error.message === "Invalid login credentials" ? "Email ou mot de passe incorrect" : error.message,
      });
      setIsLoading(false);
      return;
    }
    setAttempts(0);
    setLockedUntil(null);

    toast({
      title: "Connexion réussie",
      description: "Bienvenue !",
    });

    // Check if there's a pending plan upgrade from signup
    const pendingPlan = localStorage.getItem("pending_upgrade_plan");
    if (pendingPlan) {
      localStorage.removeItem("pending_upgrade_plan");
      navigate(`/settings?tab=subscription&upgrade_plan=${encodeURIComponent(pendingPlan)}`, { replace: true });
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4" style={backgroundStyle}>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-20 h-20 rounded-full overflow-hidden shadow-md">
            <img src={displayLogo} alt={displayAppName} className="w-full h-full object-cover" />
          </div>
          <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder à votre espace de gestion immobilière{agencyBranding && !isDefaultBranding ? ` — ${agencyBranding.agency_name}` : ""}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} autoComplete="off">
          <CardContent className="space-y-4">
            {/* Honeypot anti-bot field - invisible to users */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identifier">Email ou téléphone</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder="votre@email.com ou 0700000000"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Pas encore de compte ?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                S'inscrire
              </Link>
            </p>
            <Link
              to="/"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Accueil
            </Link>
            <DemoRequestButton
              variant="outline"
              size="sm"
              className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
            />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
