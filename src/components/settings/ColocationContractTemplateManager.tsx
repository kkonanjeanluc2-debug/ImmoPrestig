import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, FileText, Trash2, Edit, Star, Copy, Info, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useColocationContractTemplates,
  useCreateColocationContractTemplate,
  useUpdateColocationContractTemplate,
  useDeleteColocationContractTemplate,
  type ColocationContractTemplate,
} from "@/hooks/useColocationContractTemplates";
import { DEFAULT_COLOCATION_CONTRACT_TEMPLATE, COLOCATION_CONTRACT_VARIABLES } from "@/lib/colocationContractDefaults";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

function ColocationContractPreview({ content }: { content: string }) {
  const previewContent = useMemo(() => {
    if (!content) return "";
    // Simple variable replacement for preview
    let result = content;
    result = result.replace(/{bailleur}/g, "M. Kouamé Jean");
    result = result.replace(/{bailleur_adresse}/g, "Cocody, Abidjan");
    result = result.replace(/{bailleur_telephone}/g, "+225 07 00 00 00");
    result = result.replace(/{bailleur_email}/g, "kouame@email.com");
    result = result.replace(/{agence}/g, "Agence Immobilière ABC");
    result = result.replace(/{agence_adresse}/g, "Plateau, Abidjan");
    result = result.replace(/{agence_telephone}/g, "+225 27 00 00 00");
    result = result.replace(/{agence_email}/g, "contact@agence.com");
    result = result.replace(/{agence_ville}/g, "Abidjan");
    result = result.replace(/{liste_colocataires}/g, "1. Mme Akissi Marie\n2. M. Dehi Paul");
    result = result.replace(/{colocataire_principal}/g, "Mme Akissi Marie");
    result = result.replace(/{bien_titre}/g, "Appartement F4 - Résidence Les Jardins");
    result = result.replace(/{bien_adresse}/g, "Cocody Riviera, Abidjan");
    result = result.replace(/{numero_porte}/g, "B-05");
    result = result.replace(/{date_debut}/g, new Date().toLocaleDateString("fr-FR"));
    result = result.replace(/{date_fin}/g, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"));
    result = result.replace(/{loyer}/g, "200 000");
    result = result.replace(/{loyer_lettres}/g, "deux cent mille");
    result = result.replace(/{caution}/g, "400 000");
    result = result.replace(/{nombre_exemplaires}/g, "4");
    result = result.replace(/{date_jour}/g, new Date().toLocaleDateString("fr-FR"));
    return result;
  }, [content]);

  const renderPreviewContent = () => {
    if (!previewContent) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Commencez à rédiger votre contrat pour voir l'aperçu</p>
        </div>
      );
    }

    const lines = previewContent.split("\n");
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("# ")) {
        return <h1 key={index} className="text-xl font-bold text-primary mt-6 mb-3">{trimmedLine.substring(2)}</h1>;
      } else if (trimmedLine.startsWith("## ")) {
        return <h2 key={index} className="text-lg font-semibold text-primary mt-5 mb-2">{trimmedLine.substring(3)}</h2>;
      } else if (trimmedLine.startsWith("### ")) {
        return <h3 key={index} className="text-base font-medium mt-4 mb-2">{trimmedLine.substring(4)}</h3>;
      } else if (trimmedLine === "") {
        return <div key={index} className="h-3" />;
      } else {
        return <p key={index} className="text-sm leading-relaxed mb-1">{trimmedLine}</p>;
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>Cet aperçu utilise des données d'exemple. Les vraies valeurs seront insérées lors de la génération du contrat.</span>
      </div>
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="p-6 bg-background prose prose-sm max-w-none">
          {renderPreviewContent()}
        </div>
      </ScrollArea>
    </div>
  );
}

