import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Plus, Trash2, User, Building2, Users, Loader2, UserPlus } from "lucide-react";
import { BeneficiaireLot, useBeneficiairesLots, useCreateBeneficiaireLot, useDeleteBeneficiaireLot } from "@/hooks/useBeneficiairesLots";
import { Parcelle, useUpdateParcelle } from "@/hooks/useParcelles";
import { Lotissement } from "@/hooks/useLotissements";
import { useAgencyMembers } from "@/hooks/useAgencyMembers";
import { toast } from "sonner";

interface BeneficiairesSectionProps {
  lotissement: Lotissement;
  parcelles: Parcelle[];
  partie: "proprietaire" | "lotisseur";
}

export function BeneficiairesSection({ lotissement, parcelles, partie }: BeneficiairesSectionProps) {
  const { data: beneficiaires = [] } = useBeneficiairesLots(lotissement.id);
  const createBeneficiaire = useCreateBeneficiaireLot();
  const deleteBeneficiaire = useDeleteBeneficiaireLot();
  const updateParcelle = useUpdateParcelle();
  const { data: agencyMembers = [] } = useAgencyMembers();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addMode, setAddMode] = useState<"team" | "new" | "family">(partie === "lotisseur" ? "team" : "family");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningBeneficiaire, setAssigningBeneficiaire] = useState<BeneficiaireLot | null>(null);
  const [selectedLots, setSelectedLots] = useState<string[]>([]);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  // Form state
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [lienRole, setLienRole] = useState("");
  const [cniNumber, setCniNumber] = useState("");

  const activeMembers = agencyMembers.filter(m => m.status === "active");

  const partieBeneficiaires = beneficiaires.filter(b => b.partie === partie);
  const proprietaireBeneficiaires = beneficiaires.filter(b => b.partie === "proprietaire");
  const partieParcelles = parcelles.filter(p => p.attribution === partie);

  const title = partie === "proprietaire" ? "Membres de la famille" : "Collaborateurs";
  const icon = partie === "proprietaire" ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />;
  const partieName = partie === "proprietaire"
    ? (lotissement.proprietaire_name || "Propriétaire")
    : (lotissement.lotisseur_name || "Lotisseur");

  const handleAdd = async () => {
    if (!nom.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    try {
      await createBeneficiaire.mutateAsync({
        lotissement_id: lotissement.id,
        nom: nom.trim(),
        telephone: telephone.trim() || null,
        email: email.trim() || null,
        lien_role: lienRole.trim() || null,
        cni_number: cniNumber.trim() || null,
        partie,
      });
      toast.success("Bénéficiaire ajouté");
      setShowAddDialog(false);
      resetForm();
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleAddFromFamily = async () => {
    if (!selectedFamilyId) {
      toast.error("Sélectionnez un membre de la famille");
      return;
    }
    const familyMember = proprietaireBeneficiaires.find(b => b.id === selectedFamilyId);
    if (!familyMember) return;

    // Check if already in current party list
    const alreadyExists = partieBeneficiaires.some(b => b.nom === familyMember.nom);
    if (alreadyExists) {
      toast.error("Ce membre est déjà dans la liste");
      return;
    }

    try {
      await createBeneficiaire.mutateAsync({
        lotissement_id: lotissement.id,
        nom: familyMember.nom,
        telephone: familyMember.telephone || null,
        email: familyMember.email || null,
        lien_role: familyMember.lien_role || null,
        cni_number: familyMember.cni_number || null,
        partie,
      });
      toast.success(`${familyMember.nom} ajouté`);
      setShowAddDialog(false);
      setSelectedFamilyId("");
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleAddFromTeam = async () => {
    if (!selectedMemberId) {
      toast.error("Sélectionnez un membre");
      return;
    }
    const member = activeMembers.find(m => m.user_id === selectedMemberId);
    if (!member) return;

    const memberName = member.profile?.full_name || member.profile?.email || "Membre";
    try {
      await createBeneficiaire.mutateAsync({
        lotissement_id: lotissement.id,
        nom: memberName,
        telephone: null,
        email: member.profile?.email || null,
        lien_role: partie === "lotisseur" ? "Collaborateur" : null,
        cni_number: null,
        partie,
      });
      toast.success(`${memberName} ajouté comme bénéficiaire`);
      setShowAddDialog(false);
      setSelectedMemberId("");
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteBeneficiaire.mutateAsync({ id: deletingId, lotissementId: lotissement.id });
      toast.success("Bénéficiaire supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
    setDeletingId(null);
  };

  const openAssignDialog = (b: BeneficiaireLot) => {
    setAssigningBeneficiaire(b);
    // Pre-select lots already assigned to this beneficiaire
    const assigned = partieParcelles.filter(p => p.beneficiaire_id === b.id).map(p => p.id);
    setSelectedLots(assigned);
  };

  const toggleLot = (lotId: string) => {
    setSelectedLots(prev =>
      prev.includes(lotId) ? prev.filter(id => id !== lotId) : [...prev, lotId]
    );
  };

  const handleSaveAssignment = async () => {
    if (!assigningBeneficiaire) return;
    setIsSavingAssignment(true);
    try {
      let count = 0;
      for (const p of partieParcelles) {
        const shouldBeAssigned = selectedLots.includes(p.id);
        const isCurrentlyAssigned = p.beneficiaire_id === assigningBeneficiaire.id;
        
        if (shouldBeAssigned && !isCurrentlyAssigned) {
          await updateParcelle.mutateAsync({ id: p.id, beneficiaire_id: assigningBeneficiaire.id } as any);
          count++;
        } else if (!shouldBeAssigned && isCurrentlyAssigned) {
          await updateParcelle.mutateAsync({ id: p.id, beneficiaire_id: null } as any);
          count++;
        }
      }
      toast.success(`${count} lot(s) mis à jour`);
      setAssigningBeneficiaire(null);
    } catch {
      toast.error("Erreur lors de l'attribution");
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const resetForm = () => {
    setNom("");
    setTelephone("");
    setEmail("");
    setLienRole("");
    setCniNumber("");
  };

  const getBeneficiaireLotCount = (bId: string) =>
    partieParcelles.filter(p => p.beneficiaire_id === bId).length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title} — {partieName}
          </CardTitle>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          {partieBeneficiaires.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun {partie === "proprietaire" ? "membre" : "collaborateur"} ajouté
            </p>
          ) : (
            <div className="space-y-2">
              {partieBeneficiaires.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{b.nom}</span>
                      {b.lien_role && (
                        <Badge variant="outline" className="text-xs">{b.lien_role}</Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {getBeneficiaireLotCount(b.id)} lot(s)
                      </Badge>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      {b.telephone && <span>{b.telephone}</span>}
                      {b.email && <span>{b.email}</span>}
                      {b.cni_number && <span>CNI: {b.cni_number}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignDialog(b)}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Attribuer lots
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(b.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ajouter un {partie === "proprietaire" ? "membre de la famille" : "collaborateur"}
            </DialogTitle>
          </DialogHeader>
          <Tabs value={addMode} onValueChange={(v) => setAddMode(v as "team" | "new" | "family")}>
            {partie === "proprietaire" && proprietaireBeneficiaires.length > 0 && (
              <TabsList className="w-full">
                <TabsTrigger value="family" className="flex-1 gap-1">
                  <Users className="h-4 w-4" />
                  Membre de la famille
                </TabsTrigger>
                <TabsTrigger value="new" className="flex-1 gap-1">
                  <UserPlus className="h-4 w-4" />
                  Nouveau
                </TabsTrigger>
              </TabsList>
            )}
            {partie === "proprietaire" && proprietaireBeneficiaires.length > 0 && (
              <TabsContent value="family" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Sélectionner un membre de la famille</Label>
                  <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un membre de la famille..." />
                    </SelectTrigger>
                    <SelectContent>
                      {proprietaireBeneficiaires.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nom}
                          {b.lien_role ? ` (${b.lien_role})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddFromFamily} disabled={!selectedFamilyId || createBeneficiaire.isPending}>
                    {createBeneficiaire.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Ajouter
                  </Button>
                </DialogFooter>
              </TabsContent>
            )}
            {partie === "lotisseur" && (
              <TabsList className="w-full">
                <TabsTrigger value="team" className="flex-1 gap-1">
                  <Users className="h-4 w-4" />
                  Membre de l'équipe
                </TabsTrigger>
                <TabsTrigger value="new" className="flex-1 gap-1">
                  <UserPlus className="h-4 w-4" />
                  Nouveau
                </TabsTrigger>
              </TabsList>
            )}
            {partie === "lotisseur" && (
              <TabsContent value="team" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Sélectionner un membre</Label>
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un membre de l'équipe..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeMembers.map(m => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.profile?.full_name || m.profile?.email || "Membre"}
                          {m.profile?.email ? ` (${m.profile.email})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {activeMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Aucun membre actif dans l'équipe
                  </p>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddFromTeam} disabled={!selectedMemberId || createBeneficiaire.isPending}>
                    {createBeneficiaire.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Ajouter
                  </Button>
                </DialogFooter>
              </TabsContent>
            )}
            <TabsContent value="new" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nom complet *</Label>
                <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom et prénom" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+225..." />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" type="email" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{partie === "proprietaire" ? "Lien de parenté" : "Rôle"}</Label>
                  <Input value={lienRole} onChange={e => setLienRole(e.target.value)} placeholder={partie === "proprietaire" ? "Fils, frère, épouse..." : "Associé, directeur..."} />
                </div>
                <div className="space-y-2">
                  <Label>N° CNI</Label>
                  <Input value={cniNumber} onChange={e => setCniNumber(e.target.value)} placeholder="Numéro de pièce" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                  Annuler
                </Button>
                <Button onClick={handleAdd} disabled={createBeneficiaire.isPending}>
                  {createBeneficiaire.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Ajouter
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Assign lots dialog */}
      <Dialog open={!!assigningBeneficiaire} onOpenChange={() => setAssigningBeneficiaire(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Attribuer des lots à {assigningBeneficiaire?.nom}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sélectionnez les lots à attribuer parmi les {partieParcelles.length} lots du {partieName}
          </p>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {partieParcelles
              .sort((a, b) => a.plot_number.localeCompare(b.plot_number, undefined, { numeric: true }))
              .map(p => {
                const isSelected = selectedLots.includes(p.id);
                const otherBenef = p.beneficiaire_id && p.beneficiaire_id !== assigningBeneficiaire?.id
                  ? beneficiaires.find(b => b.id === p.beneficiaire_id)
                  : null;
                
                return (
                  <div
                    key={p.id}
                    onClick={() => !otherBenef && toggleLot(p.id)}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                      otherBenef ? "opacity-50 cursor-not-allowed" :
                      isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!!otherBenef}
                        readOnly
                        className="rounded"
                      />
                      <span className="font-medium text-sm">Lot {p.plot_number}</span>
                      <span className="text-xs text-muted-foreground">{p.area} m²</span>
                    </div>
                    {otherBenef && (
                      <Badge variant="outline" className="text-xs">
                        Attribué à {otherBenef.nom}
                      </Badge>
                    )}
                  </div>
                );
              })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningBeneficiaire(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveAssignment} disabled={isSavingAssignment}>
              {isSavingAssignment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer ({selectedLots.length} lots)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Ce bénéficiaire sera supprimé et ses lots seront désattribués.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
