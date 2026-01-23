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
import { useCreateTenant, useTenants } from "@/hooks/useTenants";
import { useProperties } from "@/hooks/useProperties";
import { useCreateContract } from "@/hooks/useContracts";
import { useUpdateProperty } from "@/hooks/useProperties";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ParsedTenant {
  name: string;
  email: string;
  phone?: string;
  propertyTitle?: string;
  startDate?: string;
  endDate?: string;
  rentAmount?: number;
  deposit?: number;
  isDuplicate?: boolean;
  duplicateReason?: string;
  propertyId?: string;
  isValid: boolean;
  errors: string[];
}

export function ImportTenantsDialog() {
  const [open, setOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTenant[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: existingTenants } = useTenants();
  const { data: properties } = useProperties();
  const createTenant = useCreateTenant();
  const createContract = useCreateContract();
  const updateProperty = useUpdateProperty();

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

      const parsed: ParsedTenant[] = jsonData.map((row) => {
        const errors: string[] = [];
        const name = String(row["Nom"] || row["name"] || row["Name"] || "").trim();
        const email = String(row["Email"] || row["email"] || row["E-mail"] || "").trim().toLowerCase();
        const phone = String(row["Téléphone"] || row["phone"] || row["Phone"] || row["Tel"] || "").trim() || undefined;
        const propertyTitle = String(row["Bien"] || row["Property"] || row["property"] || "").trim() || undefined;
        const startDate = row["Date début"] || row["Start Date"] || row["start_date"];
        const endDate = row["Date fin"] || row["End Date"] || row["end_date"];
        const rentAmount = Number(row["Loyer"] || row["Rent"] || row["rent_amount"]) || undefined;
        const deposit = Number(row["Dépôt"] || row["Deposit"] || row["deposit"]) || undefined;

        if (!name) errors.push("Nom requis");
        if (!email) errors.push("Email requis");
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email invalide");

        // Check for duplicates
        let isDuplicate = false;
        let duplicateReason = "";
        
        const existingByEmail = existingTenants?.find(t => t.email.toLowerCase() === email);
        if (existingByEmail) {
          isDuplicate = true;
          duplicateReason = `Email déjà utilisé par ${existingByEmail.name}`;
        }
        
        if (phone) {
          const existingByPhone = existingTenants?.find(t => t.phone === phone);
          if (existingByPhone) {
            isDuplicate = true;
            duplicateReason = `Téléphone déjà utilisé par ${existingByPhone.name}`;
          }
        }

        // Match property
        let propertyId: string | undefined;
        if (propertyTitle) {
          const matchedProperty = properties?.find(p => 
            p.title.toLowerCase().includes(propertyTitle.toLowerCase()) ||
            propertyTitle.toLowerCase().includes(p.title.toLowerCase())
          );
          if (matchedProperty) {
            if (matchedProperty.status === "disponible") {
              propertyId = matchedProperty.id;
            } else {
              errors.push(`Bien "${propertyTitle}" non disponible`);
            }
          } else {
            errors.push(`Bien "${propertyTitle}" non trouvé`);
          }
        }

        return {
          name,
          email,
          phone,
          propertyTitle,
          startDate: startDate ? String(startDate) : undefined,
          endDate: endDate ? String(endDate) : undefined,
          rentAmount,
          deposit,
          isDuplicate,
          duplicateReason,
          propertyId,
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
    const validTenants = parsedData.filter(t => t.isValid);
    if (validTenants.length === 0) {
      toast.error("Aucun locataire valide à importer");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const tenant of validTenants) {
      try {
        const createdTenant = await createTenant.mutateAsync({
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone || null,
          property_id: tenant.propertyId || null,
        });

        // Create contract if property and dates are provided
        if (tenant.propertyId && tenant.startDate && tenant.endDate && tenant.rentAmount) {
          await createContract.mutateAsync({
            tenant_id: createdTenant.id,
            property_id: tenant.propertyId,
            start_date: tenant.startDate,
            end_date: tenant.endDate,
            rent_amount: tenant.rentAmount,
            deposit: tenant.deposit || null,
            status: "active",
          });

          // Update property status
          await updateProperty.mutateAsync({
            id: tenant.propertyId,
            status: "occupé",
          });
        }

        successCount++;
      } catch (error) {
        console.error("Error importing tenant:", tenant.name, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} locataire(s) importé(s) avec succès`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} erreur(s) lors de l'import`);
    }

    setOpen(false);
    resetState();
  };

  const validCount = parsedData.filter(t => t.isValid).length;
  const duplicateCount = parsedData.filter(t => t.isDuplicate).length;
  const invalidCount = parsedData.filter(t => !t.isValid && !t.isDuplicate).length;

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
          <DialogTitle>Importer des locataires</DialogTitle>
          <DialogDescription>
            Importez des locataires depuis un fichier Excel (.xlsx, .xls) ou CSV.
            Les colonnes attendues : Nom, Email, Téléphone, Bien, Date début, Date fin, Loyer, Dépôt.
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
              id="tenant-file-upload"
            />
            <label
              htmlFor="tenant-file-upload"
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
                  {parsedData.map((tenant, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border",
                        tenant.isValid 
                          ? "bg-emerald/5 border-emerald/20"
                          : tenant.isDuplicate
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-destructive/5 border-destructive/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{tenant.name || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{tenant.email || "—"}</p>
                          {tenant.propertyTitle && (
                            <p className="text-xs text-muted-foreground">Bien: {tenant.propertyTitle}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {tenant.isValid && (
                            <Badge variant="outline" className="bg-emerald/10 text-emerald border-emerald/20 text-xs">
                              Valide
                            </Badge>
                          )}
                          {tenant.isDuplicate && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
                              Doublon
                            </Badge>
                          )}
                          {tenant.errors.length > 0 && !tenant.isDuplicate && (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                              Invalide
                            </Badge>
                          )}
                        </div>
                      </div>
                      {(tenant.duplicateReason || tenant.errors.length > 0) && (
                        <p className="text-xs text-destructive mt-1">
                          {tenant.duplicateReason || tenant.errors.join(", ")}
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
                    `Importer ${validCount} locataire(s)`
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
