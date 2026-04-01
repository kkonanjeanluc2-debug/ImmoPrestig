import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowRightLeft, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { VenteWithDetails } from "@/hooks/useVentesParcelles";
import { useAcquereurs, useCreateAcquereur } from "@/hooks/useAcquereurs";
import { useCreateMutationParcelle, useMutationsParcelles } from "@/hooks/useMutationsParcelles";

interface MutationParcelleDialogProps {
  vente: VenteWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MutationParcelleDialog({
  vente,
  open,
  onOpenChange,
}: MutationParcelleDialogProps) {
  const { data: acquereurs = [] } = useAcquereurs();
  const { data: existingMutations = [] } = useMutationsParcelles(vente.id);
  const createAcquereur = useCreateAcquereur();
  const createMutation = useCreateMutationParcelle();

  // Current owner: last mutation's nouvel_acquereur, or the vente's acquirer
  const lastMutation = existingMutations.length > 0 ? existingMutations[existingMutations.length - 1] : null;
  const currentOwnerId = lastMutation ? lastMutation.nouvel_acquereur_id : vente.acquereur_id;
  const currentOwnerName = lastMutation?.nouvel_acquereur?.name || vente.acquereur?.name || "N/A";
  const currentOwnerPhone = lastMutation?.nouvel_acquereur?.phone || vente.acquereur?.phone || null;

  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedAcquereurId, setSelectedAcquereurId] = useState("");
  const [mutationDate, setMutationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [mutationPrice, setMutationPrice] = useState("");
  const [notes, setNotes] = useState("");

  // New acquirer form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCni, setNewCni] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const filteredAcquereurs = acquereurs.filter(
    (a) =>
      a.id !== vente.acquereur_id &&
      (a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.cni_number?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = async () => {
    let nouvelAcquereurId = selectedAcquereurId;

    if (mode === "create") {
      if (!newName.trim()) {
        toast.error("Le nom du nouvel acquéreur est requis");
        return;
      }
      try {
        const created = await createAcquereur.mutateAsync({
          name: newName.trim(),
          phone: newPhone.trim() || null,
          cni_number: newCni.trim() || null,
          email: newEmail.trim() || null,
          address: newAddress.trim() || null,
        });
        nouvelAcquereurId = created.id;
      } catch {
        toast.error("Erreur lors de la création de l'acquéreur");
        return;
      }
    }

    if (!nouvelAcquereurId) {
      toast.error("Veuillez sélectionner ou créer un nouvel acquéreur");
      return;
    }

    try {
      await createMutation.mutateAsync({
        vente_id: vente.id,
        parcelle_id: vente.parcelle_id,
        ancien_acquereur_id: vente.acquereur_id,
        nouvel_acquereur_id: nouvelAcquereurId,
        mutation_date: mutationDate,
        mutation_price: mutationPrice ? parseFloat(mutationPrice) : null,
        notes: notes.trim() || null,
      });
      toast.success("Mutation enregistrée avec succès");
      onOpenChange(false);
      resetForm();
    } catch {
      toast.error("Erreur lors de l'enregistrement de la mutation");
    }
  };

  const resetForm = () => {
    setSelectedAcquereurId("");
    setMutationDate(new Date().toISOString().split("T")[0]);
    setMutationPrice("");
    setNotes("");
    setNewName("");
    setNewPhone("");
    setNewCni("");
    setNewEmail("");
    setNewAddress("");
    setMode("select");
    setSearchQuery("");
  };

  const isPending = createMutation.isPending || createAcquereur.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Mutation du Lot {vente.parcelle?.plot_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current owner info */}
          <div className="p-3 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Acquéreur actuel (cédant)</p>
            <p className="font-medium">{vente.acquereur?.name}</p>
            {vente.acquereur?.phone && (
              <p className="text-sm text-muted-foreground">{vente.acquereur.phone}</p>
            )}
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === "select" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("select")}
              className="flex-1"
            >
              Acquéreur existant
            </Button>
            <Button
              variant={mode === "create" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("create")}
              className="flex-1"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Nouveau
            </Button>
          </div>

          {mode === "select" ? (
            <div className="space-y-2">
              <Label>Nouvel acquéreur</Label>
              <Input
                placeholder="Rechercher un acquéreur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select
                value={selectedAcquereurId}
                onValueChange={setSelectedAcquereurId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner l'acquéreur" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAcquereurs.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} {a.phone ? `(${a.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3 p-3 border rounded-lg">
              <div>
                <Label>Nom complet *</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nom et prénoms"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Téléphone"
                  />
                </div>
                <div>
                  <Label>N° CNI</Label>
                  <Input
                    value={newCni}
                    onChange={(e) => setNewCni(e.target.value)}
                    placeholder="Numéro CNI"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Email</Label>
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email"
                  />
                </div>
                <div>
                  <Label>Adresse</Label>
                  <Input
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Adresse"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mutation details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date de mutation</Label>
              <Input
                type="date"
                value={mutationDate}
                onChange={(e) => setMutationDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Prix de cession</Label>
              <Input
                type="number"
                value={mutationPrice}
                onChange={(e) => setMutationPrice(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes sur la mutation..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer la mutation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
