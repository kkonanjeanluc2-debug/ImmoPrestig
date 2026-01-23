import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Shield, 
  Loader2, 
  Crown, 
  UserCog, 
  Eye,
  AlertTriangle,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCurrentUserRole,
  useIsAdmin,
  useAllUsersWithRoles,
  useUpdateUserRole,
  AppRole,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
} from "@/hooks/useUserRoles";

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  super_admin: <Crown className="h-4 w-4 text-purple-600" />,
  admin: <Crown className="h-4 w-4" />,
  gestionnaire: <UserCog className="h-4 w-4" />,
  lecture_seule: <Eye className="h-4 w-4" />,
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-purple-100 text-purple-800 border-purple-300",
  admin: "bg-amber-100 text-amber-800 border-amber-300",
  gestionnaire: "bg-blue-100 text-blue-800 border-blue-300",
  lecture_seule: "bg-gray-100 text-gray-800 border-gray-300",
};

export function RolesSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: currentRole, isLoading: roleLoading } = useCurrentUserRole();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: allUsers, isLoading: usersLoading } = useAllUsersWithRoles();
  const updateRole = useUpdateUserRole();
  const [pendingChanges, setPendingChanges] = useState<Record<string, AppRole>>({});

  const isLoading = roleLoading || adminLoading || usersLoading;

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    setPendingChanges((prev) => ({ ...prev, [userId]: newRole }));
  };

  const saveRoleChange = async (userId: string, roleId: string) => {
    const newRole = pendingChanges[userId];
    if (!newRole) return;

    try {
      await updateRole.mutateAsync({ userId, role: newRole, roleId });
      setPendingChanges((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      toast({
        title: "Rôle mis à jour",
        description: "Le rôle de l'utilisateur a été modifié avec succès.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le rôle.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
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

  return (
    <div className="space-y-6">
      {/* Current User Role */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Votre rôle
          </CardTitle>
          <CardDescription>
            Votre niveau d'accès dans l'application
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentRole ? (
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                currentRole.role === "admin" 
                  ? "bg-amber-100" 
                  : currentRole.role === "gestionnaire" 
                  ? "bg-blue-100" 
                  : "bg-gray-100"
              }`}>
                {ROLE_ICONS[currentRole.role]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">
                    {ROLE_LABELS[currentRole.role]}
                  </span>
                  <Badge className={ROLE_COLORS[currentRole.role]}>
                    {currentRole.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {ROLE_DESCRIPTIONS[currentRole.role]}
                </p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Aucun rôle n'est attribué à votre compte. Contactez un administrateur.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* User Management (Admin Only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestion des utilisateurs
            </CardTitle>
            <CardDescription>
              Attribuez des rôles aux utilisateurs de l'application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {allUsers && allUsers.length > 0 ? (
              <div className="space-y-3">
                {allUsers.map((userItem) => {
                  const isCurrentUser = userItem.user_id === user?.id;
                  const hasPendingChange = pendingChanges[userItem.user_id];
                  const displayRole = hasPendingChange || userItem.role;

                  return (
                    <div
                      key={userItem.user_id}
                      className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                        hasPendingChange ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(userItem.full_name, userItem.email)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {userItem.full_name || "Utilisateur"}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (vous)
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {userItem.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={displayRole}
                          onValueChange={(value) =>
                            handleRoleChange(userItem.user_id, value as AppRole)
                          }
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-amber-600" />
                                Administrateur
                              </div>
                            </SelectItem>
                            <SelectItem value="gestionnaire">
                              <div className="flex items-center gap-2">
                                <UserCog className="h-4 w-4 text-blue-600" />
                                Gestionnaire
                              </div>
                            </SelectItem>
                            <SelectItem value="lecture_seule">
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-gray-600" />
                                Lecture seule
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {hasPendingChange && (
                          <Button
                            size="sm"
                            onClick={() =>
                              saveRoleChange(userItem.user_id, userItem.role_id)
                            }
                            disabled={updateRole.isPending}
                          >
                            {updateRole.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Aucun utilisateur trouvé
              </div>
            )}

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Vous ne pouvez pas modifier votre propre rôle pour éviter de perdre les droits d'administration.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Non-admin message */}
      {!isAdmin && (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Seuls les administrateurs peuvent gérer les rôles des utilisateurs.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
