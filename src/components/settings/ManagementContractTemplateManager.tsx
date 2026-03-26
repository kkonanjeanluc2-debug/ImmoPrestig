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
import { 
  Plus, FileText, Trash2, Edit, Star, Copy, Info, Eye 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useManagementContractTemplates,
  useCreateManagementContractTemplate,
  useUpdateManagementContractTemplate,
  useDeleteManagementContractTemplate,
  type ManagementContractTemplate,
} from "@/hooks/useManagementContractTemplates";
import { 
  DEFAULT_MANAGEMENT_CONTRACT_TEMPLATE, 
  MANAGEMENT_CONTRACT_VARIABLES,
  replaceManagementContractVariables 
} from "@/lib/managementContractDefaults";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const SAMPLE_DATA = {
  ownerName: "Kouamé Yao",
  ownerEmail: "kouame@email.com",
  ownerPhone: "+225 07 00 00 00",
  ownerAddress: "Cocody, Abidjan",
  ownerBirthDate: "1975-05-15",
  ownerBirthPlace: "Bouaké",
  ownerProfession: "Entrepreneur",
  ownerCniNumber: "CI00123456",
  agencyName: "Agence Immobilière ABC",
  agencyEmail: "contact@agence-abc.com",
  agencyPhone: "+225 27 00 00 00",
  agencyAddress: "Plateau, Abidjan",
  agencyCity: "Abidjan",
  managementTypeName: "Gestion professionnelle",
  commissionPercentage: 10,
};

function ManagementContractPreview({ content }: { content: string }) {
  const previewContent = useMemo(() => {
    if (!content) return "";
    return replaceManagementContractVariables(content, SAMPLE_DATA);
  }, [content]);

  if (!previewContent) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Commencez à rédiger votre contrat pour voir l'aperçu</p>
      </div>
    );
  }

  const lines = previewContent.split("\n");
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>Cet aperçu utilise des données d'exemple.</span>
      </div>
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="p-6 bg-background prose prose-sm max-w-none">
          {lines.map((line, i) => {
            const t = line.trim();
            if (t.startsWith("# ")) return <h1 key={i} className="text-xl font-bold text-primary mt-6 mb-3">{t.substring(2)}</h1>;
            if (t.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold text-primary mt-5 mb-2">{t.substring(3)}</h2>;
            if (t.startsWith("### ")) return <h3 key={i} className="text-base font-medium mt-4 mb-2">{t.substring(4)}</h3>;
            if (t === "") return <div key={i} className="h-3" />;
            if (t.startsWith("- ")) return <p key={i} className="text-sm leading-relaxed mb-1 pl-4">• {t.substring(2)}</p>;
            if (t.includes("**")) {
              const parts = t.split(/\*\*/);
              return (
                <p key={i} className="text-sm leading-relaxed mb-1">
                  {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                </p>
              );
            }
            return <p key={i} className="text-sm leading-relaxed mb-1">{t}</p>;
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export function ManagementContractTemplateManager() {
  const { toast } = useToast();
  const { data: templates, isLoading } = useManagementContractTemplates();
  const createTemplate = useCreateManagementContractTemplate();
  const updateTemplate = useUpdateManagementContractTemplate();
  const deleteTemplate = useDeleteManagementContractTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ManagementContractTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ManagementContractTemplate | null>(null);
  const [formData, setFormData] = useState({ name: "", content: "", is_default: false });

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormData({ name: "", content: DEFAULT_MANAGEMENT_CONTRACT_TEMPLATE, is_default: templates?.length === 0 });
    setIsDialogOpen(true);
  };

  const handleEdit = (t: ManagementContractTemplate) => {
    setSelectedTemplate(t);
    setFormData({ name: t.name, content: t.content, is_default: t.is_default });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (t: ManagementContractTemplate) => {
    setSelectedTemplate(null);
    setFormData({ name: `${t.name} (copie)`, content: t.content, is_default: false });
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
        toast({ title: "Modèle mis à jour", description: "Le modèle a été mis à jour avec succès." });
      } else {
        await createTemplate.mutateAsync(formData);
        toast({ title: "Modèle créé", description: "Le modèle a été créé avec succès." });
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

  const handleSetDefault = async (t: ManagementContractTemplate) => {
    try {
      await updateTemplate.mutateAsync({ id: t.id, is_default: true });
      toast({ title: "Modèle par défaut", description: `"${t.name}" est maintenant le modèle par défaut.` });
    } catch {
      toast({ title: "Erreur", description: "Impossible de définir ce modèle par défaut.", variant: "destructive" });
    }
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({ ...prev, content: prev.content + variable }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Modèles de contrats de gestion</CardTitle></CardHeader>
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
                Modèles de contrats de gestion
              </CardTitle>
              <CardDescription>
                Gérez vos modèles de contrats de gestion liant le propriétaire et l'agence. Ces modèles seront générés après création d'un propriétaire.
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
              <p className="mb-4">Aucun modèle de contrat de gestion configuré.</p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier modèle
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map(template => (
                <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        {template.is_default && (
                          <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" />Par défaut</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Modifié le {new Date(template.updated_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!template.is_default && (
                      <TooltipProvider><Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleSetDefault(template)}>
                            <Star className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Définir par défaut</TooltipContent>
                      </Tooltip></TooltipProvider>
                    )}
                    <TooltipProvider><Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Dupliquer</TooltipContent>
                    </Tooltip></TooltipProvider>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? "Modifier le modèle" : "Nouveau modèle de contrat de gestion"}</DialogTitle>
            <DialogDescription>
              Créez un modèle de contrat de gestion avec des variables dynamiques pour le propriétaire et l'agence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="mgmt-name">Nom du modèle</Label>
              <Input id="mgmt-name" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Contrat de gestion standard..." />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="mgmt-default">Modèle par défaut</Label>
                <p className="text-sm text-muted-foreground">Ce modèle sera utilisé automatiquement après création d'un propriétaire</p>
              </div>
              <Switch id="mgmt-default" checked={formData.is_default} onCheckedChange={checked => setFormData(prev => ({ ...prev, is_default: checked }))} />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Variables disponibles</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {MANAGEMENT_CONTRACT_VARIABLES.map(v => (
                  <TooltipProvider key={v.variable}><Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => insertVariable(v.variable)} className="font-mono text-xs">
                        {v.variable}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{v.description}</TooltipContent>
                  </Tooltip></TooltipProvider>
                ))}
              </div>
            </div>

            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor" className="gap-2"><Edit className="h-4 w-4" />Éditeur</TabsTrigger>
                <TabsTrigger value="preview" className="gap-2"><Eye className="h-4 w-4" />Aperçu</TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="space-y-2 mt-4">
                <Label htmlFor="mgmt-content">Contenu du contrat</Label>
                <p className="text-sm text-muted-foreground">Utilisez # pour les titres, ## pour les sous-titres</p>
                <Textarea id="mgmt-content" value={formData.content} onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))} placeholder="Contenu du modèle..." className="min-h-[400px] font-mono text-sm" />
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <ManagementContractPreview content={formData.content} />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={createTemplate.isPending || updateTemplate.isPending}>
              {createTemplate.isPending || updateTemplate.isPending ? "Enregistrement..." : selectedTemplate ? "Mettre à jour" : "Créer le modèle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le modèle "{templateToDelete?.name}" ? Cette action est irréversible.
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
