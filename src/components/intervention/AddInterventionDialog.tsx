import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePropertyIntervention } from "@/hooks/usePropertyInterventions";
import { useProperties } from "@/hooks/useProperties";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddInterventionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId?: string;
  ownerId?: string;
}

const typeOptions = [
  { value: "reparation", label: "Réparation" },
  { value: "procedure", label: "Procédure administrative" },
  { value: "maintenance", label: "Maintenance" },
  { value: "autre", label: "Autre" },
];

const priorityOptions = [
  { value: "basse", label: "Basse" },
  { value: "normale", label: "Normale" },
  { value: "haute", label: "Haute" },
  { value: "urgente", label: "Urgente" },
];

const statusOptions = [
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "annule", label: "Annulé" },
];

export function AddInterventionDialog({ 
  open, 
  onOpenChange, 
  propertyId,
  ownerId 
}: AddInterventionDialogProps) {
  const createIntervention = useCreatePropertyIntervention();
  const { data: properties } = useProperties();
  
  const [formData, setFormData] = useState({
    property_id: propertyId || "",
    title: "",
    description: "",
    type: "reparation",
    priority: "normale",
    status: "en_cours",
    cost: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    provider_name: "",
    provider_phone: "",
    notes: "",
  });

  // Filter properties by owner if ownerId is provided
  const filteredProperties = ownerId 
    ? properties?.filter(p => p.owner_id === ownerId) 
    : properties;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.property_id) {
      toast.error("Veuillez sélectionner un bien");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    try {
      await createIntervention.mutateAsync({
        property_id: formData.property_id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        priority: formData.priority,
        status: formData.status,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        provider_name: formData.provider_name.trim() || null,
        provider_phone: formData.provider_phone.trim() || null,
        notes: formData.notes.trim() || null,
      });

      toast.success("Intervention ajoutée avec succès");
      onOpenChange(false);
      setFormData({
        property_id: propertyId || "",
        title: "",
        description: "",
        type: "reparation",
        priority: "normale",
        status: "en_cours",
        cost: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        provider_name: "",
        provider_phone: "",
        notes: "",
      });
    } catch (error) {
      toast.error("Erreur lors de l'ajout de l'intervention");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle intervention</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!propertyId && (
            <div className="space-y-2">
              <Label htmlFor="property_id">Bien *</Label>
              <Select
                value={formData.property_id}
                onValueChange={(value) => setFormData({ ...formData, property_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un bien" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProperties?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Réparation fuite d'eau"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorité</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez l'intervention..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Date début</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Date fin</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Coût (F CFA)</Label>
              <Input
                id="cost"
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider_name">Prestataire</Label>
              <Input
                id="provider_name"
                value={formData.provider_name}
                onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                placeholder="Nom de l'artisan/entreprise"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider_phone">Téléphone prestataire</Label>
              <Input
                id="provider_phone"
                value={formData.provider_phone}
                onChange={(e) => setFormData({ ...formData, provider_phone: e.target.value })}
                placeholder="+225 XX XX XX XX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createIntervention.isPending}>
              {createIntervention.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
