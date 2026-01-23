import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, FileJson, Check, Loader2 } from "lucide-react";
import { type ReceiptTemplate, type ReceiptTemplateInsert, useCreateReceiptTemplate } from "@/hooks/useReceiptTemplates";
import { toast } from "sonner";

interface ReceiptTemplateImportExportProps {
  templates: ReceiptTemplate[];
}

interface ExportedTemplate {
  name: string;
  title: string;
  declaration_text: string;
  footer_text: string;
  signature_text: string;
  show_logo: boolean;
  show_contacts: boolean;
  show_amount_in_words: boolean;
  date_format: string;
  currency_symbol: string;
  watermark_enabled: boolean;
  watermark_type: string;
  watermark_text: string | null;
  watermark_image_url: string | null;
  watermark_opacity: number;
  watermark_angle: number;
  watermark_position: string;
}

interface ExportData {
  version: string;
  exportedAt: string;
  templates: ExportedTemplate[];
}

export function ReceiptTemplateImportExport({ templates }: ReceiptTemplateImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createTemplate = useCreateReceiptTemplate();
  
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importedTemplates, setImportedTemplates] = useState<ExportedTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const mapTemplateToExport = (template: ReceiptTemplate): ExportedTemplate => ({
    name: template.name,
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

  const handleExportAll = () => {
    if (templates.length === 0) {
      toast.error("Aucun modèle à exporter");
      return;
    }

    const exportData: ExportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      templates: templates.map(mapTemplateToExport),
    };

    downloadJson(exportData, `modeles_quittances_${new Date().toISOString().split("T")[0]}.json`);
    toast.success(`${templates.length} modèle(s) exporté(s)`);
  };

  const handleExportSingle = (template: ReceiptTemplate) => {
    const exportData: ExportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      templates: [mapTemplateToExport(template)],
    };

    downloadJson(exportData, `modele_${template.name.replace(/\s+/g, "_")}.json`);
    toast.success(`Modèle "${template.name}" exporté`);
  };

  const downloadJson = (data: ExportData, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;

      if (!data.version || !Array.isArray(data.templates)) {
        throw new Error("Format de fichier invalide");
      }

      if (data.templates.length === 0) {
        toast.error("Le fichier ne contient aucun modèle");
        return;
      }

      const validTemplates = data.templates.filter((t) => t.name && t.title);
      if (validTemplates.length === 0) {
        toast.error("Aucun modèle valide trouvé dans le fichier");
        return;
      }

      setImportedTemplates(validTemplates);
      setSelectedTemplates(new Set(validTemplates.map((_, i) => i)));
      setIsImportDialogOpen(true);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erreur lors de la lecture du fichier JSON");
    }

    event.target.value = "";
  };

  const handleImportConfirm = async () => {
    if (selectedTemplates.size === 0) {
      toast.error("Sélectionnez au moins un modèle à importer");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const index of selectedTemplates) {
      const template = importedTemplates[index];
      
      const existingNames = templates.map((t) => t.name.toLowerCase());
      let newName = template.name;
      let counter = 1;
      while (existingNames.includes(newName.toLowerCase())) {
        newName = `${template.name} (${counter})`;
        counter++;
      }

      const templateInsert: ReceiptTemplateInsert = {
        name: newName,
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
      };

      try {
        await createTemplate.mutateAsync(templateInsert);
        successCount++;
      } catch (error) {
        console.error("Failed to import template:", template.name, error);
        errorCount++;
      }
    }

    setIsImporting(false);
    setIsImportDialogOpen(false);
    setImportedTemplates([]);
    setSelectedTemplates(new Set());

    if (successCount > 0) {
      toast.success(`${successCount} modèle(s) importé(s) avec succès`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} modèle(s) n'ont pas pu être importés`);
    }
  };

  const toggleTemplate = (index: number) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTemplates(newSelected);
  };

  const toggleAll = () => {
    if (selectedTemplates.size === importedTemplates.length) {
      setSelectedTemplates(new Set());
    } else {
      setSelectedTemplates(new Set(importedTemplates.map((_, i) => i)));
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <FileJson className="h-4 w-4 mr-2" />
            Import/Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-background z-50">
          <DropdownMenuItem onClick={handleImportClick}>
            <Upload className="h-4 w-4 mr-2" />
            Importer depuis JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportAll} disabled={templates.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exporter tous les modèles
          </DropdownMenuItem>
          {templates.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {templates.slice(0, 5).map((template) => (
                <DropdownMenuItem key={template.id} onClick={() => handleExportSingle(template)}>
                  <Download className="h-4 w-4 mr-2 opacity-50" />
                  <span className="truncate">{template.name}</span>
                </DropdownMenuItem>
              ))}
              {templates.length > 5 && (
                <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                  +{templates.length - 5} autres modèles...
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importer des modèles</DialogTitle>
            <DialogDescription>
              Sélectionnez les modèles à importer dans votre collection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {importedTemplates.length} modèle(s) trouvé(s)
              </span>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedTemplates.size === importedTemplates.length ? "Tout désélectionner" : "Tout sélectionner"}
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-2">
              <div className="space-y-2">
                {importedTemplates.map((template, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplates.has(index)
                        ? "bg-primary/5 border-primary/30"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleTemplate(index)}
                  >
                    <Checkbox
                      checked={selectedTemplates.has(index)}
                      onCheckedChange={() => toggleTemplate(index)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{template.name}</span>
                        {selectedTemplates.has(index) && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{template.title}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.show_logo && (
                          <Badge variant="outline" className="text-xs">Logo</Badge>
                        )}
                        {template.watermark_enabled && (
                          <Badge variant="outline" className="text-xs">Filigrane</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">{template.currency_symbol}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleImportConfirm}
              disabled={selectedTemplates.size === 0 || isImporting}
            >
              {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importer ({selectedTemplates.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
