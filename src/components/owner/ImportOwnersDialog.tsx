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
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useCreateOwner, useOwners } from "@/hooks/useOwners";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      const parsed: ParsedOwner[] = jsonData.map((row) => {
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
