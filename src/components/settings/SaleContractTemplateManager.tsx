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
  Eye,
  Home
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useSaleContractTemplates,
  useCreateSaleContractTemplate,
  useUpdateSaleContractTemplate,
  useDeleteSaleContractTemplate,
  type SaleContractTemplate,
} from "@/hooks/useSaleContractTemplates";
import { 
  DEFAULT_SALE_CONTRACT_TEMPLATE, 
  SALE_CONTRACT_VARIABLES,
  SAMPLE_SALE_CONTRACT_DATA,
  replaceSaleContractVariables 
} from "@/lib/saleContractTemplate";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Composant d'aperçu du contrat de vente
function SaleContractPreview({ content }: { content: string }) {
  const previewContent = useMemo(() => {
    if (!content) return "";
    return replaceSaleContractVariables(content, SAMPLE_SALE_CONTRACT_DATA);
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
        return (
          <h1 key={index} className="text-xl font-bold text-primary mt-6 mb-3">
            {trimmedLine.substring(2)}
          </h1>
        );
      } else if (trimmedLine.startsWith("## ")) {
        return (
          <h2 key={index} className="text-lg font-semibold text-primary mt-5 mb-2">
            {trimmedLine.substring(3)}
          </h2>
        );
      } else if (trimmedLine.startsWith("### ")) {
        return (
          <h3 key={index} className="text-base font-medium mt-4 mb-2">
            {trimmedLine.substring(4)}
          </h3>
        );
      } else if (trimmedLine === "") {
        return <div key={index} className="h-3" />;
      } else if (trimmedLine.startsWith("**") && trimmedLine.endsWith("**")) {
        return (
          <p key={index} className="text-sm font-semibold leading-relaxed mb-1">
            {trimmedLine.slice(2, -2)}
          </p>
        );
      } else {
        return (
          <p key={index} className="text-sm leading-relaxed mb-1">
            {trimmedLine}
          </p>
        );
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>
          Cet aperçu utilise des données d'exemple. Les vraies valeurs seront insérées lors de la génération du contrat.
        </span>
      </div>
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="p-6 bg-background">
          {/* En-tête style document */}
          <div className="border-b pb-4 mb-6">
            <div className="text-center">
              <h1 className="text-lg font-bold text-primary mb-1">
                {SAMPLE_SALE_CONTRACT_DATA.agency?.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                {SAMPLE_SALE_CONTRACT_DATA.agency?.address}, {SAMPLE_SALE_CONTRACT_DATA.agency?.city}
              </p>
              <p className="text-xs text-muted-foreground">
                {SAMPLE_SALE_CONTRACT_DATA.agency?.phone} | {SAMPLE_SALE_CONTRACT_DATA.agency?.email}
              </p>
            </div>
          </div>
          
          {/* Contenu du contrat */}
          <div className="prose prose-sm max-w-none">
            {renderPreviewContent()}
          </div>
          
          {/* Pied de page signatures */}
          <div className="mt-10 pt-6 border-t grid grid-cols-2 gap-8">
            <div className="text-center">
              <p className="text-sm font-medium mb-1">Le Vendeur</p>
              <p className="text-xs text-muted-foreground mb-8">Signature précédée de "Lu et approuvé"</p>
              <div className="border-b border-dashed" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium mb-1">L'Acquéreur</p>
              <p className="text-xs text-muted-foreground mb-8">Signature précédée de "Lu et approuvé"</p>
              <div className="border-b border-dashed" />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export function SaleContractTemplateManager() {
  const { toast } = useToast();
  const { data: templates, isLoading } = useSaleContractTemplates();
  const createTemplate = useCreateSaleContractTemplate();
  const updateTemplate = useUpdateSaleContractTemplate();
  const deleteTemplate = useDeleteSaleContractTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SaleContractTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<SaleContractTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    content: "",
    is_default: false,
  });

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormData({
      name: "",
      content: DEFAULT_SALE_CONTRACT_TEMPLATE,
      is_default: templates?.length === 0,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (template: SaleContractTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      is_default: template.is_default,
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: SaleContractTemplate) => {
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
          description: "Le modèle de contrat de vente a été mis à jour avec succès.",
        });
      } else {
        await createTemplate.mutateAsync(formData);
        toast({
          title: "Modèle créé",
          description: "Le modèle de contrat de vente a été créé avec succès.",
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
        description: "Le modèle de contrat de vente a été supprimé.",
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

  const handleSetDefault = async (template: SaleContractTemplate) => {
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
          <CardTitle>Modèles de contrats de vente</CardTitle>
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
                <Home className="h-5 w-5" />
                Modèles de contrats de vente
              </CardTitle>
              <CardDescription>
                Gérez vos modèles de contrats de vente immobilière. Ces modèles seront utilisés lors de la finalisation des ventes.
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
              <p className="mb-4">Aucun modèle de contrat de vente configuré.</p>
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
              {selectedTemplate ? "Modifier le modèle" : "Nouveau modèle de contrat de vente"}
            </DialogTitle>
            <DialogDescription>
              Créez un modèle de contrat de vente avec des variables dynamiques qui seront remplacées par les informations de l'acquéreur et du bien.
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
                placeholder="Ex: Contrat de vente standard, Vente villa..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_default">Modèle par défaut</Label>
                <p className="text-sm text-muted-foreground">
                  Ce modèle sera utilisé automatiquement pour les nouvelles ventes
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
                <Label>Variables disponibles</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      Cliquez sur une variable pour l'insérer dans votre contrat.
                      Elle sera remplacée par la vraie valeur lors de la génération.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <ScrollArea className="h-32 border rounded-lg p-3">
                <div className="flex flex-wrap gap-2">
                  {SALE_CONTRACT_VARIABLES.map((v) => (
                    <TooltipProvider key={v.variable}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => insertVariable(v.variable)}
                            className="text-xs h-7"
                          >
                            {v.variable}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{v.description}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Editor and Preview Tabs */}
            <Tabs defaultValue="editor" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Éditeur
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Aperçu
                </TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="space-y-2">
                <Label htmlFor="content">Contenu du contrat</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Rédigez votre modèle de contrat ici..."
                  className="min-h-[400px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Utilisez # pour les titres principaux, ## pour les sections et ### pour les sous-sections.
                </p>
              </TabsContent>
              <TabsContent value="preview">
                <SaleContractPreview content={formData.content} />
              </TabsContent>
            </Tabs>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le modèle "{templateToDelete?.name}" sera
              définitivement supprimé.
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
