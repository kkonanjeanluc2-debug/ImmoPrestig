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
  Plus, FileText, Trash2, Edit, Star, Copy, Info, Eye, BookmarkCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useReservationFormTemplates, useCreateReservationFormTemplate,
  useUpdateReservationFormTemplate, useDeleteReservationFormTemplate,
  type ReservationFormTemplate,
} from "@/hooks/useReservationFormTemplates";
import {
  DEFAULT_RESERVATION_FORM_TEMPLATE, DEFAULT_RESERVATION_FORM_TEMPLATE_VENTE_IMMO,
  RESERVATION_FORM_VARIABLES_LOTISSEMENT, RESERVATION_FORM_VARIABLES_VENTE_IMMO,
  SAMPLE_RESERVATION_FORM_DATA, replaceReservationFormVariables,
} from "@/lib/reservationFormTemplate";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function ReservationFormPreview({ content }: { content: string }) {
  const previewContent = useMemo(() => {
    if (!content) return "";
    return replaceReservationFormVariables(content, SAMPLE_RESERVATION_FORM_DATA);
  }, [content]);

  const renderPreviewContent = () => {
    if (!previewContent) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Commencez à rédiger votre fiche pour voir l'aperçu</p>
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
      } else {
        const parts = trimmedLine.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={index} className="text-sm leading-relaxed mb-1">
            {parts.map((part, i) =>
              part.startsWith("**") && part.endsWith("**")
                ? <strong key={i}>{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
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
          <div className="prose prose-sm max-w-none">{renderPreviewContent()}</div>
          <div className="mt-10 pt-6 border-t grid grid-cols-2 gap-8">
            <div className="text-center">
              <p className="text-sm font-medium mb-1">Le Vendeur</p>
              <p className="text-xs text-muted-foreground mb-8">Signature et cachet</p>
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

export function ReservationFormTemplateManager() {
  const { toast } = useToast();
  const { data: templates, isLoading } = useReservationFormTemplates();
  const createTemplate = useCreateReservationFormTemplate();
  const updateTemplate = useUpdateReservationFormTemplate();
  const deleteTemplate = useDeleteReservationFormTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReservationFormTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ReservationFormTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    content: "",
    is_default: false,
  });

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormData({
      name: "",
      content: DEFAULT_RESERVATION_FORM_TEMPLATE,
      is_default: templates?.length === 0,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (template: ReservationFormTemplate) => {
    setSelectedTemplate(template);
    setFormData({ name: template.name, content: template.content, is_default: template.is_default });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: ReservationFormTemplate) => {
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
        toast({ title: "Modèle mis à jour", description: "Le modèle de fiche de réservation a été mis à jour." });
      } else {
        await createTemplate.mutateAsync(formData);
        toast({ title: "Modèle créé", description: "Le modèle de fiche de réservation a été créé." });
      }
      setIsDialogOpen(false);
    } catch {
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
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer ce modèle.", variant: "destructive" });
    }
  };

  const handleSetDefault = async (template: ReservationFormTemplate) => {
    try {
      await updateTemplate.mutateAsync({ id: template.id, is_default: true });
      toast({ title: "Modèle par défaut", description: `"${template.name}" est maintenant le modèle par défaut.` });
    } catch {
      toast({ title: "Erreur", description: "Impossible de définir ce modèle par défaut.", variant: "destructive" });
    }
  };

  const insertVariable = (variable: string) => {
    setFormData((prev) => ({ ...prev, content: prev.content + variable }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Modèles de fiches de réservation</CardTitle></CardHeader>
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
                <BookmarkCheck className="h-5 w-5" />
                Modèles de fiches de réservation
              </CardTitle>
              <CardDescription>
                Gérez vos modèles de fiches de réservation pour les parcelles et biens immobiliers.
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
              <p className="mb-4">Aucun modèle de fiche de réservation configuré.</p>
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? "Modifier le modèle" : "Nouveau modèle de fiche de réservation"}</DialogTitle>
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
                placeholder="Ex: Fiche de réservation standard..."
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
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Variables disponibles</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent className="max-w-sm">Cliquez sur une variable pour l'insérer.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Tabs defaultValue="lotissement" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="lotissement" className="text-xs">Lotissement / Parcelles</TabsTrigger>
                  <TabsTrigger value="vente-immo" className="text-xs">Ventes immobilières</TabsTrigger>
                </TabsList>
                <TabsContent value="lotissement" className="mt-2">
                  <ScrollArea className="h-28 border rounded-lg p-3">
                    <div className="flex flex-wrap gap-2">
                      {RESERVATION_FORM_VARIABLES_LOTISSEMENT.map((v) => (
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
                </TabsContent>
                <TabsContent value="vente-immo" className="mt-2">
                  <ScrollArea className="h-28 border rounded-lg p-3">
                    <div className="flex flex-wrap gap-2">
                      {RESERVATION_FORM_VARIABLES_VENTE_IMMO.map((v) => (
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
                </TabsContent>
              </Tabs>
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
                  placeholder="Rédigez votre fiche de réservation ici..."
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <ReservationFormPreview content={formData.content} />
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