export function ColocationContractTemplateManager() {
  const { toast } = useToast();
  const { data: templates, isLoading } = useColocationContractTemplates();
  const createTemplate = useCreateColocationContractTemplate();
  const updateTemplate = useUpdateColocationContractTemplate();
  const deleteTemplate = useDeleteColocationContractTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ColocationContractTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ColocationContractTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    content: "",
    is_default: false,
  });

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormData({
      name: "",
      content: DEFAULT_COLOCATION_CONTRACT_TEMPLATE,
      is_default: templates?.length === 0,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (template: ColocationContractTemplate) => {
    setSelectedTemplate(template);
    setFormData({ name: template.name, content: template.content, is_default: template.is_default });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: ColocationContractTemplate) => {
    setSelectedTemplate(null);
    setFormData({ name: `${template.name} (copie)`, content: template.content, is_default: false });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast({ title: "Erreur", description: "Le nom et le contenu sont requis.", variant: "destructive" });
      return;
    }

    try {
      if (selectedTemplate) {
        await updateTemplate.mutateAsync({ id: selectedTemplate.id, ...formData });
        toast({ title: "Modèle mis à jour", description: "Le modèle de contrat de colocation a été mis à jour." });
      } else {
        await createTemplate.mutateAsync(formData);
        toast({ title: "Modèle créé", description: "Le modèle de contrat de colocation a été créé." });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Erreur", description: "Une erreur est survenue lors de l'enregistrement.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      toast({ title: "Modèle supprimé", description: "Le modèle de contrat de colocation a été supprimé." });
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer ce modèle.", variant: "destructive" });
    }
  };

  const handleSetDefault = async (template: ColocationContractTemplate) => {
    try {
      await updateTemplate.mutateAsync({ id: template.id, is_default: true });
      toast({ title: "Modèle par défaut", description: `"${template.name}" est maintenant le modèle par défaut.` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de définir ce modèle par défaut.", variant: "destructive" });
    }
  };

  const insertVariable = (variable: string) => {
    setFormData((prev) => ({ ...prev, content: prev.content + variable }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Modèles de contrats de colocation</h3>
            <p className="text-sm text-muted-foreground">
              Gérez vos modèles de contrats de colocation avec clause de solidarité.
            </p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau modèle
          </Button>
        </div>

        {!templates || templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-4">Aucun modèle de contrat de colocation configuré.</p>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Créer votre premier modèle
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
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
                          <Button variant="ghost" size="icon" onClick={() => handleSetDefault(template)}>
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
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Dupliquer</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setTemplateToDelete(template); setIsDeleteDialogOpen(true); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? "Modifier le modèle" : "Nouveau modèle de contrat de colocation"}</DialogTitle>
            <DialogDescription>
              Créez un modèle de contrat de colocation avec des variables dynamiques.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="coloc-name">Nom du modèle</Label>
              <Input
                id="coloc-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Contrat colocation standard..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="coloc-is_default">Modèle par défaut</Label>
                <p className="text-sm text-muted-foreground">Ce modèle sera utilisé automatiquement pour les contrats de colocation</p>
              </div>
              <Switch
                id="coloc-is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_default: checked }))}
              />
            </div>

            <Separator />

            {/* Variables helper */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <Label>Variables disponibles</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {COLOCATION_CONTRACT_VARIABLES.map((v) => (
                  <TooltipProvider key={v.variable}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => insertVariable(v.variable)}>
                          {v.variable}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{v.description}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>

            <Tabs defaultValue="editor">
              <TabsList>
                <TabsTrigger value="editor">Éditeur</TabsTrigger>
                <TabsTrigger value="preview">Aperçu</TabsTrigger>
              </TabsList>
              <TabsContent value="editor">
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Rédigez votre contrat de colocation ici..."
                />
              </TabsContent>
              <TabsContent value="preview">
                <ColocationContractPreview content={formData.content} />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={createTemplate.isPending || updateTemplate.isPending}>
              {createTemplate.isPending || updateTemplate.isPending ? "Enregistrement..." : selectedTemplate ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le modèle "{templateToDelete?.name}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
