import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Loader2, 
  Crown, 
  UserCog, 
  Eye,
  UserPlus,
  Trash2,
  Check,
  AlertTriangle,
  Infinity,
  Mail,
  Shield,
  Settings2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency } from "@/hooks/useAgency";
import {
  useAgencyMembers,
  useCanAddMember,
  useCreateAgencyMember,
  useUpdateAgencyMember,
  useDeleteAgencyMember,
  AgencyMember,
} from "@/hooks/useAgencyMembers";
import { AppRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/hooks/useUserRoles";
import { EditMemberPermissionsDialog } from "./EditMemberPermissionsDialog";

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  super_admin: <Crown className="h-4 w-4 text-purple-600" />,
  admin: <Crown className="h-4 w-4 text-amber-600" />,
  gestionnaire: <UserCog className="h-4 w-4 text-blue-600" />,
  lecture_seule: <Eye className="h-4 w-4 text-gray-600" />,
  locataire: <Users className="h-4 w-4 text-orange-600" />,
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-purple-100 text-purple-800 border-purple-300",
  admin: "bg-amber-100 text-amber-800 border-amber-300",
  gestionnaire: "bg-blue-100 text-blue-800 border-blue-300",
  lecture_seule: "bg-gray-100 text-gray-800 border-gray-300",
  locataire: "bg-orange-100 text-orange-800 border-orange-300",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  active: "Actif",
  inactive: "Inactif",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
};

