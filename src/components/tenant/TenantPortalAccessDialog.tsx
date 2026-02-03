import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCreateTenantPortalAccess } from "@/hooks/useTenantPortalAccess";
import { Loader2, Eye, EyeOff, KeyRound } from "lucide-react";

interface TenantPortalAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    email: string | null;
  };
}

export function TenantPortalAccessDialog({ open, onOpenChange, tenant }: TenantPortalAccessDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const createAccess = useCreateTenantPortalAccess();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenant.email) {
      toast.error("Le locataire doit avoir une adresse email");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
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
      toast.success("Accès portail créé avec succès", {
        description: `${tenant.name} peut maintenant se connecter avec ${tenant.email}`,
      });
      onOpenChange(false);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la création de l'accès");
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
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

        {!tenant.email ? (
          <div className="py-4 text-center text-muted-foreground">
            <p>Ce locataire n'a pas d'adresse email configurée.</p>
            <p className="text-sm mt-2">Veuillez d'abord ajouter une adresse email au profil du locataire.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email de connexion</Label>
              <Input value={tenant.email} disabled className="bg-muted" />
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
