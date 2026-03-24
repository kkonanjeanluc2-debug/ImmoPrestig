import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Trash2, Layers, Grid3X3 } from "lucide-react";
import { toast } from "sonner";
import { useCreateIlot } from "@/hooks/useIlots";
import { useCreateParcelle } from "@/hooks/useParcelles";
import * as XLSX from "xlsx";

interface ImportGeometreDialogProps {
  lotissementId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingIlotNames?: string[];
  existingPlotNumbers?: string[];
}

interface ParsedIlot {
  name: string;
  description?: string;
  totalArea?: number;
  parcelles: ParsedParcelle[];
}

interface ParsedParcelle {
  plotNumber: string;
  area: number;
  price: number;
  ilotName?: string;
}

type ImportStep = "upload" | "preview" | "importing" | "done";

export const ImportGeometreDialog = ({
  lotissementId,
  open,
  onOpenChange,
  existingIlotNames = [],
  existingPlotNumbers = [],
}: ImportGeometreDialogProps) => {
  const [step, setStep] = useState<ImportStep>("upload");
  const [parsedIlots, setParsedIlots] = useState<ParsedIlot[]>([]);
  const [parsedParcelles, setParsedParcelles] = useState<ParsedParcelle[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createIlot = useCreateIlot();
  const createParcelle = useCreateParcelle();

  const reset = () => {
    setStep("upload");
    setParsedIlots([]);
    setParsedParcelles([]);
    setErrors([]);
    setFileName("");
    setImportProgress({ done: 0, total: 0 });
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const parseFile = useCallback(async (file: File) => {
    setErrors([]);
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      const ilotsSheet = workbook.Sheets[workbook.SheetNames.find(s => 
        s.toLowerCase().includes("ilot") || s.toLowerCase().includes("îlot")
      ) || ""];

      const parcellesSheet = workbook.Sheets[workbook.SheetNames.find(s => 
        s.toLowerCase().includes("parcelle") || s.toLowerCase().includes("lot") || s.toLowerCase().includes("plot")
      ) || ""];

      // If no specific sheets found, use first sheet for parcelles
      const mainSheet = parcellesSheet || workbook.Sheets[workbook.SheetNames[0]];

      const newErrors: string[] = [];
      const ilots: ParsedIlot[] = [];
      const parcelles: ParsedParcelle[] = [];

      // Parse ilots sheet if exists
      if (ilotsSheet) {
        const ilotsData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ilotsSheet);
        ilotsData.forEach((row, idx) => {
          const name = findValue(row, ["nom", "name", "ilot", "îlot", "nom_ilot", "nom ilot"]);
          if (!name) {
            newErrors.push(`Îlot ligne ${idx + 2}: nom manquant`);
            return;
          }
          if (existingIlotNames.includes(String(name))) {
            newErrors.push(`Îlot "${name}" existe déjà`);
            return;
          }
          ilots.push({
            name: String(name),
            description: String(findValue(row, ["description", "desc"]) || ""),
            totalArea: parseNumber(findValue(row, ["superficie", "surface", "area", "total_area", "superficie_totale"])),
            parcelles: [],
          });
        });
      }

      // Parse parcelles sheet
      if (mainSheet) {
        const parcellesData = XLSX.utils.sheet_to_json<Record<string, unknown>>(mainSheet);
        parcellesData.forEach((row, idx) => {
          const plotNumber = findValue(row, ["numero", "numéro", "num", "n°", "plot_number", "numero_lot", "lot", "numero_parcelle", "parcelle"]);
          const area = parseNumber(findValue(row, ["superficie", "surface", "area", "m2", "m²"]));
          const price = parseNumber(findValue(row, ["prix", "price", "montant", "cout", "coût"]));
          const ilotName = findValue(row, ["ilot", "îlot", "nom_ilot", "nom ilot", "ilot_name"]);

          if (!plotNumber) {
            newErrors.push(`Parcelle ligne ${idx + 2}: numéro manquant`);
            return;
          }
          if (existingPlotNumbers.includes(String(plotNumber))) {
            newErrors.push(`Parcelle "${plotNumber}" existe déjà`);
            return;
          }
          if (!area || area <= 0) {
            newErrors.push(`Parcelle "${plotNumber}": superficie invalide`);
            return;
          }

          const parcelle: ParsedParcelle = {
            plotNumber: String(plotNumber),
            area,
            price: price || 0,
            ilotName: ilotName ? String(ilotName) : undefined,
          };
          parcelles.push(parcelle);

          // Associate parcelle with ilot if specified
          if (ilotName) {
            const existingIlot = ilots.find(i => i.name.toLowerCase() === String(ilotName).toLowerCase());
            if (existingIlot) {
              existingIlot.parcelles.push(parcelle);
            } else {
              // Auto-create ilot from parcelle data
              const newIlot: ParsedIlot = {
                name: String(ilotName),
                parcelles: [parcelle],
              };
              ilots.push(newIlot);
            }
          }
        });
      }

      if (parcelles.length === 0 && ilots.length === 0) {
        newErrors.push("Aucune donnée exploitable trouvée dans le fichier");
      }

      setErrors(newErrors);
      setParsedIlots(ilots);
      setParsedParcelles(parcelles);
      setStep("preview");
    } catch (err) {
      setErrors(["Erreur de lecture du fichier. Vérifiez le format (CSV, XLS, XLSX)."]);
      setStep("preview");
    }
  }, [existingIlotNames, existingPlotNumbers]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  const handleImport = async () => {
    setStep("importing");
    const ilotIdMap: Record<string, string> = {};
    const totalItems = parsedIlots.filter(i => i.parcelles.length > 0 || !parsedParcelles.some(p => p.ilotName)).length 
      + parsedParcelles.length;
    let done = 0;
    setImportProgress({ done: 0, total: totalItems });

    try {
      // 1. Create ilots first
      for (const ilot of parsedIlots) {
        if (ilot.parcelles.length === 0 && parsedParcelles.some(p => p.ilotName)) continue;
        const result = await createIlot.mutateAsync({
          lotissement_id: lotissementId,
          name: ilot.name,
          description: ilot.description || null,
          total_area: ilot.totalArea || null,
          plots_count: ilot.parcelles.length || null,
        });
        ilotIdMap[ilot.name.toLowerCase()] = result.id;
        done++;
        setImportProgress({ done, total: totalItems });
      }

      // 2. Create parcelles
      for (const parcelle of parsedParcelles) {
        const ilotId = parcelle.ilotName ? ilotIdMap[parcelle.ilotName.toLowerCase()] || null : null;
        await createParcelle.mutateAsync({
          lotissement_id: lotissementId,
          ilot_id: ilotId,
          plot_number: parcelle.plotNumber,
          area: parcelle.area,
          price: parcelle.price,
        });
        done++;
        setImportProgress({ done, total: totalItems });
      }

      setStep("done");
      toast.success(`Import réussi : ${parsedIlots.length} îlot(s) et ${parsedParcelles.length} parcelle(s) créé(s)`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'import";
      toast.error(message);
      setStep("preview");
    }
  };

  const removeParcelle = (index: number) => {
    setParsedParcelles(prev => prev.filter((_, i) => i !== index));
  };

  const removeIlot = (index: number) => {
    const ilotName = parsedIlots[index].name;
    setParsedIlots(prev => prev.filter((_, i) => i !== index));
    setParsedParcelles(prev => prev.map(p => 
      p.ilotName?.toLowerCase() === ilotName.toLowerCase() ? { ...p, ilotName: undefined } : p
    ));
  };

  const validParcelles = parsedParcelles.filter(p => 
    !existingPlotNumbers.includes(p.plotNumber)
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import fichier géomètre
          </DialogTitle>
          <DialogDescription>
            Importez un fichier CSV ou Excel pour créer automatiquement les îlots et parcelles
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium mb-1">Glissez votre fichier ici ou cliquez pour parcourir</p>
            <p className="text-xs text-muted-foreground mb-4">Formats acceptés : CSV, XLS, XLSX</p>
            <div className="bg-muted/50 rounded-lg p-3 text-left text-xs text-muted-foreground space-y-1 max-w-md mx-auto">
              <p className="font-medium text-foreground">Colonnes attendues :</p>
              <p>• <strong>Feuille Îlots</strong> : nom, description, superficie</p>
              <p>• <strong>Feuille Parcelles</strong> : numéro, superficie, prix, îlot (optionnel)</p>
              <p className="mt-2 text-muted-foreground italic">Les noms de colonnes sont détectés automatiquement</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {step === "preview" && (
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-4 pr-4">
              {errors.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                      <AlertCircle className="h-4 w-4" />
                      Avertissements ({errors.length})
                    </div>
                    {errors.map((err, i) => (
                      <p key={i} className="text-xs text-muted-foreground">• {err}</p>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Ilots preview */}
              {parsedIlots.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Îlots à créer ({parsedIlots.length})
                  </h4>
                  <div className="space-y-1">
                    {parsedIlots.map((ilot, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{ilot.name}</Badge>
                          {ilot.totalArea && (
                            <span className="text-xs text-muted-foreground">{ilot.totalArea.toLocaleString("fr-FR")} m²</span>
                          )}
                          <span className="text-xs text-muted-foreground">({ilot.parcelles.length} parcelles)</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeIlot(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parcelles preview */}
              {parsedParcelles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Grid3X3 className="h-4 w-4 text-primary" />
                    Parcelles à créer ({validParcelles.length})
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {parsedParcelles.map((parcelle, i) => {
                      const isDuplicate = existingPlotNumbers.includes(parcelle.plotNumber);
                      return (
                        <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-sm ${isDuplicate ? "bg-destructive/10 line-through" : "bg-muted/50"}`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={isDuplicate ? "destructive" : "outline"} className="text-xs">
                              N° {parcelle.plotNumber}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{parcelle.area.toLocaleString("fr-FR")} m²</span>
                            {parcelle.price > 0 && (
                              <span className="text-xs text-muted-foreground">{parcelle.price.toLocaleString("fr-FR")} F</span>
                            )}
                            {parcelle.ilotName && (
                              <Badge variant="secondary" className="text-xs">Îlot: {parcelle.ilotName}</Badge>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeParcelle(i)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {parsedIlots.length === 0 && parsedParcelles.length === 0 && (
                <div className="text-center py-6">
                  <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune donnée exploitable trouvée</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {step === "importing" && (
          <div className="text-center py-8 space-y-4">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm font-medium">Import en cours...</p>
            <p className="text-xs text-muted-foreground">
              {importProgress.done} / {importProgress.total} éléments
            </p>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all" 
                style={{ width: `${importProgress.total ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
            <p className="text-sm font-medium">Import terminé avec succès !</p>
            <div className="flex gap-4 justify-center text-sm text-muted-foreground">
              <span>{parsedIlots.length} îlot(s)</span>
              <span>{parsedParcelles.length} parcelle(s)</span>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={() => handleClose(false)}>Annuler</Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Changer de fichier</Button>
              <Button 
                onClick={handleImport} 
                disabled={validParcelles.length === 0 && parsedIlots.length === 0}
              >
                Importer ({parsedIlots.length} îlots, {validParcelles.length} parcelles)
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => handleClose(false)}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Helper functions
function findValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    for (const rowKey of Object.keys(row)) {
      if (rowKey.toLowerCase().trim().replace(/[_\s]/g, "") === key.replace(/[_\s]/g, "")) {
        return row[rowKey];
      }
    }
  }
  return undefined;
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  }
  return 0;
}
