import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Mail, Lock, User, Phone, MapPin, Building, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AccountType = "agence" | "proprietaire";

const Signup = () => {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType>("agence");
  
  // User credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Agency/Owner info
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Sénégal");
  const [siret, setSiret] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateStep1 = () => {
    if (!agencyName.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: accountType === "agence" 
          ? "Veuillez entrer le nom de votre agence"
          : "Veuillez entrer votre nom",
      });
      return false;
    }
    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez entrer votre email",
      });
      return false;
    }
    if (!phone.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez entrer votre numéro de téléphone",
      });
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error, data } = await signUp(email, password, agencyName);

      if (error) {
        throw error;
      }

      // Create agency record
      if (data?.user) {
        const { error: agencyError } = await supabase
          .from('agencies')
          .insert({
            user_id: data.user.id,
            account_type: accountType,
            name: agencyName,
            email: email,
            phone: phone,
            address: address || null,
            city: city || null,
            country: country,
            siret: siret || null,
          });

        if (agencyError) {
          console.error("Agency creation error:", agencyError);
          // Don't throw - user is created, agency can be added later
        }
      }

      toast({
        title: "Inscription réussie",
        description: "Votre compte a été créé avec succès !",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Créer un compte</CardTitle>
          <CardDescription>
            {step === 1 
              ? "Renseignez les informations de votre structure"
              : "Créez vos identifiants de connexion"
            }
          </CardDescription>
          
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {step === 1 ? (
              <>
                {/* Account Type Selection */}
                <div className="space-y-3">
                  <Label>Type de compte</Label>
                  <RadioGroup
                    value={accountType}
                    onValueChange={(v) => setAccountType(v as AccountType)}
                    className="grid grid-cols-2 gap-4"
                  >
                    <Label
                      htmlFor="agence"
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        accountType === "agence"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/30"
                      }`}
                    >
                      <RadioGroupItem value="agence" id="agence" className="sr-only" />
                      <Building className="h-8 w-8 text-primary" />
                      <span className="font-medium text-sm">Agence immobilière</span>
                    </Label>
                    <Label
                      htmlFor="proprietaire"
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        accountType === "proprietaire"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/30"
                      }`}
                    >
                      <RadioGroupItem value="proprietaire" id="proprietaire" className="sr-only" />
                      <Home className="h-8 w-8 text-emerald" />
                      <span className="font-medium text-sm">Propriétaire</span>
                    </Label>
                  </RadioGroup>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="agencyName">
                    {accountType === "agence" ? "Nom de l'agence *" : "Votre nom *"}
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="agencyName"
                      type="text"
                      placeholder={accountType === "agence" ? "Mon Agence Immobilière" : "Jean Dupont"}
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="contact@monagence.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+221 77 123 45 67"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      type="text"
                      placeholder="123 Rue du Commerce"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* City & Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="Dakar"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Input
                      id="country"
                      type="text"
                      placeholder="Sénégal"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                </div>

                {/* SIRET/RC (only for agencies) */}
                {accountType === "agence" && (
                  <div className="space-y-2">
                    <Label htmlFor="siret">N° NINEA / Registre de commerce</Label>
                    <Input
                      id="siret"
                      type="text"
                      placeholder="SN-DKR-2024-A-12345"
                      value={siret}
                      onChange={(e) => setSiret(e.target.value)}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 caractères
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm">Récapitulatif</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><span className="font-medium">Type :</span> {accountType === "agence" ? "Agence immobilière" : "Propriétaire indépendant"}</p>
                    <p><span className="font-medium">Nom :</span> {agencyName}</p>
                    <p><span className="font-medium">Email :</span> {email}</p>
                    <p><span className="font-medium">Tél :</span> {phone}</p>
                    {city && <p><span className="font-medium">Ville :</span> {city}, {country}</p>}
                  </div>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            {step === 1 ? (
              <Button 
                type="button" 
                className="w-full" 
                onClick={handleNextStep}
              >
                Continuer
              </Button>
            ) : (
              <div className="flex gap-3 w-full">
                <Button 
                  type="button" 
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                >
                  Retour
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  S'inscrire
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Déjà un compte ?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Signup;
