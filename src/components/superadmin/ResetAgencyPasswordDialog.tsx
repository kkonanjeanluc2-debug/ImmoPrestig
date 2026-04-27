import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, KeyRound, Eye, EyeOff, Copy, Check, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ResetAgencyPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agency: { user_id: string; name: string; email: string | null } | null;
}

function generateStrongPassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;
  // Ensure at least one of each
  let pwd =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)];
  for (let i = pwd.length; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  // Shuffle
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

export function ResetAgencyPasswordDialog({
  open,
  onOpenChange,
  agency,
}: ResetAgencyPasswordDialogProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setPassword("");
    setShowPassword(false);
    setCopied(false);
    onOpenChange(false);
  };

  const handleGenerate = () => {
    setPassword(generateStrongPassword(12));
    setShowPassword(true);
  };

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleReset = async () => {
    if (!agency) return;

    if (password.length < 8) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 8 caractères.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("super-admin-reset-password", {
        body: { userId: agency.user_id, newPassword: password },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Mot de passe réinitialisé",
        description: `Le nouveau mot de passe pour "${agency.name}" a été défini. Pensez à le communiquer de manière sécurisée.`,
      });
      handleClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Impossible de réinitialiser le mot de passe.";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : handleClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Réinitialiser le mot de passe
          </DialogTitle>
          <DialogDescription>
            Définissez un nouveau mot de passe pour le compte{" "}
            <span className="font-semibold text-foreground">{agency?.name}</span>
            {agency?.email ? (
              <>
                {" "}
                ({agency.email})
              </>
            ) : null}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Cette action remplace immédiatement le mot de passe actuel. Communiquez le
              nouveau mot de passe au propriétaire de l'agence par un canal sécurisé.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="new-agency-password">Nouveau mot de passe</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="new-agency-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="pr-20"
                  autoComplete="new-password"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Afficher / masquer le mot de passe"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!password}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    aria-label="Copier le mot de passe"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerate}
                title="Générer un mot de passe fort"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cliquez sur l'icône <RefreshCw className="inline h-3 w-3" /> pour générer un mot de passe sûr.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleReset} disabled={isLoading || password.length < 8}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Réinitialiser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
