import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from "lucide-react";
import { useCreateDemarcheAdministrative } from "@/hooks/useDemarchesAdministratives";
import { toast } from "sonner";

interface AddDemarcheDialogProps {
  lotissementId: string;
  parcelleId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const demarcheTypes = [
  { value: "demande_titre", label: "Demande de titre" },
  { value: "bornage", label: "Bornage" },
  { value: "certificat", label: "Certificat" },
  { value: "reclamation", label: "Réclamation" },
  { value: "visite_terrain", label: "Visite terrain" },
  { value: "autre", label: "Autre" },
];

const authorities = [
  { value: "mairie", label: "Mairie" },
  { value: "prefecture", label: "Préfecture" },
  { value: "ministere", label: "Ministère" },
  { value: "cadastre", label: "Cadastre" },
  { value: "tribunal", label: "Tribunal" },
  { value: "autre", label: "Autre" },
];

const demarcheStatuses = [
  { value: "en_cours", label: "En cours" },
  { value: "en_attente", label: "En attente" },
  { value: "termine", label: "Terminé" },
  { value: "rejete", label: "Rejeté" },
];

export function AddDemarcheDialog({
  lotissementId,
  parcelleId,
  open,
  onOpenChange,
}: AddDemarcheDialogProps) {
  const createDemarche = useCreateDemarcheAdministrative();
  const [formData, setFormData] = useState({
    title: "",
    type: "demande_titre",
    authority: "cadastre",
    status: "en_cours",
    description: "",
    contact_person: "",
    contact_phone: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    cost: "",
    next_steps: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Veuillez saisir un titre");
      return;
    }

    try {
      await createDemarche.mutateAsync({
        lotissement_id: lotissementId,
        parcelle_id: parcelleId || null,
        title: formData.title.trim(),
        type: formData.type,
        authority: formData.authority,
        status: formData.status,
        description: formData.description.trim() || null,
        contact_person: formData.contact_person.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        next_steps: formData.next_steps.trim() || null,
      });

      toast.success("Démarche ajoutée avec succès");
      onOpenChange(false);
      setFormData({
        title: "",
        type: "demande_titre",
        authority: "cadastre",
        status: "en_cours",
        description: "",
        contact_person: "",
        contact_phone: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        cost: "",
        next_steps: "",
      });
    } catch {
      toast.error("Erreur lors de l'ajout de la démarche");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle démarche administrative</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre de la démarche *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="ex: Demande de titre foncier pour lot 1-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de démarche</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {demarcheTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Autorité</Label>
              <Select
                value={formData.authority}
                onValueChange={(value) => setFormData({ ...formData, authority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {authorities.map((auth) => (
                    <SelectItem key={auth.value} value={auth.value}>
                      {auth.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {demarcheStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails de la démarche..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Nom du contact"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Téléphone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+225 XX XX XX XX"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Date de début</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Date de fin</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Coût (F CFA)</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="ex: 150000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_steps">Prochaines étapes</Label>
            <Textarea
              id="next_steps"
              value={formData.next_steps}
              onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
              placeholder="Actions à effectuer..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createDemarche.isPending}>
              {createDemarche.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
