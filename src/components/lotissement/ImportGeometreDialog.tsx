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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Trash2, Layers, Grid3X3, FileType, Info } from "lucide-react";
import { toast } from "sonner";
import { useCreateIlot } from "@/hooks/useIlots";
import { useCreateParcelle } from "@/hooks/useParcelles";
import * as XLSX from "xlsx";
import {
  parseDXF,
  parseShapefile,
  detectFileType,
  type ParsedGeometreIlot,
  type ParsedGeometreParcelle,
  type GeometreFileType,
} from "@/lib/geometreFileParser";

interface ImportGeometreDialogProps {
  lotissementId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingIlotNames?: string[];
  existingPlotNumbers?: string[];
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
  const [parsedIlots, setParsedIlots] = useState<ParsedGeometreIlot[]>([]);
  const [parsedParcelles, setParsedParcelles] = useState<ParsedGeometreParcelle[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<GeometreFileType>("unknown");
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [dbfFile, setDbfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dbfInputRef = useRef<HTMLInputElement>(null);
  const createIlot = useCreateIlot();
  const createParcelle = useCreateParcelle();

  const reset = () => {
    setStep("upload");
    setParsedIlots([]);
    setParsedParcelles([]);
    setErrors([]);
    setWarnings([]);
    setFileName("");
    setFileType("unknown");
    setImportProgress({ done: 0, total: 0 });
    setDbfFile(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  // ─── Excel/CSV parser (existing logic) ──────────────────────────────
  const parseExcelFile = useCallback(async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });

    const ilotsSheet = workbook.Sheets[workbook.SheetNames.find(s =>
      s.toLowerCase().includes("ilot") || s.toLowerCase().includes("îlot")
    ) || ""];

    const parcellesSheet = workbook.Sheets[workbook.SheetNames.find(s =>
      s.toLowerCase().includes("parcelle") || s.toLowerCase().includes("lot") || s.toLowerCase().includes("plot")
    ) || ""];

    const mainSheet = parcellesSheet || workbook.Sheets[workbook.SheetNames[0]];

    const newErrors: string[] = [];
    const ilots: ParsedGeometreIlot[] = [];
    const parcelles: ParsedGeometreParcelle[] = [];

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

        const parcelle: ParsedGeometreParcelle = {
          plotNumber: String(plotNumber),
          area,
          price: price || 0,
          ilotName: ilotName ? String(ilotName) : undefined,
        };
        parcelles.push(parcelle);

        if (ilotName) {
          const existingIlot = ilots.find(i => i.name.toLowerCase() === String(ilotName).toLowerCase());
          if (existingIlot) {
            existingIlot.parcelles.push(parcelle);
          } else {
            ilots.push({ name: String(ilotName), parcelles: [parcelle] });
          }
        }
      });
    }

    if (parcelles.length === 0 && ilots.length === 0) {
      newErrors.push("Aucune donnée exploitable trouvée dans le fichier");
    }

