import { useState, useEffect } from "react";
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
import { Loader2, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { AgencyMember } from "@/hooks/useAgencyMembers";

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: AgencyMember | null;
}

export function EditMemberDialog({
  open,
  onOpenChange,
  member,
}: EditMemberDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
  });

  const profileData = member?.profile as { email?: string | null; full_name?: string | null } | undefined;

  useEffect(() => {
    if (member && profileData) {
      setFormData({
        full_name: profileData.full_name || "",
        email: profileData.email || "",
      });
    }
  }, [member, profileData]);

  const handleSave = async () => {
    if (!member) return;

    setIsLoading(true);
    try {
      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          email: formData.email,
        })
        .eq("user_id", member.user_id);

      if (error) throw error;

      toast({
        title: "Membre mis à jour",
        description: "Les informations du membre ont été modifiées.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["agency-members"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le membre",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Modifier le membre
          </DialogTitle>
          <DialogDescription>
            Modifiez les informations de ce membre de l'équipe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit_full_name">Nom complet</Label>
            <Input
              id="edit_full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Jean Dupont"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_email">Email</Label>
            <Input
              id="edit_email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jean@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Note: Ceci modifie l'email dans le profil, pas l'email de connexion
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
