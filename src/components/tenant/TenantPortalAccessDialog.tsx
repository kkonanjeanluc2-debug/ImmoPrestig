import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCreateTenantPortalAccess } from "@/hooks/useTenantPortalAccess";
import { Loader2, Eye, EyeOff, KeyRound, Phone, Mail } from "lucide-react";
import { validatePassword } from "@/lib/passwordValidation";
import { PasswordStrengthIndicator } from "@/components/common/PasswordStrengthIndicator";

interface TenantPortalAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    email: string | null;
    phone?: string | null;
  };
}

export function TenantPortalAccessDialog({ open, onOpenChange, tenant }: TenantPortalAccessDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const createAccess = useCreateTenantPortalAccess();

  const hasEmail = !!tenant.email;
  const hasPhone = !!tenant.phone;
  const canCreateAccess = hasEmail || hasPhone;
  const loginIdentifier = hasEmail ? tenant.email : tenant.phone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateAccess) {
      toast.error("Le locataire doit avoir une adresse email ou un numéro de téléphone");
      return;
    }

    const { valid, errors } = validatePassword(password);
    if (!valid) {
      toast.error(errors[0]);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    try {
      await createAccess.mutateAsync({
        tenant_id: tenant.id,
        password,
      });
      const loginWith = hasEmail ? tenant.email : tenant.phone;
      toast.success("Accès portail créé avec succès", {
        description: `${tenant.name} peut maintenant se connecter avec ${loginWith}`,
      });
      onOpenChange(false);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la création de l'accès");
    }
  };

  const generatePassword = () => {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const special = "!@#$%^&*()_+-=";
    const all = lower + upper + digits + special;
    let result = "";
    result += lower.charAt(Math.floor(Math.random() * lower.length));
    result += upper.charAt(Math.floor(Math.random() * upper.length));
    result += digits.charAt(Math.floor(Math.random() * digits.length));
    result += special.charAt(Math.floor(Math.random() * special.length));
    for (let i = 4; i < 16; i++) {
      result += all.charAt(Math.floor(Math.random() * all.length));
    }
    result = result.split("").sort(() => Math.random() - 0.5).join("");
    setPassword(result);
    setConfirmPassword(result);
    setShowPassword(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Créer un accès portail
          </DialogTitle>
          <DialogDescription>
            Créer un compte de connexion pour {tenant.name}
          </DialogDescription>
        </DialogHeader>

        {!canCreateAccess ? (
          <div className="py-4 text-center text-muted-foreground">
            <p>Ce locataire n'a ni adresse email ni numéro de téléphone.</p>
            <p className="text-sm mt-2">Veuillez d'abord ajouter un email ou un téléphone au profil du locataire.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                {hasEmail ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                {hasEmail ? "Email de connexion" : "Téléphone de connexion"}
              </Label>
              <Input value={loginIdentifier || ""} disabled className="bg-muted" />
              {!hasEmail && hasPhone && (
                <p className="text-xs text-muted-foreground">
                  Le locataire se connectera avec son numéro de téléphone et son mot de passe.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generatePassword}
                  className="h-auto py-1 px-2 text-xs"
                >
                  Générer
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
                required
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createAccess.isPending}>
                {createAccess.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer l'accès
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
