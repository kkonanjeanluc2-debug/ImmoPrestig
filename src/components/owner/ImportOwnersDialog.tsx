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
import { useCreateOwner, useOwners } from "@/hooks/useOwners";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const downloadTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Propriétaires");
  
  // Add header row
  worksheet.addRow(["Nom", "Email", "Téléphone", "Adresse", "Statut"]);
  
  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });
  
  // Add sample data
  worksheet.addRow([
    "Marie Martin",
    "marie.martin@email.com",
    "+221 77 987 65 43",
    "123 Rue de la Paix, Dakar",
    "actif",
  ]);
  
  // Set column widths
  worksheet.columns = [
    { width: 20 },
    { width: 25 },
    { width: 18 },
    { width: 30 },
    { width: 10 }
  ];
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = "modele_proprietaires.xlsx";
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Modèle téléchargé");
};

interface ParsedOwner {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status: "actif" | "inactif";
  isDuplicate?: boolean;
  duplicateReason?: string;
  isValid: boolean;
  errors: string[];
}

export function ImportOwnersDialog() {
  const [open, setOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedOwner[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: existingOwners } = useOwners();
  const createOwner = useCreateOwner();

  const resetState = () => {
    setParsedData([]);
    setIsProcessing(false);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    
    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("No worksheet found");
      }
      
      const rows: Record<string, any>[] = [];
      const headers: string[] = [];
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell) => {
            headers.push(String(cell.value || "").trim());
          });
        } else {
          const rowData: Record<string, any> = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) {
              rowData[header] = cell.value;
            }
          });
          if (Object.keys(rowData).length > 0) {
            rows.push(rowData);
          }
        }
      });

      const parsed: ParsedOwner[] = rows.map((row) => {
        const errors: string[] = [];
        const name = String(row["Nom"] || row["name"] || row["Name"] || "").trim();
        const email = String(row["Email"] || row["email"] || row["E-mail"] || "").trim().toLowerCase();
        const phone = String(row["Téléphone"] || row["phone"] || row["Phone"] || row["Tel"] || "").trim() || undefined;
        const address = String(row["Adresse"] || row["address"] || row["Address"] || "").trim() || undefined;
        const statusRaw = String(row["Statut"] || row["status"] || row["Status"] || "actif").trim().toLowerCase();
        const status: "actif" | "inactif" = statusRaw === "inactif" ? "inactif" : "actif";

        if (!name) errors.push("Nom requis");
        if (!email) errors.push("Email requis");
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email invalide");

        // Check for duplicates
        let isDuplicate = false;
        let duplicateReason = "";
        
        const existingByEmail = existingOwners?.find(o => o.email.toLowerCase() === email);
        if (existingByEmail) {
          isDuplicate = true;
          duplicateReason = `Email déjà utilisé par ${existingByEmail.name}`;
        }
        
        if (phone) {
          const existingByPhone = existingOwners?.find(o => o.phone === phone);
          if (existingByPhone) {
            isDuplicate = true;
            duplicateReason = `Téléphone déjà utilisé par ${existingByPhone.name}`;
          }
        }

        return {
          name,
          email,
          phone,
          address,
          status,
          isDuplicate,
          duplicateReason,
          isValid: errors.length === 0 && !isDuplicate,
          errors,
        };
      });

      setParsedData(parsed);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Erreur lors de la lecture du fichier");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    const validOwners = parsedData.filter(o => o.isValid);
    if (validOwners.length === 0) {
      toast.error("Aucun propriétaire valide à importer");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const owner of validOwners) {
      try {
        await createOwner.mutateAsync({
          name: owner.name,
          email: owner.email,
          phone: owner.phone || null,
          address: owner.address || null,
          status: owner.status,
        });
        successCount++;
      } catch (error) {
        console.error("Error importing owner:", owner.name, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} propriétaire(s) importé(s) avec succès`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} erreur(s) lors de l'import`);
    }

    setOpen(false);
    resetState();
  };

  const validCount = parsedData.filter(o => o.isValid).length;
  const duplicateCount = parsedData.filter(o => o.isDuplicate).length;
  const invalidCount = parsedData.filter(o => !o.isValid && !o.isDuplicate).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Importer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des propriétaires</DialogTitle>
          <DialogDescription>
            Importez des propriétaires depuis un fichier Excel (.xlsx, .xls) ou CSV.
            Les colonnes attendues : Nom, Email, Téléphone, Adresse, Statut.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadTemplate}
            className="gap-2 w-full"
          >
            <Download className="h-4 w-4" />
            Télécharger le modèle Excel
          </Button>

          {/* File Upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="owner-file-upload"
            />
            <label
              htmlFor="owner-file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              ) : (
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {isProcessing 
                  ? "Analyse du fichier..." 
                  : "Cliquez pour sélectionner un fichier Excel ou CSV"}
              </span>
            </label>
          </div>

          {/* Results */}
          {parsedData.length > 0 && (
            <>
              {/* Summary */}
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

              {/* Preview List */}
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-4 space-y-2">
                  {parsedData.map((owner, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border",
                        owner.isValid 
                          ? "bg-emerald/5 border-emerald/20"
                          : owner.isDuplicate
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-destructive/5 border-destructive/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{owner.name || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{owner.email || "—"}</p>
                          {owner.phone && (
                            <p className="text-xs text-muted-foreground">Tél: {owner.phone}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {owner.isValid && (
                            <Badge variant="outline" className="bg-emerald/10 text-emerald border-emerald/20 text-xs">
                              Valide
                            </Badge>
                          )}
                          {owner.isDuplicate && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
                              Doublon
                            </Badge>
                          )}
                          {owner.errors.length > 0 && !owner.isDuplicate && (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                              Invalide
                            </Badge>
                          )}
                        </div>
                      </div>
                      {(owner.duplicateReason || owner.errors.length > 0) && (
                        <p className="text-xs text-destructive mt-1">
                          {owner.duplicateReason || owner.errors.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetState}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={validCount === 0 || isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    `Importer ${validCount} propriétaire(s)`
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
