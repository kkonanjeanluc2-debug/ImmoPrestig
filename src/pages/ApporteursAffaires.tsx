import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Eye, Phone, Mail, UserPlus } from "lucide-react";
import { useApporteursAffaires, useDeleteApporteur, type ApporteurAffaires } from "@/hooks/useApporteursAffaires";
import { AddApporteurDialog } from "@/components/apporteurs/AddApporteurDialog";
import { ApporteurDetailsDialog } from "@/components/apporteurs/ApporteurDetailsDialog";
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

export default function ApporteursAffaires() {
  const { data: apporteurs, isLoading } = useApporteursAffaires();
  const deleteApporteur = useDeleteApporteur();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editApporteur, setEditApporteur] = useState<ApporteurAffaires | null>(null);
  const [viewApporteur, setViewApporteur] = useState<ApporteurAffaires | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = apporteurs?.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.phone?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const totalCommissions = filtered.length;
  const activeCount = filtered.filter(a => a.status === "actif").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Apporteurs d'affaires</h1>
          <p className="text-muted-foreground">Gérez vos apporteurs d'affaires et leurs commissions</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Ajouter un apporteur
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalCommissions}</div>
            <p className="text-sm text-muted-foreground">Total apporteurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
            <p className="text-sm text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">{totalCommissions - activeCount}</div>
            <p className="text-sm text-muted-foreground">Inactifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Liste des apporteurs</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Chargement...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">Aucun apporteur trouvé</p>
              <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un apporteur
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(apporteur => (
                  <TableRow key={apporteur.id}>
                    <TableCell className="font-medium">{apporteur.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {apporteur.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {apporteur.phone}
                          </div>
                        )}
                        {apporteur.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {apporteur.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{apporteur.commission_percentage}%</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={apporteur.status === "actif" ? "default" : "outline"}>
                        {apporteur.status === "actif" ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setViewApporteur(apporteur)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditApporteur(apporteur)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(apporteur.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddApporteurDialog
        open={showAdd || !!editApporteur}
        onOpenChange={(open) => {
          if (!open) { setShowAdd(false); setEditApporteur(null); }
        }}
        apporteur={editApporteur}
      />

      {viewApporteur && (
        <ApporteurDetailsDialog
          open={!!viewApporteur}
          onOpenChange={(open) => { if (!open) setViewApporteur(null); }}
          apporteur={viewApporteur}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet apporteur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les apports associés seront également supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteApporteur.mutate(deleteId); setDeleteId(null); } }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
