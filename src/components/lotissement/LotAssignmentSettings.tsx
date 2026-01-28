import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserCheck, Loader2, MapPin } from "lucide-react";
import { Parcelle, useUpdateParcelle } from "@/hooks/useParcelles";
import { useAssignableUsers, useIsAgencyOwner } from "@/hooks/useAssignableUsers";
import { AssignUserSelect } from "@/components/assignment/AssignUserSelect";
import { toast } from "sonner";

interface LotAssignmentSettingsProps {
  parcelles: Parcelle[];
  lotissementName: string;
}

export function LotAssignmentSettings({ parcelles, lotissementName }: LotAssignmentSettingsProps) {
  const { isOwner } = useIsAgencyOwner();
  const { data: assignableUsers } = useAssignableUsers();
  const updateParcelle = useUpdateParcelle();

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Seul l'administrateur peut gérer les affectations des lots.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredParcelles = parcelles.filter(p =>
    p.plot_number.toLowerCase().includes(search.toLowerCase()) ||
    (p.notes?.toLowerCase().includes(search.toLowerCase()))
  );

  const getAssigneeName = (userId: string | null | undefined) => {
    if (!userId) return "Non assigné";
    const user = assignableUsers?.find(u => u.user_id === userId);
    return user?.full_name || user?.email || "Inconnu";
  };

  const handleAssignment = async (parcelleId: string, assignedTo: string | null) => {
    try {
      await updateParcelle.mutateAsync({ id: parcelleId, assigned_to: assignedTo } as any);
      toast.success("Affectation mise à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) {
      toast.error("Sélectionnez au moins un lot");
      return;
    }
    setIsAssigning(true);
    try {
      await Promise.all(
        selectedIds.map(id =>
          updateParcelle.mutateAsync({ id, assigned_to: bulkAssignee } as any)
        )
      );
      toast.success(`${selectedIds.length} lot(s) affecté(s)`);
      setSelectedIds([]);
      setBulkAssignee(null);
    } catch (error) {
      toast.error("Erreur lors de l'affectation");
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredParcelles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredParcelles.map(p => p.id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "disponible": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
      case "reserve": return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "vendu": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      default: return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Affectation des lots - {lotissementName}
        </CardTitle>
        <CardDescription>
          Affectez les lots aux commerciaux de votre équipe pour le suivi des ventes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un lot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedIds.length} sélectionné(s)
            </span>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-1">
              <AssignUserSelect
                value={bulkAssignee}
                onValueChange={setBulkAssignee}
                placeholder="Affecter à..."
              />
              <Button
                size="sm"
                onClick={handleBulkAssign}
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
                onClick={() => setSelectedIds([])}
                className="w-full sm:w-auto"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        {filteredParcelles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun lot trouvé</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 border-b">
                <Checkbox
                  checked={selectedIds.length === filteredParcelles.length && filteredParcelles.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm font-medium">Tout sélectionner</span>
              </div>

              {filteredParcelles.map((parcelle) => (
                <div
                  key={parcelle.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedIds.includes(parcelle.id)}
                      onCheckedChange={() => toggleSelection(parcelle.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">Lot {parcelle.plot_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {parcelle.area} m² - {parcelle.price.toLocaleString("fr-FR")} F CFA
                      </p>
                    </div>
                    <Badge className={getStatusColor(parcelle.status)}>
                      {parcelle.status === "disponible" && "Disponible"}
                      {parcelle.status === "reserve" && "Réservé"}
                      {parcelle.status === "vendu" && "Vendu"}
                    </Badge>
                  </div>
                  <div className="sm:w-48 pl-8 sm:pl-0">
                    <AssignUserSelect
                      value={(parcelle as any).assigned_to}
                      onValueChange={(value) => handleAssignment(parcelle.id, value)}
                      placeholder="Non assigné"
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
