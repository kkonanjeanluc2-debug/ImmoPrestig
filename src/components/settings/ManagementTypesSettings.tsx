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
import { Plus, Pencil, Trash2, Percent, Home, Building2, Loader2, Star, FileText, Download } from "lucide-react";
import { useManagementTypes, useCreateManagementType, useUpdateManagementType, useDeleteManagementType, ManagementType, ManagementTypeInput } from "@/hooks/useManagementTypes";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { useAgency } from "@/hooks/useAgency";
import { downloadManagementTypeContractPDF } from "@/lib/generateManagementTypeContractPDF";
import { toast } from "sonner";

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
  contract_template_id: string;
}

const defaultFormData: FormData = {
  name: "",
  description: "",
  percentage: "",
  type: "gestion_locative",
  is_default: false,
  contract_template_id: "",
};

export function ManagementTypesSettings() {
  const { data: managementTypes = [], isLoading } = useManagementTypes();
  const { data: contractTemplates = [] } = useContractTemplates();
  const { data: agency } = useAgency();
  const createMutation = useCreateManagementType();
  const updateMutation = useUpdateManagementType();
  const deleteMutation = useDeleteManagementType();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ManagementType | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleOpenDialog = (type?: ManagementType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        description: type.description || "",
        percentage: type.percentage.toString(),
        type: type.type as "gestion_locative" | "commission_vente",
        is_default: type.is_default,
        contract_template_id: type.contract_template_id || "",
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
      contract_template_id: formData.contract_template_id || null,
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

  const handleDownloadPDF = async (type: ManagementType) => {
    if (!type.contract_template_id) {
      toast.error("Aucun modèle de contrat associé à ce type de gestion");
      return;
    }

    const template = contractTemplates.find(t => t.id === type.contract_template_id);
    if (!template) {
      toast.error("Modèle de contrat introuvable");
      return;
    }

    setDownloadingId(type.id);
    try {
      await downloadManagementTypeContractPDF(
        template.content,
        {
          name: type.name,
          percentage: type.percentage,
          type: type.type,
          description: type.description,
        },
        agency
      );
      toast.success("PDF téléchargé avec succès");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Erreur lors du téléchargement du PDF");
    } finally {
      setDownloadingId(null);
    }
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
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 flex-shrink-0" />
                <span>Types de gestion</span>
              </CardTitle>
              <CardDescription className="mt-1">
                Configurez les types de gestion et leurs pourcentages pour les associer à vos propriétaires
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} size="sm" className="w-fit">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau type
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingType ? "Modifier le type de gestion" : "Nouveau type de gestion"}
                  </DialogTitle>
                  <DialogDescription>
                    Définissez un type de gestion avec son pourcentage associé
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
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
                    <Label htmlFor="contract_template">Modèle de contrat</Label>
                    <Select
                      value={formData.contract_template_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, contract_template_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un modèle (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Aucun modèle</SelectItem>
                        {contractTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {template.name}
                              {template.is_default && (
                                <Badge variant="secondary" className="ml-1 text-xs">Défaut</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Le modèle de contrat sera utilisé pour générer les baux des propriétaires avec ce type de gestion
                    </p>
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
                    contractTemplates={contractTemplates}
                    onEdit={() => handleOpenDialog(type)}
                    onDelete={() => handleDelete(type.id)}
                    onDownloadPDF={() => handleDownloadPDF(type)}
                    isDeleting={deleteMutation.isPending}
                    isDownloading={downloadingId === type.id}
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
                    contractTemplates={contractTemplates}
                    onEdit={() => handleOpenDialog(type)}
                    onDelete={() => handleDelete(type.id)}
                    onDownloadPDF={() => handleDownloadPDF(type)}
                    isDeleting={deleteMutation.isPending}
                    isDownloading={downloadingId === type.id}
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
  contractTemplates: { id: string; name: string; is_default: boolean }[];
  onEdit: () => void;
  onDelete: () => void;
  onDownloadPDF: () => void;
  isDeleting: boolean;
  isDownloading: boolean;
}

function ManagementTypeCard({ type, contractTemplates, onEdit, onDelete, onDownloadPDF, isDeleting, isDownloading }: ManagementTypeCardProps) {
  const Icon = TYPE_ICONS[type.type as keyof typeof TYPE_ICONS];
  const linkedTemplate = contractTemplates.find(t => t.id === type.contract_template_id);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{type.name}</span>
              {type.is_default && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">
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
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
          <Badge variant="outline" className="text-base sm:text-lg font-semibold px-2 sm:px-3 py-1">
            {type.percentage}%
          </Badge>
          <div className="flex items-center gap-1">
            {linkedTemplate && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-primary" 
                onClick={onDownloadPDF}
                disabled={isDownloading}
                title="Télécharger le modèle de contrat"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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
      
      {/* Contract template info */}
      {linkedTemplate && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-13 sm:pl-[52px]">
          <FileText className="h-3.5 w-3.5" />
          <span>Modèle : {linkedTemplate.name}</span>
        </div>
      )}
    </div>
  );
}
