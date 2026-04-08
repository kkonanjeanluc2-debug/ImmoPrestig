import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { useCreateProperty, useProperties } from "@/hooks/useProperties";
import { useCreatePropertyUnit } from "@/hooks/usePropertyUnits";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const PROPERTY_TYPES: Record<string, string> = {
  "appartement": "appartement",
  "maison à porte multiple": "maison",
  "maison": "maison",
  "villa": "villa",
  "bureau": "bureau",
  "commerce": "commerce",
  "immeuble": "immeuble",
  "location meublée": "meuble",
  "meublé": "meuble",
};

const downloadTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Biens");

  worksheet.addRow([
    "Titre", "Adresse", "Type", "Porte", "Prix (F CFA)",
    "Surface (m²)", "Pièces", "Salles de bain", "Description"
  ]);

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
  });

  // Sample rows
  worksheet.addRow(["Résidence Kouakou", "Angre", "Immeuble", "Porte 1", 750000, "", "", "", ""]);
  worksheet.addRow(["Résidence Kouakou", "Angre", "Immeuble", "Porte 2", 750000, "", "", "", ""]);
  worksheet.addRow(["Villa duplex", "Cocody", "Villa", "", 400000, 200, 4, 4, "Grande villa"]);
  worksheet.addRow(["Cour familiale", "Yopougon", "Maison à porte multiple", "Porte 1", 430000, "", "", "", ""]);
  worksheet.addRow(["Cour familiale", "Yopougon", "Maison à porte multiple", "Porte 2", 430000, "", "", "", ""]);
  worksheet.addRow(["Appart 5", "Cocody", "Appartement", "", 150000, "", 2, 2, ""]);

  worksheet.columns = [
    { width: 25 }, { width: 20 }, { width: 22 }, { width: 12 },
    { width: 14 }, { width: 14 }, { width: 10 }, { width: 14 }, { width: 25 },
  ];

  // Add notes
  const noteSheet = workbook.addWorksheet("Instructions");
  noteSheet.addRow(["Instructions d'importation"]);
  noteSheet.getRow(1).font = { bold: true, size: 14 };
  noteSheet.addRow([""]);
  noteSheet.addRow(["Types de biens acceptés : Appartement, Maison à porte multiple, Villa, Bureau, Commerce, Immeuble, Location meublée"]);
  noteSheet.addRow([""]);
  noteSheet.addRow(["Pour les immeubles et maisons à porte multiple :"]);
  noteSheet.addRow(["- Ajoutez une ligne par porte avec le même titre et la même adresse"]);
  noteSheet.addRow(["- Le système regroupera automatiquement les portes sous le même bien"]);
  noteSheet.addRow([""]);
  noteSheet.addRow(["Pour les autres types (Appartement, Villa, etc.) :"]);
  noteSheet.addRow(["- Laissez la colonne Porte vide"]);
  noteSheet.getColumn(1).width = 80;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "modele_biens.xlsx";
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Modèle téléchargé");
};

interface ParsedProperty {
  title: string;
  address: string;
  propertyType: string;
  propertyTypeRaw: string;
  units: string[];
  price: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  description?: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  isValid: boolean;
  errors: string[];
}

function parseRows(rows: Record<string, any>[], existingProperties: any[]): ParsedProperty[] {
  // Group rows by title+address to merge multi-unit properties
  const grouped = new Map<string, { rows: Record<string, any>[]; units: string[] }>();

  for (const row of rows) {
    const title = String(row["Titre"] || row["title"] || "").trim();
    const address = String(row["Adresse"] || row["address"] || "").trim();
    const unit = String(row["Porte"] || row["unit"] || "").trim();
    const key = `${title.toLowerCase()}|||${address.toLowerCase()}`;

    if (!grouped.has(key)) {
      grouped.set(key, { rows: [row], units: unit ? [unit] : [] });
    } else {
      const g = grouped.get(key)!;
      g.rows.push(row);
      if (unit && !g.units.includes(unit)) g.units.push(unit);
    }
  }

  const results: ParsedProperty[] = [];

  for (const [, group] of grouped) {
    const row = group.rows[0];
    const errors: string[] = [];

    const title = String(row["Titre"] || row["title"] || "").trim();
    const address = String(row["Adresse"] || row["address"] || "").trim();
    const typeRaw = String(row["Type"] || row["type"] || "").trim().toLowerCase();
    const price = Number(row["Prix (F CFA)"] || row["Prix"] || row["price"] || 0);
    const area = Number(row["Surface (m²)"] || row["Surface"] || row["area"] || 0) || undefined;
    const bedrooms = Number(row["Pièces"] || row["bedrooms"] || 0) || undefined;
    const bathrooms = Number(row["Salles de bain"] || row["bathrooms"] || 0) || undefined;
    const description = String(row["Description"] || row["description"] || "").trim() || undefined;

    const propertyType = PROPERTY_TYPES[typeRaw] || "";

    if (!title) errors.push("Titre requis");
    if (!address) errors.push("Adresse requise");
    if (!propertyType) errors.push(`Type "${typeRaw}" non reconnu`);
    if (!price || price <= 0) errors.push("Prix invalide");

    const isMultiUnit = propertyType === "maison" || propertyType === "immeuble";
    if (isMultiUnit && group.units.length === 0) {
      errors.push("Porte requise pour ce type de bien");
    }

    let isDuplicate = false;
    let duplicateReason = "";
    const existing = existingProperties?.find(
      (p) => p.title.toLowerCase() === title.toLowerCase() && p.address.toLowerCase() === address.toLowerCase()
    );
    if (existing) {
      isDuplicate = true;
      duplicateReason = `Bien "${title}" à "${address}" existe déjà`;
    }

    results.push({
      title,
      address,
      propertyType,
      propertyTypeRaw: typeRaw,
      units: group.units,
      price,
      area,
      bedrooms,
      bathrooms,
      description,
      isDuplicate,
      duplicateReason,
      isValid: errors.length === 0 && !isDuplicate,
      errors,
    });
  }

  return results;
}

