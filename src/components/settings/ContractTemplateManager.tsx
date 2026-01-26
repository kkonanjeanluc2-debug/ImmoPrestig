import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
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
import { 
  Plus, 
  FileText, 
  Trash2, 
  Edit, 
  Star,
  Copy,
  Info,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useContractTemplates,
  useCreateContractTemplate,
  useUpdateContractTemplate,
  useDeleteContractTemplate,
  type ContractTemplate,
} from "@/hooks/useContractTemplates";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/generateContract";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AVAILABLE_VARIABLES = [
  { variable: "{bailleur}", description: "Nom du bailleur/agence" },
  { variable: "{bailleur_adresse}", description: "Adresse du bailleur" },
  { variable: "{bailleur_telephone}", description: "Téléphone du bailleur" },
  { variable: "{bailleur_email}", description: "Email du bailleur" },
  { variable: "{locataire}", description: "Nom du locataire" },
  { variable: "{locataire_email}", description: "Email du locataire" },
  { variable: "{locataire_telephone}", description: "Téléphone du locataire" },
  { variable: "{bien}", description: "Titre/nom du bien" },
  { variable: "{bien_adresse}", description: "Adresse du bien" },
  { variable: "{unite}", description: "Numéro de l'unité/porte" },
  { variable: "{loyer}", description: "Montant du loyer (ex: 150 000 FCFA)" },
  { variable: "{loyer_lettres}", description: "Loyer en lettres" },
  { variable: "{caution}", description: "Montant de la caution" },
  { variable: "{caution_lettres}", description: "Caution en lettres" },
  { variable: "{date_debut}", description: "Date de début du contrat" },
  { variable: "{date_fin}", description: "Date de fin du contrat" },
  { variable: "{date_jour}", description: "Date du jour (signature)" },
];

export function ContractTemplateManager() {
  const { toast } = useToast();
  const { data: templates, isLoading } = useContractTemplates();
  const createTemplate = useCreateContractTemplate();
  const updateTemplate = useUpdateContractTemplate();
  const deleteTemplate = useDeleteContractTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    content: "",
    is_default: false,
  });

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormData({
      name: "",
      content: DEFAULT_CONTRACT_TEMPLATE,
      is_default: templates?.length === 0,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      is_default: template.is_default,
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: ContractTemplate) => {
    setSelectedTemplate(null);
    setFormData({
      name: `${template.name} (copie)`,
      content: template.content,
      is_default: false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom et le contenu sont requis.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (selectedTemplate) {
        await updateTemplate.mutateAsync({
          id: selectedTemplate.id,
          ...formData,
        });
        toast({
          title: "Modèle mis à jour",
          description: "Le modèle de contrat a été mis à jour avec succès.",
        });
      } else {
        await createTemplate.mutateAsync(formData);
        toast({
          title: "Modèle créé",
          description: "Le modèle de contrat a été créé avec succès.",
        });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      toast({
        title: "Modèle supprimé",
        description: "Le modèle de contrat a été supprimé.",
      });
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer ce modèle.",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (template: ContractTemplate) => {
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        is_default: true,
      });
      toast({
        title: "Modèle par défaut",
        description: `"${template.name}" est maintenant le modèle par défaut.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de définir ce modèle par défaut.",
        variant: "destructive",
      });
    }
  };

  const insertVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      content: prev.content + variable,
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Modèles de contrats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Modèles de contrats
              </CardTitle>
              <CardDescription>
                Gérez vos modèles de contrats de location. Ces modèles seront utilisés lors de la création de locataires.
              </CardDescription>
            </div>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau modèle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!templates || templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">Aucun modèle de contrat configuré.</p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier modèle
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        {template.is_default && (
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3" />
                            Par défaut
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Modifié le {new Date(template.updated_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!template.is_default && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSetDefault(template)}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Définir par défaut</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(template)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Dupliquer</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setTemplateToDelete(template);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Modifier le modèle" : "Nouveau modèle de contrat"}
            </DialogTitle>
            <DialogDescription>
              Créez un modèle de contrat avec des variables dynamiques qui seront remplacées par les informations du locataire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du modèle</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Contrat standard, Bail meublé..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_default">Modèle par défaut</Label>
                <p className="text-sm text-muted-foreground">
                  Ce modèle sera utilisé automatiquement pour les nouveaux contrats
                </p>
              </div>
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_default: checked }))
                }
              />
            </div>

            <Separator />

            {/* Variables helper */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Variables disponibles</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES.map((v) => (
                  <TooltipProvider key={v.variable}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable(v.variable)}
                          className="font-mono text-xs"
                        >
                          {v.variable}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{v.description}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contenu du contrat</Label>
              <p className="text-sm text-muted-foreground">
                Utilisez # pour les titres principaux, ## pour les sous-titres, ### pour les petits titres
              </p>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                placeholder="Contenu du modèle de contrat..."
                className="min-h-[400px] font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createTemplate.isPending || updateTemplate.isPending}
            >
              {createTemplate.isPending || updateTemplate.isPending
                ? "Enregistrement..."
                : selectedTemplate
                ? "Mettre à jour"
                : "Créer le modèle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le modèle "{templateToDelete?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