export function TeamMembersSettings() {
  const { user } = useAuth();
  const { data: agency, isLoading: agencyLoading } = useAgency();
  const { toast } = useToast();
  const { data: members, isLoading: membersLoading } = useAgencyMembers();
  const { data: limits, isLoading: limitsLoading } = useCanAddMember();
  const createMember = useCreateAgencyMember();
  const updateMember = useUpdateAgencyMember();
  const deleteMember = useDeleteAgencyMember();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [memberToEditPermissions, setMemberToEditPermissions] = useState<AgencyMember | null>(null);
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, AppRole>>({});
  
  // Form state
  const [newMember, setNewMember] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "gestionnaire" as AppRole,
  });

  const isLoading = agencyLoading || membersLoading || limitsLoading;
  const isOwner = agency?.user_id === user?.id;

  const handleAddMember = async () => {
    if (!newMember.email || !newMember.full_name || !newMember.password) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    if (newMember.password.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMember.mutateAsync(newMember);
      toast({
        title: "Membre ajouté",
        description: `${newMember.full_name} a été ajouté à votre équipe.`,
      });
      setIsAddDialogOpen(false);
      setNewMember({ email: "", full_name: "", password: "", role: "gestionnaire" });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le membre",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = (memberId: string, newRole: AppRole) => {
    setPendingRoleChanges((prev) => ({ ...prev, [memberId]: newRole }));
  };

  const saveRoleChange = async (memberId: string) => {
    const newRole = pendingRoleChanges[memberId];
    if (!newRole) return;

    try {
      await updateMember.mutateAsync({ memberId, role: newRole });
      setPendingRoleChanges((prev) => {
        const updated = { ...prev };
        delete updated[memberId];
        return updated;
      });
      toast({
        title: "Rôle mis à jour",
        description: "Le rôle du membre a été modifié.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le rôle",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      await deleteMember.mutateAsync(memberToDelete);
      toast({
        title: "Membre retiré",
        description: "Le membre a été retiré de votre équipe.",
      });
      setMemberToDelete(null);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer le membre",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return (email || "U").charAt(0).toUpperCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">
            Seul le propriétaire de l'agence peut gérer les membres de l'équipe.
          </p>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = limits?.maxUsers 
    ? ((limits.currentUsers || 0) / limits.maxUsers) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Usage Quota Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Quota d'utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Utilisateurs actifs</span>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{limits?.currentUsers || 1}</span>
              <span className="text-muted-foreground">/</span>
              {limits?.maxUsers === null ? (
                <Infinity className="h-4 w-4 text-muted-foreground" />
              ) : (
                <span className="text-muted-foreground">{limits?.maxUsers}</span>
              )}
            </div>
          </div>
          {limits?.maxUsers !== null && (
            <Progress 
              value={usagePercentage} 
              className={`h-2 ${
                usagePercentage >= 100 
                  ? "[&>div]:bg-destructive" 
                  : usagePercentage >= 80 
                  ? "[&>div]:bg-amber-500" 
                  : ""
              }`}
            />
          )}
          {!limits?.canAdd && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Limite atteinte. Mettez à niveau votre forfait pour ajouter plus d'utilisateurs.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Équipe
              </CardTitle>
              <CardDescription>
                Gérez les membres de votre agence et leurs permissions
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!limits?.canAdd}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un membre</DialogTitle>
                  <DialogDescription>
                    Créez un compte pour un nouveau membre de votre équipe
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nom complet</Label>
                    <Input
                      id="full_name"
                      value={newMember.full_name}
                      onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder="jean@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe temporaire</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newMember.password}
                      onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-muted-foreground">
                      Le membre pourra changer son mot de passe après connexion
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Rôle</Label>
                    <Select
                      value={newMember.role}
                      onValueChange={(value) => setNewMember({ ...newMember, role: value as AppRole })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-600" />
                            <div>
                              <div>Administrateur</div>
                              <div className="text-xs text-muted-foreground">
                                Accès complet
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="gestionnaire">
                          <div className="flex items-center gap-2">
                            <UserCog className="h-4 w-4 text-blue-600" />
                            <div>
                              <div>Gestionnaire</div>
                              <div className="text-xs text-muted-foreground">
                                Peut gérer les données
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="lecture_seule">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-gray-600" />
                            <div>
                              <div>Lecture seule</div>
                              <div className="text-xs text-muted-foreground">
                                Consultation uniquement
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddMember} disabled={createMember.isPending}>
                    {createMember.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Ajouter
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agency Owner */}
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(null, agency?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{agency?.name}</p>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                  Propriétaire
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {agency?.email}
              </p>
            </div>
          </div>

          {/* Team Members */}
          {members && members.length > 0 ? (
            members.map((member) => {
              const hasPendingChange = pendingRoleChanges[member.id];
              const displayRole = hasPendingChange || member.role;
              const profileData = member.profile as { email?: string | null; full_name?: string | null } | undefined;

              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                    hasPendingChange ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-muted">
                      {getInitials(profileData?.full_name, profileData?.email)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {profileData?.full_name || "Utilisateur"}
                      </p>
                      <Badge className={STATUS_COLORS[member.status]}>
                        {STATUS_LABELS[member.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {profileData?.email || "Email non disponible"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={displayRole}
                      onValueChange={(value) => handleRoleChange(member.id, value as AppRole)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            {ROLE_ICONS.admin}
                            Administrateur
                          </div>
                        </SelectItem>
                        <SelectItem value="gestionnaire">
                          <div className="flex items-center gap-2">
                            {ROLE_ICONS.gestionnaire}
                            Gestionnaire
                          </div>
                        </SelectItem>
                        <SelectItem value="lecture_seule">
                          <div className="flex items-center gap-2">
                            {ROLE_ICONS.lecture_seule}
                            Lecture seule
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {hasPendingChange && (
                      <Button
                        size="sm"
                        onClick={() => saveRoleChange(member.id)}
                        disabled={updateMember.isPending}
                      >
                        {updateMember.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMemberToEditPermissions(member)}
                      title="Gérer les permissions"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setMemberToDelete(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun membre ajouté</p>
              <p className="text-sm">Ajoutez des collaborateurs à votre équipe</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action retirera le membre de votre agence. Il ne pourra plus accéder aux données de l'agence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMember.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Permissions Dialog */}
      <EditMemberPermissionsDialog
        open={!!memberToEditPermissions}
        onOpenChange={(open) => !open && setMemberToEditPermissions(null)}
        member={memberToEditPermissions}
      />
    </div>
  );
}
