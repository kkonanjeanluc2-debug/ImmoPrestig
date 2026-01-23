import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building2, Users, Search, Trash2, Shield, Crown, UserCog, Eye, Loader2 } from "lucide-react";
import { useIsSuperAdmin, useAllAgencies, useDeleteAgency, useSuperAdminUpdateRole, AgencyWithProfile } from "@/hooks/useSuperAdmin";
import { AppRole, ROLE_LABELS } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Navigate } from "react-router-dom";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  agence: "Agence",
  proprietaire: "Propriétaire",
};

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  super_admin: <Crown className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  gestionnaire: <UserCog className="h-3 w-3" />,
  lecture_seule: <Eye className="h-3 w-3" />,
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  admin: "bg-red-500/10 text-red-600 border-red-500/20",
  gestionnaire: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  lecture_seule: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const SuperAdmin = () => {
  const { toast } = useToast();
  const { isSuperAdmin, isLoading: isLoadingRole } = useIsSuperAdmin();
  const { data: agencies, isLoading: isLoadingAgencies } = useAllAgencies();
  const deleteAgency = useDeleteAgency();
  const updateRole = useSuperAdminUpdateRole();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, AppRole>>({});

  // Redirect if not super admin
  if (!isLoadingRole && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredAgencies = (agencies || []).filter(
    (agency) =>
      agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    setPendingRoleChanges((prev) => ({ ...prev, [userId]: newRole }));
  };

  const saveRoleChange = async (userId: string) => {
    const newRole = pendingRoleChanges[userId];
    if (!newRole) return;

    try {
      await updateRole.mutateAsync({ userId, role: newRole });
      setPendingRoleChanges((prev) => {
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

  const handleDeleteAgency = async (agency: AgencyWithProfile) => {
    try {
      await deleteAgency.mutateAsync(agency.id);
      toast({
        title: "Agence supprimée",
        description: `L'agence "${agency.name}" a été supprimée.`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'agence.",
        variant: "destructive",
      });
    }
  };

  const totalAgencies = agencies?.filter((a) => a.account_type === "agence").length || 0;
  const totalProprietaires = agencies?.filter((a) => a.account_type === "proprietaire").length || 0;

  if (isLoadingRole) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Crown className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Espace Super Admin
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestion centralisée des agences et propriétaires
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agences</p>
                  <p className="text-2xl font-bold">{totalAgencies}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Propriétaires</p>
                  <p className="text-2xl font-bold">{totalProprietaires}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total comptes</p>
                  <p className="text-2xl font-bold">{agencies?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agencies List */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des comptes</CardTitle>
            <CardDescription>
              Gérez les agences et propriétaires inscrits sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email ou ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoadingAgencies ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAgencies.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucun compte trouvé
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Compte</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Inscrit le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgencies.map((agency) => {
                      const currentRole = pendingRoleChanges[agency.user_id] || agency.role || "lecture_seule";
                      const hasPendingChange = !!pendingRoleChanges[agency.user_id];

                      return (
                        <TableRow key={agency.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={agency.logo_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getInitials(agency.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{agency.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {agency.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {ACCOUNT_TYPE_LABELS[agency.account_type] || agency.account_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {agency.city ? (
                              <span>
                                {agency.city}
                                {agency.country ? `, ${agency.country}` : ""}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Non renseigné</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select
                                value={currentRole}
                                onValueChange={(value: AppRole) =>
                                  handleRoleChange(agency.user_id, value)
                                }
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue>
                                    <div className="flex items-center gap-2">
                                      {ROLE_ICONS[currentRole]}
                                      <span>{ROLE_LABELS[currentRole] || currentRole}</span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {(["super_admin", "admin", "gestionnaire", "lecture_seule"] as AppRole[]).map(
                                    (role) => (
                                      <SelectItem key={role} value={role}>
                                        <div className="flex items-center gap-2">
                                          {ROLE_ICONS[role]}
                                          <span>{ROLE_LABELS[role] || role}</span>
                                        </div>
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                              {hasPendingChange && (
                                <Button
                                  size="sm"
                                  onClick={() => saveRoleChange(agency.user_id)}
                                  disabled={updateRole.isPending}
                                >
                                  {updateRole.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Sauver"
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(agency.created_at), "dd MMM yyyy", {
                              locale: fr,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Supprimer ce compte ?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible. Le compte "{agency.name}" et toutes ses données associées seront définitivement supprimés.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteAgency(agency)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdmin;
