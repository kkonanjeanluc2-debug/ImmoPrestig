import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, User, Lock, CreditCard, Eye, EyeOff } from "lucide-react";
import { DemoRequestButton } from "@/components/common/DemoRequestButton";
import { isValidEmail, EMAIL_ERROR_MESSAGE } from "@/lib/emailValidation";

// Convert phone number to pseudo-email for auth (must match edge function logic)
function phoneToEmail(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  return `phone_${cleaned}@tenant.immoprestige.local`;
}

function isPhoneNumber(value: string): boolean {
  const cleaned = value.replace(/\s/g, "");
  return /^[+]?[0-9]{8,15}$/.test(cleaned);
}

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = identifier.trim();
    let loginEmail: string;

    if (isPhoneNumber(trimmed)) {
      // Phone-based login: convert to pseudo-email
      loginEmail = phoneToEmail(trimmed);
    } else if (isValidEmail(trimmed)) {
      loginEmail = trimmed;
    } else {
      toast({ variant: "destructive", title: "Identifiant invalide", description: "Veuillez entrer un email valide ou un numéro de téléphone" });
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(loginEmail, password);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: error.message === "Invalid login credentials" 
          ? "Email ou mot de passe incorrect" 
          : error.message,
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Connexion réussie",
      description: "Bienvenue !",
    });

    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder à votre espace de gestion immobilière
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="text-right">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
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
              Voir nos tarifs
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