    return { ilots, parcelles, errors: newErrors, warnings: [] as string[] };
  }, [existingIlotNames, existingPlotNumbers]);

  // ─── Main file handler ──────────────────────────────────────────────
  const parseFile = useCallback(async (file: File, additionalDbf?: File | null) => {
    setErrors([]);
    setWarnings([]);
    setFileName(file.name);
    const type = detectFileType(file);
    setFileType(type);

    try {
      let result;

      switch (type) {
        case "dxf":
          result = await parseDXF(file);
          break;
        case "shapefile":
          result = await parseShapefile(file, additionalDbf || undefined);
          break;
        case "dwg":
          setErrors([
            "Le format DWG (binaire AutoCAD) ne peut pas être lu directement dans le navigateur.",
            "Veuillez convertir votre fichier en DXF depuis AutoCAD (Fichier → Enregistrer sous → DXF) puis réimportez."
          ]);
          setStep("preview");
          return;
        case "excel":
          result = await parseExcelFile(file);
          break;
        default:
          setErrors(["Format de fichier non reconnu. Formats acceptés : DXF, SHP, CSV, XLS, XLSX"]);
          setStep("preview");
          return;
      }

      // Filter duplicates
      const filteredParcelles = result.parcelles.filter(
        p => !existingPlotNumbers.includes(p.plotNumber)
      );
      const duplicates = result.parcelles.length - filteredParcelles.length;
      if (duplicates > 0) {
        result.warnings.push(`${duplicates} parcelle(s) ignorée(s) car déjà existante(s)`);
      }

      const filteredIlots = result.ilots.filter(
        i => !existingIlotNames.includes(i.name)
      );
      const dupIlots = result.ilots.length - filteredIlots.length;
      if (dupIlots > 0) {
        result.warnings.push(`${dupIlots} îlot(s) ignoré(s) car déjà existant(s)`);
      }

      setErrors(result.errors);
      setWarnings(result.warnings);
      setParsedIlots(filteredIlots);
      setParsedParcelles(filteredParcelles);
      setStep("preview");
    } catch (err) {
      setErrors(["Erreur de lecture du fichier. Vérifiez le format."]);
      setStep("preview");
    }
  }, [existingIlotNames, existingPlotNumbers, parseExcelFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = detectFileType(file);
      if (type === "shapefile") {
        // For shapefiles, we may need the .dbf file too
        setFileName(file.name);
        setFileType("shapefile");
        // Parse with whatever dbf we have
        parseFile(file, dbfFile);
      } else {
        parseFile(file);
      }
    }
  };

  const handleDbfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDbfFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const mainFile = files.find(f => {
      const name = f.name.toLowerCase();
      return name.endsWith(".dxf") || name.endsWith(".dwg") || name.endsWith(".shp") ||
        name.endsWith(".csv") || name.endsWith(".xls") || name.endsWith(".xlsx");
    });
    const dbf = files.find(f => f.name.toLowerCase().endsWith(".dbf"));

    if (dbf) setDbfFile(dbf);
    if (mainFile) parseFile(mainFile, dbf);
  };

  const handleImport = async () => {
    setStep("importing");
    const ilotIdMap: Record<string, string> = {};
    const totalItems = parsedIlots.length + parsedParcelles.length;
    let done = 0;
    setImportProgress({ done: 0, total: totalItems });

    try {
      for (const ilot of parsedIlots) {
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

  const formatLabel: Record<GeometreFileType, string> = {
    dxf: "DXF (AutoCAD)",
    dwg: "DWG (AutoCAD)",
    shapefile: "Shapefile (SIG)",
    excel: "Excel/CSV",
    unknown: "Inconnu",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import fichier géomètre
          </DialogTitle>
          <DialogDescription>
            Importez un fichier DXF, Shapefile, CSV ou Excel pour créer automatiquement les îlots et parcelles
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm font-medium mb-1">Glissez vos fichiers ici ou cliquez pour parcourir</p>
              <p className="text-xs text-muted-foreground mb-4">
                Formats acceptés : DXF, SHP (+DBF), CSV, XLS, XLSX
              </p>

              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <Badge variant="secondary" className="text-xs">
                  <FileType className="h-3 w-3 mr-1" />
                  DXF
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <FileType className="h-3 w-3 mr-1" />
                  SHP
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <FileType className="h-3 w-3 mr-1" />
                  CSV
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <FileType className="h-3 w-3 mr-1" />
                  XLS/XLSX
                </Badge>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".dxf,.dwg,.shp,.dbf,.csv,.xls,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* DBF file input for shapefiles */}
            <Card className="border-muted">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p><strong>Fichiers Shapefile :</strong> Glissez le .shp et le .dbf ensemble, ou ajoutez le .dbf séparément ci-dessous.</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => dbfInputRef.current?.click()}>
                        Ajouter fichier .dbf
                      </Button>
                      {dbfFile && <span className="text-xs text-emerald-600">✓ {dbfFile.name}</span>}
                    </div>
                    <input
                      ref={dbfInputRef}
                      type="file"
                      accept=".dbf"
                      className="hidden"
                      onChange={handleDbfChange}
                    />
                    <p className="mt-2"><strong>Fichiers DWG :</strong> Convertissez en DXF depuis AutoCAD avant d'importer.</p>
                    <p><strong>Excel/CSV :</strong> Colonnes attendues — numéro, superficie, prix, îlot (optionnel)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "preview" && (
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-4 pr-4">
              {/* File type badge */}
              {fileType !== "unknown" && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <FileType className="h-3 w-3 mr-1" />
                    {formatLabel[fileType]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{fileName}</span>
                </div>
              )}

              {/* Errors */}
              {errors.length > 0 && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                      <AlertCircle className="h-4 w-4" />
                      Erreurs ({errors.length})
                    </div>
                    {errors.map((err, i) => (
                      <p key={i} className="text-xs text-muted-foreground">• {err}</p>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                      <Info className="h-4 w-4" />
                      Informations ({warnings.length})
                    </div>
                    {warnings.map((w, i) => (
                      <p key={i} className="text-xs text-muted-foreground">• {w}</p>
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
                          {ilot.totalArea && ilot.totalArea > 0 && (
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
                    Parcelles à créer ({parsedParcelles.length})
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {parsedParcelles.map((parcelle, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            N° {parcelle.plotNumber}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{parcelle.area.toLocaleString("fr-FR")} m²</span>
                          {parcelle.price > 0 && (
                            <span className="text-xs text-muted-foreground">{parcelle.price.toLocaleString("fr-FR")} F</span>
                          )}
                          {parcelle.ilotName && (
                            <Badge variant="secondary" className="text-xs">Îlot: {parcelle.ilotName}</Badge>
                          )}
                          {parcelle.coordinates && (
                            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                              📍 Géoréférencé
                            </Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeParcelle(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parsedIlots.length === 0 && parsedParcelles.length === 0 && errors.length === 0 && (
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
                disabled={parsedParcelles.length === 0 && parsedIlots.length === 0}
              >
                Importer ({parsedIlots.length} îlots, {parsedParcelles.length} parcelles)
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

// Helper functions for Excel parsing
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
