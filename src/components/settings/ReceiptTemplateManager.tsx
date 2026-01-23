import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  FileText,
  Plus,
  Pencil,
  Trash2,
  Star,
  Copy,
  Loader2,
  Droplets,
  Type,
  ImageIcon,
} from "lucide-react";
import {
  useReceiptTemplates,
  useCreateReceiptTemplate,
  useUpdateReceiptTemplate,
  useDeleteReceiptTemplate,
  useSetDefaultReceiptTemplate,
  type ReceiptTemplate,
  type ReceiptTemplateInsert,
} from "@/hooks/useReceiptTemplates";
import { toast } from "sonner";

const DEFAULT_TEMPLATE_VALUES: ReceiptTemplateInsert = {
  name: "",
  is_default: false,
  title: "QUITTANCE DE LOYER",
  declaration_text: "Je soussigné(e), {bailleur}, propriétaire/gestionnaire du bien désigné ci-dessus, déclare avoir reçu de {locataire} la somme de {montant} au titre du loyer pour la période indiquée, et lui en donne quittance, sous réserve de tous mes droits.",
  footer_text: "Document généré par {agence}",
  signature_text: "Signature du bailleur/gestionnaire",
  show_logo: true,
  show_contacts: true,
  show_amount_in_words: true,
  date_format: "DD/MM/YYYY",
  currency_symbol: "F CFA",
  watermark_enabled: false,
  watermark_type: "text",
  watermark_text: "ORIGINAL",
  watermark_image_url: null,
  watermark_opacity: 15,
  watermark_angle: -45,
  watermark_position: "diagonal",
};

const VARIABLE_HINTS: Record<string, string[]> = {
  declaration_text: ["{bailleur}", "{locataire}", "{montant}", "{periode}", "{bien}"],
  footer_text: ["{agence}", "{telephone}", "{email}", "{adresse}"],
  signature_text: ["{bailleur}"],
};

