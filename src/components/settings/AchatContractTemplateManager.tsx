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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, FileText, Trash2, Edit, Star, Copy, Info, Eye, ShoppingCart,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useAchatContractTemplates,
  useCreateAchatContractTemplate,
  useUpdateAchatContractTemplate,
  useDeleteAchatContractTemplate,
  type AchatContractTemplate,
} from "@/hooks/useAchatContractTemplates";
import {
  DEFAULT_ACTE_ACHAT_TEMPLATE,
  DEFAULT_COMPROMIS_ACHAT_TEMPLATE,
  ACHAT_CONTRACT_VARIABLES,
  SAMPLE_ACHAT_CONTRACT_DATA,
  replaceAchatContractVariables,
} from "@/lib/achatContractTemplate";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

function AchatContractPreview({ content }: { content: string }) {
  const previewContent = useMemo(() => {
    if (!content) return "";
    return replaceAchatContractVariables(content, SAMPLE_ACHAT_CONTRACT_DATA);
  }, [content]);

  const renderPreviewContent = () => {
    if (!previewContent) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Commencez à rédiger votre document pour voir l'aperçu</p>
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
      } else if (trimmedLine.startsWith("**") && trimmedLine.endsWith("**")) {
        return <p key={index} className="text-sm font-semibold leading-relaxed mb-1">{trimmedLine.slice(2, -2)}</p>;
      } else if (trimmedLine.startsWith("- ")) {
        return <p key={index} className="text-sm leading-relaxed mb-1 pl-4">{trimmedLine}</p>;
      } else {
        return <p key={index} className="text-sm leading-relaxed mb-1">{trimmedLine}</p>;
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>Cet aperçu utilise des données d'exemple. Les vraies valeurs seront insérées lors de la génération.</span>
      </div>
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="p-6 bg-background">
          <div className="border-b pb-4 mb-6">
            <div className="text-center">
              <h1 className="text-lg font-bold text-primary mb-1">Aperçu du document</h1>
            </div>
          </div>
          <div className="prose prose-sm max-w-none">{renderPreviewContent()}</div>
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

export function AchatContractTemplateManager() {
  const { toast } = useToast();
  const { data: templates, isLoading } = useAchatContractTemplates();
  const createTemplate = useCreateAchatContractTemplate();
  const updateTemplate = useUpdateAchatContractTemplate();
  const deleteTemplate = useDeleteAchatContractTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AchatContractTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<AchatContractTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    content: "",
    template_type: "acte" as "acte" | "compromis",
    is_default: false,
  });

  const acteTemplates = templates?.filter(t => t.template_type === "acte") || [];
  const compromisTemplates = templates?.filter(t => t.template_type === "compromis") || [];

  const handleCreateNew = (type: "acte" | "compromis") => {
    setSelectedTemplate(null);
    const existingOfType = templates?.filter(t => t.template_type === type) || [];
    setFormData({
      name: "",
      content: type === "acte" ? DEFAULT_ACTE_ACHAT_TEMPLATE : DEFAULT_COMPROMIS_ACHAT_TEMPLATE,
      template_type: type,
      is_default: existingOfType.length === 0,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (template: AchatContractTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      template_type: template.template_type,
      is_default: template.is_default,
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: AchatContractTemplate) => {
    setSelectedTemplate(null);
    setFormData({
      name: `${template.name} (copie)`,
      content: template.content,
      template_type: template.template_type,
      is_default: false,
    });
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
        toast({ title: "Modèle mis à jour", description: "Le modèle a été mis à jour." });
      } else {
        await createTemplate.mutateAsync(formData);
        toast({ title: "Modèle créé", description: "Le modèle a été créé." });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      toast({ title: "Modèle supprimé", description: "Le modèle a été supprimé." });
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer ce modèle.", variant: "destructive" });
    }
  };

  const handleSetDefault = async (template: AchatContractTemplate) => {
    try {
      await updateTemplate.mutateAsync({ id: template.id, is_default: true, template_type: template.template_type });
      toast({ title: "Modèle par défaut", description: `"${template.name}" est maintenant le modèle par défaut.` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de définir ce modèle par défaut.", variant: "destructive" });
    }
  };

  const insertVariable = (variable: string) => {
    setFormData((prev) => ({ ...prev, content: prev.content + variable }));
  };

  const renderTemplateList = (list: AchatContractTemplate[], type: "acte" | "compromis") => {
    const label = type === "acte" ? "acte d'achat" : "compromis d'achat";
    if (list.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="mb-3">Aucun modèle d'{label} configuré.</p>
          <Button onClick={() => handleCreateNew(type)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Créer un modèle
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {list.map((template) => (
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
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Modèles de documents d'achat</CardTitle></CardHeader>
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
                <ShoppingCart className="h-5 w-5" />
                Modèles de documents d'achat
              </CardTitle>
              <CardDescription>
                Gérez vos modèles d'actes d'achat et de compromis d'achat immobilier.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="acte" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="acte">Actes d'achat</TabsTrigger>
              <TabsTrigger value="compromis">Compromis d'achat</TabsTrigger>
            </TabsList>
            <TabsContent value="acte">
              <div className="flex justify-end mb-4">
                <Button onClick={() => handleCreateNew("acte")} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau modèle
                </Button>
              </div>
              {renderTemplateList(acteTemplates, "acte")}
            </TabsContent>
            <TabsContent value="compromis">
              <div className="flex justify-end mb-4">
                <Button onClick={() => handleCreateNew("compromis")} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau modèle
                </Button>
              </div>
              {renderTemplateList(compromisTemplates, "compromis")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Modifier le modèle" : `Nouveau modèle ${formData.template_type === "acte" ? "d'acte d'achat" : "de compromis d'achat"}`}
            </DialogTitle>
            <DialogDescription>
              Créez un modèle avec des variables dynamiques qui seront remplacées par les informations réelles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du modèle</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={`Ex: ${formData.template_type === "acte" ? "Acte d'achat standard" : "Compromis d'achat standard"}...`}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_default">Modèle par défaut</Label>
                <p className="text-sm text-muted-foreground">Ce modèle sera utilisé automatiquement</p>
              </div>
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_default: checked }))}
              />
            </div>

            <Separator />

            {/* Variables */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Variables disponibles</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent className="max-w-sm">Cliquez sur une variable pour l'insérer.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <ScrollArea className="h-32 border rounded-lg p-3">
                <div className="flex flex-wrap gap-2">
                  {ACHAT_CONTRACT_VARIABLES.map((v) => (
                    <TooltipProvider key={v.variable}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => insertVariable(v.variable)} className="text-xs h-7">
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

            {/* Editor + Preview */}
            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor" className="gap-2"><Edit className="h-4 w-4" />Éditeur</TabsTrigger>
                <TabsTrigger value="preview" className="gap-2"><Eye className="h-4 w-4" />Aperçu</TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="mt-4">
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Rédigez votre document ici..."
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <AchatContractPreview content={formData.content} />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={createTemplate.isPending || updateTemplate.isPending}>
              {selectedTemplate ? "Mettre à jour" : "Créer le modèle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le modèle</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer « {templateToDelete?.name} » ? Cette action est irréversible.
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
