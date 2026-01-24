import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Users, Search, UserCheck, Loader2, Home, User } from "lucide-react";
import { useProperties, useUpdateProperty } from "@/hooks/useProperties";
import { useTenants, useUpdateTenant } from "@/hooks/useTenants";
import { useAssignableUsers, useIsAgencyOwner } from "@/hooks/useAssignableUsers";
import { AssignUserSelect } from "@/components/assignment/AssignUserSelect";
import { toast } from "sonner";

export function AssignmentsSettings() {
  const { isOwner } = useIsAgencyOwner();
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: assignableUsers } = useAssignableUsers();
  const updateProperty = useUpdateProperty();
  const updateTenant = useUpdateTenant();

  const [propertySearch, setPropertySearch] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [bulkPropertyAssignee, setBulkPropertyAssignee] = useState<string | null>(null);
  const [bulkTenantAssignee, setBulkTenantAssignee] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Seul le propriétaire de l'agence peut gérer les affectations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredProperties = properties?.filter(p =>
    p.title.toLowerCase().includes(propertySearch.toLowerCase()) ||
    p.address.toLowerCase().includes(propertySearch.toLowerCase())
  ) || [];

  const filteredTenants = tenants?.filter(t =>
    t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.email.toLowerCase().includes(tenantSearch.toLowerCase())
  ) || [];

  const getAssigneeName = (userId: string | null | undefined) => {
    if (!userId) return "Non assigné";
    const user = assignableUsers?.find(u => u.user_id === userId);
    return user?.full_name || user?.email || "Inconnu";
  };

  const handlePropertyAssignment = async (propertyId: string, assignedTo: string | null) => {
    try {
      await updateProperty.mutateAsync({ id: propertyId, assigned_to: assignedTo });
      toast.success("Affectation mise à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleTenantAssignment = async (tenantId: string, assignedTo: string | null) => {
    try {
      await updateTenant.mutateAsync({ id: tenantId, assigned_to: assignedTo });
      toast.success("Affectation mise à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleBulkPropertyAssign = async () => {
    if (selectedPropertyIds.length === 0) {
      toast.error("Sélectionnez au moins un bien");
      return;
    }
    setIsAssigning(true);
    try {
      await Promise.all(
        selectedPropertyIds.map(id =>
          updateProperty.mutateAsync({ id, assigned_to: bulkPropertyAssignee })
        )
      );
      toast.success(`${selectedPropertyIds.length} bien(s) affecté(s)`);
      setSelectedPropertyIds([]);
      setBulkPropertyAssignee(null);
    } catch (error) {
      toast.error("Erreur lors de l'affectation");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBulkTenantAssign = async () => {
    if (selectedTenantIds.length === 0) {
      toast.error("Sélectionnez au moins un locataire");
      return;
    }
    setIsAssigning(true);
    try {
      await Promise.all(
        selectedTenantIds.map(id =>
          updateTenant.mutateAsync({ id, assigned_to: bulkTenantAssignee })
        )
      );
      toast.success(`${selectedTenantIds.length} locataire(s) affecté(s)`);
      setSelectedTenantIds([]);
      setBulkTenantAssignee(null);
    } catch (error) {
      toast.error("Erreur lors de l'affectation");
    } finally {
      setIsAssigning(false);
    }
  };

  const togglePropertySelection = (id: string) => {
    setSelectedPropertyIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleTenantSelection = (id: string) => {
    setSelectedTenantIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAllProperties = () => {
    if (selectedPropertyIds.length === filteredProperties.length) {
      setSelectedPropertyIds([]);
    } else {
      setSelectedPropertyIds(filteredProperties.map(p => p.id));
    }
  };

  const selectAllTenants = () => {
    if (selectedTenantIds.length === filteredTenants.length) {
      setSelectedTenantIds([]);
    } else {
      setSelectedTenantIds(filteredTenants.map(t => t.id));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Gestion des affectations
        </CardTitle>
        <CardDescription>
          Affectez les biens et locataires aux gestionnaires de votre équipe
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="properties" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Biens</span>
              <Badge variant="secondary" className="ml-1">
                {properties?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tenants" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Locataires</span>
              <Badge variant="secondary" className="ml-1">
                {tenants?.length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un bien..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedPropertyIds.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedPropertyIds.length} sélectionné(s)
                </span>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-1">
                  <AssignUserSelect
                    value={bulkPropertyAssignee}
                    onValueChange={setBulkPropertyAssignee}
                    placeholder="Affecter à..."
                  />
                  <Button
                    size="sm"
                    onClick={handleBulkPropertyAssign}
                    disabled={isAssigning}
                    className="w-full sm:w-auto"
                  >
                    {isAssigning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Appliquer"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPropertyIds([])}
                    className="w-full sm:w-auto"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {propertiesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun bien trouvé</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {/* Select All */}
                  <div className="flex items-center gap-3 p-3 border-b">
                    <Checkbox
                      checked={selectedPropertyIds.length === filteredProperties.length && filteredProperties.length > 0}
                      onCheckedChange={selectAllProperties}
                    />
                    <span className="text-sm font-medium">Tout sélectionner</span>
                  </div>

                  {filteredProperties.map((property) => (
                    <div
                      key={property.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedPropertyIds.includes(property.id)}
                          onCheckedChange={() => togglePropertySelection(property.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{property.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                        </div>
                        <Badge variant={property.status === 'disponible' ? 'secondary' : 'default'} className="shrink-0">
                          {property.status}
                        </Badge>
                      </div>
                      <div className="sm:w-48 pl-8 sm:pl-0">
                        <AssignUserSelect
                          value={property.assigned_to}
                          onValueChange={(value) => handlePropertyAssignment(property.id, value)}
                          placeholder="Non assigné"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un locataire..."
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedTenantIds.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedTenantIds.length} sélectionné(s)
                </span>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-1">
                  <AssignUserSelect
                    value={bulkTenantAssignee}
                    onValueChange={setBulkTenantAssignee}
                    placeholder="Affecter à..."
                  />
                  <Button
                    size="sm"
                    onClick={handleBulkTenantAssign}
                    disabled={isAssigning}
                    className="w-full sm:w-auto"
                  >
                    {isAssigning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Appliquer"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTenantIds([])}
                    className="w-full sm:w-auto"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {tenantsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun locataire trouvé</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {/* Select All */}
                  <div className="flex items-center gap-3 p-3 border-b">
                    <Checkbox
                      checked={selectedTenantIds.length === filteredTenants.length && filteredTenants.length > 0}
                      onCheckedChange={selectAllTenants}
                    />
                    <span className="text-sm font-medium">Tout sélectionner</span>
                  </div>

                  {filteredTenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedTenantIds.includes(tenant.id)}
                          onCheckedChange={() => toggleTenantSelection(tenant.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{tenant.email}</p>
                        </div>
                        {tenant.property && (
                          <Badge variant="outline" className="shrink-0 hidden sm:flex">
                            <Home className="h-3 w-3 mr-1" />
                            <span className="truncate max-w-[100px]">{tenant.property.title}</span>
                          </Badge>
                        )}
                      </div>
                      <div className="sm:w-48 pl-8 sm:pl-0">
                        <AssignUserSelect
                          value={(tenant as any).assigned_to}
                          onValueChange={(value) => handleTenantAssignment(tenant.id, value)}
                          placeholder="Non assigné"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