export function ImportPropertiesDialog() {
  const [open, setOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedProperty[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: existingProperties } = useProperties();
  const createProperty = useCreateProperty();
  const createUnit = useCreatePropertyUnit();

  const resetState = () => {
    setParsedData([]);
    setIsProcessing(false);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error("Aucune feuille trouvée");

      const headers: string[] = [];
      const rows: Record<string, any>[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell) => headers.push(String(cell.value || "").trim()));
        } else {
          const rowData: Record<string, any> = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) rowData[header] = cell.value;
          });
          if (Object.keys(rowData).length > 0) rows.push(rowData);
        }
      });

      setParsedData(parseRows(rows, existingProperties || []));
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Erreur lors de la lecture du fichier");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    const valid = parsedData.filter((p) => p.isValid);
    if (valid.length === 0) {
      toast.error("Aucun bien valide à importer");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const prop of valid) {
      try {
        const isMultiUnit = prop.propertyType === "maison" || prop.propertyType === "immeuble";
        const createdProperty = await createProperty.mutateAsync({
          title: prop.title,
          address: prop.address,
          property_type: prop.propertyType,
          type: "location",
          price: prop.price,
          area: prop.area || null,
          bedrooms: prop.bedrooms || null,
          bathrooms: prop.bathrooms || null,
          description: prop.description || null,
          status: "disponible",
        });

        // Create units for multi-unit properties
        if (isMultiUnit && prop.units.length > 0) {
          for (const unitNumber of prop.units) {
            await createUnit.mutateAsync({
              property_id: createdProperty.id,
              unit_number: unitNumber,
              rooms_count: 0,
              rent_amount: prop.price,
              status: "disponible",
            });
          }
        }

        successCount++;
      } catch (error) {
        console.error("Error importing property:", prop.title, error);
        errorCount++;
      }
    }

    if (successCount > 0) toast.success(`${successCount} bien(s) importé(s) avec succès`);
    if (errorCount > 0) toast.error(`${errorCount} erreur(s) lors de l'import`);

    setOpen(false);
    resetState();
  };

  const validCount = parsedData.filter((p) => p.isValid).length;
  const duplicateCount = parsedData.filter((p) => p.isDuplicate).length;
  const invalidCount = parsedData.filter((p) => !p.isValid && !p.isDuplicate).length;

  const typeLabels: Record<string, string> = {
    maison: "Maison à porte multiple",
    appartement: "Appartement",
    villa: "Villa",
    bureau: "Bureau",
    commerce: "Commerce",
    immeuble: "Immeuble",
    meuble: "Location meublée",
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Importer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des biens</DialogTitle>
          <DialogDescription>
            Importez des biens depuis un fichier Excel (.xlsx). Pour les immeubles et maisons à porte multiple, ajoutez une ligne par porte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 w-full">
            <Download className="h-4 w-4" />
            Télécharger le modèle Excel
          </Button>

          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="property-file-upload"
            />
            <label htmlFor="property-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
              {isProcessing ? (
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              ) : (
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {isProcessing ? "Analyse du fichier..." : "Cliquez pour sélectionner un fichier Excel"}
              </span>
            </label>
          </div>

          {parsedData.length > 0 && (
            <>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald" />
                  <span>{validCount} valide(s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>{duplicateCount} doublon(s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span>{invalidCount} invalide(s)</span>
                </div>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-4 space-y-2">
                  {parsedData.map((prop, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border",
                        prop.isValid
                          ? "bg-emerald/5 border-emerald/20"
                          : prop.isDuplicate
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-destructive/5 border-destructive/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{prop.title || "—"}</p>
                          <p className="text-xs text-muted-foreground">{prop.address || "—"} — {typeLabels[prop.propertyType] || prop.propertyTypeRaw}</p>
                          <p className="text-xs text-muted-foreground">
                            {prop.price.toLocaleString("fr-FR")} F CFA
                            {prop.units.length > 0 && ` — ${prop.units.length} porte(s): ${prop.units.join(", ")}`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {prop.isValid && (
                            <Badge variant="outline" className="bg-emerald/10 text-emerald border-emerald/20 text-xs">Valide</Badge>
                          )}
                          {prop.isDuplicate && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">Doublon</Badge>
                          )}
                          {prop.errors.length > 0 && !prop.isDuplicate && (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Invalide</Badge>
                          )}
                        </div>
                      </div>
                      {(prop.duplicateReason || prop.errors.length > 0) && (
                        <p className="text-xs text-destructive mt-1">
                          {prop.duplicateReason || prop.errors.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetState}>Annuler</Button>
                <Button onClick={handleImport} disabled={validCount === 0 || isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    `Importer ${validCount} bien(s)`
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