export function ReceiptTemplateManager() {
  const { data: templates = [], isLoading } = useReceiptTemplates();
  const createTemplate = useCreateReceiptTemplate();
  const updateTemplate = useUpdateReceiptTemplate();
  const deleteTemplate = useDeleteReceiptTemplate();
  const setDefaultTemplate = useSetDefaultReceiptTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReceiptTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ReceiptTemplate | null>(null);
  const [formData, setFormData] = useState<ReceiptTemplateInsert>(DEFAULT_TEMPLATE_VALUES);
  const [activeTab, setActiveTab] = useState("content");

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({ ...DEFAULT_TEMPLATE_VALUES, is_default: templates.length === 0 });
    setActiveTab("content");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (template: ReceiptTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      is_default: template.is_default,
      title: template.title,
      declaration_text: template.declaration_text,
      footer_text: template.footer_text,
      signature_text: template.signature_text,
      show_logo: template.show_logo,
      show_contacts: template.show_contacts,
      show_amount_in_words: template.show_amount_in_words,
      date_format: template.date_format,
      currency_symbol: template.currency_symbol,
      watermark_enabled: template.watermark_enabled,
      watermark_type: template.watermark_type,
      watermark_text: template.watermark_text,
      watermark_image_url: template.watermark_image_url,
      watermark_opacity: template.watermark_opacity,
      watermark_angle: template.watermark_angle,
      watermark_position: template.watermark_position,
    });
    setActiveTab("content");
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: ReceiptTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (copie)`,
      is_default: false,
      title: template.title,
      declaration_text: template.declaration_text,
      footer_text: template.footer_text,
      signature_text: template.signature_text,
      show_logo: template.show_logo,
      show_contacts: template.show_contacts,
      show_amount_in_words: template.show_amount_in_words,
      date_format: template.date_format,
      currency_symbol: template.currency_symbol,
      watermark_enabled: template.watermark_enabled,
      watermark_type: template.watermark_type,
      watermark_text: template.watermark_text,
      watermark_image_url: template.watermark_image_url,
      watermark_opacity: template.watermark_opacity,
      watermark_angle: template.watermark_angle,
      watermark_position: template.watermark_position,
    });
    setActiveTab("content");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Veuillez saisir un nom pour le modèle");
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({ id: editingTemplate.id, ...formData });
      } else {
        await createTemplate.mutateAsync(formData);
      }
      setIsDialogOpen(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleSetDefault = async (template: ReceiptTemplate) => {
    if (template.is_default) return;
    await setDefaultTemplate.mutateAsync(template.id);
  };

  const renderVariableHints = (field: keyof typeof VARIABLE_HINTS) => {
    const hints = VARIABLE_HINTS[field];
    if (!hints || hints.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        <span className="text-xs text-muted-foreground">Variables :</span>
        {hints.map((hint) => (
          <Badge
            key={hint}
            variant="secondary"
            className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
            onClick={() => {
              navigator.clipboard.writeText(hint);
              toast.info(`${hint} copié !`);
            }}
          >
            {hint}
          </Badge>
        ))}
      </div>
    );
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Modèles de quittances</CardTitle>
              <CardDescription>
                Créez et gérez plusieurs modèles personnalisés pour vos quittances
              </CardDescription>
            </div>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau modèle
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Aucun modèle de quittance créé</p>
            <p className="text-sm">Créez votre premier modèle pour personnaliser vos quittances</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="relative group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{template.name}</h3>
                      {template.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Par défaut
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {template.title}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.show_logo && (
                      <Badge variant="outline" className="text-xs">Logo</Badge>
                    )}
                    {template.watermark_enabled && (
                      <Badge variant="outline" className="text-xs">Filigrane</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{template.currency_symbol}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenEdit(template)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(template)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {!template.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(template)}
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setTemplateToDelete(template);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Modifier le modèle" : "Nouveau modèle de quittance"}
            </DialogTitle>
            <DialogDescription>
              Personnalisez les textes et les options d'affichage de votre quittance
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Template name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nom du modèle *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Quittance standard, Quittance commerciale..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label htmlFor="is_default">Définir comme modèle par défaut</Label>
              </div>

              <Separator />

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Contenu</TabsTrigger>
                  <TabsTrigger value="layout">Mise en page</TabsTrigger>
                  <TabsTrigger value="watermark">Filigrane</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre du document</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="QUITTANCE DE LOYER"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="declaration">Texte de déclaration</Label>
                    <Textarea
                      id="declaration"
                      value={formData.declaration_text}
                      onChange={(e) => setFormData({ ...formData, declaration_text: e.target.value })}
                      rows={4}
                    />
                    {renderVariableHints("declaration_text")}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signature">Libellé de signature</Label>
                    <Input
                      id="signature"
                      value={formData.signature_text}
                      onChange={(e) => setFormData({ ...formData, signature_text: e.target.value })}
                    />
                    {renderVariableHints("signature_text")}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="footer">Texte de pied de page</Label>
                    <Input
                      id="footer"
                      value={formData.footer_text}
                      onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                    />
                    {renderVariableHints("footer_text")}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Devise</Label>
                    <Select
                      value={formData.currency_symbol}
                      onValueChange={(value) => setFormData({ ...formData, currency_symbol: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="F CFA">F CFA</SelectItem>
                        <SelectItem value="FCFA">FCFA</SelectItem>
                        <SelectItem value="€">Euro (€)</SelectItem>
                        <SelectItem value="$">Dollar ($)</SelectItem>
                        <SelectItem value="XOF">XOF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="layout" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Label htmlFor="show_logo">Afficher le logo</Label>
                      <Switch
                        id="show_logo"
                        checked={formData.show_logo}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_logo: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Label htmlFor="show_contacts">Afficher les coordonnées</Label>
                      <Switch
                        id="show_contacts"
                        checked={formData.show_contacts}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_contacts: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Label htmlFor="show_amount">Montant en lettres</Label>
                      <Switch
                        id="show_amount"
                        checked={formData.show_amount_in_words}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_amount_in_words: checked })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_format">Format de date</Label>
                    <Select
                      value={formData.date_format}
                      onValueChange={(value) => setFormData({ ...formData, date_format: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (01/01/2024)</SelectItem>
                        <SelectItem value="long">Long (1er janvier 2024)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="watermark" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Droplets className="h-5 w-5 text-primary" />
                      <Label htmlFor="watermark_enabled">Activer le filigrane</Label>
                    </div>
                    <Switch
                      id="watermark_enabled"
                      checked={formData.watermark_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, watermark_enabled: checked })}
                    />
                  </div>

                  {formData.watermark_enabled && (
                    <>
                      <div className="space-y-3">
                        <Label>Type de filigrane</Label>
                        <RadioGroup
                          value={formData.watermark_type}
                          onValueChange={(value) => setFormData({ ...formData, watermark_type: value })}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="text" id="wm-text" />
                            <Label htmlFor="wm-text" className="flex items-center gap-2 cursor-pointer">
                              <Type className="h-4 w-4" />
                              Texte
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="image" id="wm-image" />
                            <Label htmlFor="wm-image" className="flex items-center gap-2 cursor-pointer">
                              <ImageIcon className="h-4 w-4" />
                              Image
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {formData.watermark_type === "text" && (
                        <div className="space-y-2">
                          <Label htmlFor="watermark_text">Texte du filigrane</Label>
                          <Input
                            id="watermark_text"
                            value={formData.watermark_text || ""}
                            onChange={(e) => setFormData({ ...formData, watermark_text: e.target.value })}
                            placeholder="ORIGINAL"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Opacité: {formData.watermark_opacity}%</Label>
                        <Slider
                          value={[formData.watermark_opacity]}
                          onValueChange={(value) => setFormData({ ...formData, watermark_opacity: value[0] })}
                          min={5}
                          max={50}
                          step={5}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Position</Label>
                        <RadioGroup
                          value={formData.watermark_position}
                          onValueChange={(value) => setFormData({ ...formData, watermark_position: value })}
                          className="grid grid-cols-3 gap-2"
                        >
                          <div className="flex items-center space-x-2 p-2 border rounded-lg">
                            <RadioGroupItem value="center" id="pos-center" />
                            <Label htmlFor="pos-center" className="cursor-pointer text-sm">Centre</Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 border rounded-lg">
                            <RadioGroupItem value="diagonal" id="pos-diagonal" />
                            <Label htmlFor="pos-diagonal" className="cursor-pointer text-sm">Diagonal</Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 border rounded-lg">
                            <RadioGroupItem value="bottom-right" id="pos-br" />
                            <Label htmlFor="pos-br" className="cursor-pointer text-sm">Bas droite</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? "Mettre à jour" : "Créer"}
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
              Vous êtes sur le point de supprimer le modèle "{templateToDelete?.name}". 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
