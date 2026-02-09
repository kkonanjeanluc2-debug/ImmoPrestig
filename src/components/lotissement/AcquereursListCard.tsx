import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, Phone, Mail, IdCard } from "lucide-react";
import { useAcquereurs } from "@/hooks/useAcquereurs";
import { useVentesParcelles, VenteWithDetails } from "@/hooks/useVentesParcelles";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";

interface AcquereursListCardProps {
  lotissementId?: string;
}

export function AcquereursListCard({ lotissementId }: AcquereursListCardProps) {
  const { data: acquereurs, isLoading } = useAcquereurs();
  const { data: ventes } = useVentesParcelles(lotissementId);
  const { role } = usePermissions();
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const isGestionnaire = role === "gestionnaire";

  // Get acquéreur IDs linked to ventes in this lotissement
  const venteAcquereurIds = new Set(ventes?.map(v => v.acquereur_id) || []);

  // Filter acquéreurs: only those with ventes in this lotissement
  // For gestionnaires: only acquéreurs from ventes where sold_by === user.id
  const relevantAcquereurs = acquereurs?.filter(a => {
    if (!venteAcquereurIds.has(a.id)) return false;
    if (isGestionnaire && user) {
      // Only show acquéreurs from sales made by this gestionnaire
      return ventes?.some(v => v.acquereur_id === a.id && v.sold_by === user.id);
    }
    return true;
  }) || [];

  const filteredAcquereurs = relevantAcquereurs.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.phone?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.cni_number?.toLowerCase().includes(search.toLowerCase())
  );

  const getAcquereurVentes = (acquereurId: string) => {
    if (isGestionnaire && user) {
      return ventes?.filter(v => v.acquereur_id === acquereurId && v.sold_by === user.id) || [];
    }
    return ventes?.filter(v => v.acquereur_id === acquereurId) || [];
  };

  if (relevantAcquereurs.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucun acquéreur enregistré pour ce lotissement.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Acquéreurs ({relevantAcquereurs.length})
            </CardTitle>
            <CardDescription>
              {isGestionnaire
                ? "Liste de vos acquéreurs"
                : "Liste de tous les acquéreurs enregistrés"}
            </CardDescription>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un acquéreur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">CNI</TableHead>
                <TableHead className="hidden lg:table-cell">Profession</TableHead>
                <TableHead>Parcelles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredAcquereurs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun acquéreur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredAcquereurs.map((acquereur) => {
                  const acquereurVentes = getAcquereurVentes(acquereur.id);
                  return (
                    <TableRow key={acquereur.id}>
                      <TableCell className="font-medium">{acquereur.name}</TableCell>
                      <TableCell>
                        {acquereur.phone ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {acquereur.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {acquereur.email ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {acquereur.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {acquereur.cni_number ? (
                          <span className="flex items-center gap-1 text-sm">
                            <IdCard className="h-3 w-3" />
                            {acquereur.cni_number}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {acquereur.profession || <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        {acquereurVentes.length > 0 ? (
                          <Badge variant="secondary">{acquereurVentes.length}</Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
