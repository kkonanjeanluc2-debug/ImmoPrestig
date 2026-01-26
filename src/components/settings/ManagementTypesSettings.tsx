import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Percent, Home, Building2, Loader2, Star } from "lucide-react";
import { useManagementTypes, useCreateManagementType, useUpdateManagementType, useDeleteManagementType, ManagementType, ManagementTypeInput } from "@/hooks/useManagementTypes";

const TYPE_LABELS = {
  gestion_locative: "Gestion locative",
  commission_vente: "Commission de vente",
};

const TYPE_ICONS = {
  gestion_locative: Home,
  commission_vente: Building2,
};

interface FormData {
  name: string;
  description: string;
  percentage: string;
  type: "gestion_locative" | "commission_vente";
  is_default: boolean;
}

const defaultFormData: FormData = {
  name: "",
  description: "",
  percentage: "",
  type: "gestion_locative",
  is_default: false,
};

export function ManagementTypesSettings() {
  const { data: managementTypes = [], isLoading } = useManagementTypes();
  const createMutation = useCreateManagementType();
  const updateMutation = useUpdateManagementType();
  const deleteMutation = useDeleteManagementType();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ManagementType | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);

  const handleOpenDialog = (type?: ManagementType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        description: type.description || "",
        percentage: type.percentage.toString(),
        type: type.type as "gestion_locative" | "commission_vente",
        is_default: type.is_default,
      });
    } else {
      setEditingType(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingType(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async () => {
    const input: ManagementTypeInput = {
      name: formData.name,
      description: formData.description || undefined,
      percentage: parseFloat(formData.percentage) || 0,
      type: formData.type,
      is_default: formData.is_default,
    };

    if (editingType) {
      await updateMutation.mutateAsync({ id: editingType.id, ...input });
    } else {
      await createMutation.mutateAsync(input);
    }
    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const gestionTypes = managementTypes.filter((t) => t.type === "gestion_locative");
  const commissionTypes = managementTypes.filter((t) => t.type === "commission_vente");

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isFormValid = formData.name.trim() && formData.percentage;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Percent className="h-5 w-5 flex-shrink-0" />
                Types de gestion
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configurez les types et pourcentages de gestion
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} size="sm" className="whitespace-nowrap flex-shrink-0">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Nouveau</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingType ? "Modifier le type de gestion" : "Nouveau type de gestion"}
                  </DialogTitle>
                  <DialogDescription>
                    Définissez un type de gestion avec son pourcentage associé
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Catégorie</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "gestion_locative" | "commission_vente") =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gestion_locative">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4" />
                            Gestion locative
                          </div>
                        </SelectItem>
                        <SelectItem value="commission_vente">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Commission de vente
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Gestion Standard"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentage">Pourcentage (%)</Label>
                    <Input
                      id="percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="Ex: 8"
                      value={formData.percentage}
                      onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optionnel)</Label>
                    <Textarea
                      id="description"
                      placeholder="Décrivez les services inclus dans ce type de gestion..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_default">Type par défaut</Label>
                      <p className="text-sm text-muted-foreground">
                        Sera sélectionné automatiquement pour les nouveaux propriétaires
                      </p>
                    </div>
                    <Switch
                      id="is_default"
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Annuler
                  </Button>
                  <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingType ? "Enregistrer" : "Créer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gestion locative section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Home className="h-4 w-4" />
              Gestion locative
            </div>
            {gestionTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center border rounded-lg bg-muted/30">
                Aucun type de gestion locative configuré
              </p>
            ) : (
              <div className="grid gap-3">
                {gestionTypes.map((type) => (
                  <ManagementTypeCard
                    key={type.id}
                    type={type}
                    onEdit={() => handleOpenDialog(type)}
                    onDelete={() => handleDelete(type.id)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Commission de vente section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Commission de vente
            </div>
            {commissionTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center border rounded-lg bg-muted/30">
                Aucun type de commission de vente configuré
              </p>
            ) : (
              <div className="grid gap-3">
                {commissionTypes.map((type) => (
                  <ManagementTypeCard
                    key={type.id}
                    type={type}
                    onEdit={() => handleOpenDialog(type)}
                    onDelete={() => handleDelete(type.id)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ManagementTypeCardProps {
  type: ManagementType;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function ManagementTypeCard({ type, onEdit, onDelete, isDeleting }: ManagementTypeCardProps) {
  const Icon = TYPE_ICONS[type.type as keyof typeof TYPE_ICONS];

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{type.name}</span>
            {type.is_default && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Défaut
              </Badge>
            )}
          </div>
          {type.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{type.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-lg font-semibold px-3 py-1">
          {type.percentage}%
        </Badge>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce type de gestion ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Les propriétaires associés à ce type perdront leur configuration.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
