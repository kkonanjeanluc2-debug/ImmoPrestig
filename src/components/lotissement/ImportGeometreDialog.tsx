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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Trash2, Layers, Grid3X3, FileType, Info, Download } from "lucide-react";
import { toast } from "sonner";
import { useCreateIlot } from "@/hooks/useIlots";
import { useCreateParcelle } from "@/hooks/useParcelles";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { supabase } from "@/integrations/supabase/client";
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
  /** Map ilot name (lowercased) -> list of existing plot_numbers in that ilot */
  existingPlotsByIlot?: Record<string, string[]>;
}

type ImportStep = "upload" | "preview" | "importing" | "done";

export const ImportGeometreDialog = ({
  lotissementId,
  open,
  onOpenChange,
  existingIlotNames = [],
  existingPlotNumbers = [],
  existingPlotsByIlot = {},
}: ImportGeometreDialogProps) => {
  const [step, setStep] = useState<ImportStep>("upload");
  const [parsedIlots, setParsedIlots] = useState<ParsedGeometreIlot[]>([]);
  const [parsedParcelles, setParsedParcelles] = useState<ParsedGeometreParcelle[]>([]);
  const [detectedByIlot, setDetectedByIlot] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<GeometreFileType>("unknown");
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [dbfFile, setDbfFile] = useState<File | null>(null);
  const [strictMatching, setStrictMatching] = useState(false);
  const strictMatchingRef = useRef(false);
  strictMatchingRef.current = strictMatching;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dbfInputRef = useRef<HTMLInputElement>(null);
  const createIlot = useCreateIlot();
  const createParcelle = useCreateParcelle();

  // Strict plot-number normalization for reliable matching.
  // Handles: case, accents, surrounding whitespace, internal spaces,
  // common prefixes ("lot", "n°", "no", "#"), separators (-, _, /, ., space),
  // and leading zeros on numeric segments.
  // Examples (all normalized to "a12"):
  //   "A12", "a 12", "A-12", "A_12", "A/12", "Lot A12", "N° A12", "A012"
  // Examples (all normalized to "25"):
  //   "25", "025", " 25 ", "Lot 25", "N°25", "#25", "Lot-025"
  const normalizePlotNumber = useCallback((value: unknown): string => {
    if (value === null || value === undefined) return "";
    let s = String(value).trim().toLowerCase();
    if (!s) return "";
    // Remove diacritics
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Strip common prefixes (repeatedly)
    s = s.replace(/^(?:lot|parcelle|n°|n º|n\s*o|no|num(?:ero)?|#)\s*[:\-_.]?\s*/gi, "");
    // Remove all whitespace and separators
    s = s.replace(/[\s\-_./\\]+/g, "");
    // Strip leading zeros on pure-numeric strings or on leading numeric segment
    if (/^\d+$/.test(s)) {
      s = s.replace(/^0+/, "") || "0";
    } else {
      // Letter(s) + zero-padded number, e.g. "a012" -> "a12"
      s = s.replace(/^([a-z]+)0+(\d)/, "$1$2");
      // Number-then-letters: "012b" -> "12b"
      s = s.replace(/^0+(\d)/, "$1");
    }
    return s;
  }, []);

  // Per-ilot duplicate check using normalized plot numbers.
  const isExistingPlot = useCallback(
    (ilotName: string | undefined, plotNumber: string): boolean => {
      const plot = normalizePlotNumber(plotNumber);
      if (!plot) return false;
      if (ilotName) {
        const key = String(ilotName).trim().toLowerCase();
        const list = existingPlotsByIlot[key];
        return Array.isArray(list) && list.some(p => normalizePlotNumber(p) === plot);
      }
      // No ilot context: don't dedup globally — a same-numbered lot may legitimately
      // exist in another ilot. Let per-ilot DB checks handle final uniqueness.
      return false;
    },
    [existingPlotsByIlot, normalizePlotNumber]
  );

  const reset = () => {
    setStep("upload");
    setParsedIlots([]);
    setParsedParcelles([]);
    setDetectedByIlot({});
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

  const downloadTemplate = () => {
    const htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Modèle Guide Lotissement</title>
<style>
  @page Section1 {
    size: 29.7cm 21cm;
    margin: 2cm 2cm 2cm 2cm;
    mso-page-orientation: landscape;
  }
  div.Section1 { page: Section1; }
  body { font-family: 'Times New Roman', serif; font-size: 11pt; }
  table.main-table { border-collapse: collapse; width: 100%; margin-bottom: 30px; border: 1px solid black; }
  table.main-table td { border: 1px solid black; padding: 8px; text-align: center; vertical-align: middle; }
  .header { font-weight: normal; }
  table.no-border-table { border-collapse: collapse; width: 100%; border: none; }
  table.no-border-table td { border: none !important; padding: 2px; }
</style>
</head>
<body>
<div class="Section1">
  
  <table class="main-table" border="1" cellspacing="0" cellpadding="8">
    <tr style="background-color: #ebebeb;">
      <td colspan="8" style="padding: 15px; border-bottom: 1px solid black; text-align: left;">
        <table class="no-border-table" border="0" cellspacing="0" cellpadding="2" style="margin-bottom: 15px;">
          <tr>
            <td style="text-align: left; width: 33%;">COMMUNE DE DALOA</td>
            <td style="text-align: center; width: 34%;">VILLAGE DE ZEBREGUHE</td>
            <td style="text-align: right; width: 33%;">LOTISSEMENT : COCODY 2</td>
          </tr>
        </table>
        <table class="no-border-table" border="0" cellspacing="0" cellpadding="2">
          <tr>
            <td style="text-align: left; width: 15%;">ILOT : <strong>148</strong></td>
            <td style="text-align: left; width: 15%;">LOT : <strong>1025</strong></td>
            <td style="text-align: left; width: 25%;">SUPERFICIE (m2) : <strong>473</strong></td>
            <td style="text-align: left; width: 25%;">AFFECTATION : </td>
            <td style="text-align: right; width: 20%;">ARRETE N° : </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr class="header">
      <td></td>
      <td>ATTRIBUTAIRES</td>
      <td colspan="2">ATTESTATION</td>
      <td rowspan="2">ADRESSES ET<br>CONTACTS</td>
      <td colspan="3">PIECES</td>
    </tr>
    <tr class="header">
      <td>N°</td>
      <td>NOM ET PRENOMS</td>
      <td>N°</td>
      <td>DATE</td>
      <td>NATURE</td>
      <td>N°</td>
      <td>DATE</td>
    </tr>
    <tr style="font-weight: bold;">
      <td>1</td>
      <td>SERY PATRICE BLE</td>
      <td></td>
      <td></td>
      <td>0544512039<br>0707232506</td>
      <td>CNI</td>
      <td>C0036909461</td>
      <td></td>
    </tr>
    <tr style="height: 30px;">
      <td>2</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>
    <tr style="height: 30px;">
      <td>3</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>
  </table>

</div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modele_guide_lotissement.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    const newWarnings: string[] = [];
    const ilots: ParsedGeometreIlot[] = [];
    const parcelles: ParsedGeometreParcelle[] = [];

    if (ilotsSheet) {
      const {
        records: ilotsData,
        detectedColumns: ilotColumns,
        headerRowIndex: ilotHeaderRowIndex,
      } = getWorksheetRecords(ilotsSheet, ["nom", "name", "ilot", "îlot", "description", "superficie"]);

      if (ilotColumns.length > 0) {
        newWarnings.push(`Feuille îlots — en-têtes détectés${ilotHeaderRowIndex >= 0 ? ` (ligne ${ilotHeaderRowIndex + 1})` : ""} : ${ilotColumns.join(", ")}`);
      }

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
      const {
        records: parcellesData,
        detectedColumns,
        headerRowIndex,
        usedGenericHeaders,
      } = getWorksheetRecords(mainSheet, [
        "numero",
        "numéro",
        "num",
        "n°",
        "lot",
        "parcelle",
        "superficie",
        "surface",
        "prix",
        "ilot",
        "proprietaire",
        "beneficiaire",
      ]);

      if (detectedColumns.length > 0) {
        newWarnings.push(
          `Colonnes détectées${headerRowIndex >= 0 ? ` (ligne ${headerRowIndex + 1})` : ""} : ${detectedColumns.join(", ")}`
        );
      }
      if (usedGenericHeaders) {
        newWarnings.push("Aucune ligne d’en-tête fiable détectée : lecture du fichier en mode colonnes automatiques.");
      }

      const hasAreaColumn = detectedColumns.some((column) =>
        ["superficie", "surface", "area", "m2", "m²", "sup", "contenance"].some((key) => {
          const normalizedColumn = normalizeExcelKey(column);
          const normalizedKey = normalizeExcelKey(key);
          return normalizedColumn === normalizedKey || normalizedColumn.includes(normalizedKey) || normalizedKey.includes(normalizedColumn);
        })
      );

      if (!hasAreaColumn) {
        newWarnings.push("Aucune colonne de superficie détectée : les parcelles seront importées avec une superficie à 0.");
      }

      // Detect if Excel data contains guide-format blocks (cells with ILOT/LOT labels).
      // Tolerant of dotted fillers like "ILOT :....06...." and other punctuation.
      const HAS_ILOT_RE = new RegExp(`\\bILOTS?${LABEL_SEP}\\d`);
      const HAS_LOT_RE = new RegExp(`\\bLOTS?${LABEL_SEP}\\d`);
      const isGuideExcel = parcellesData.some((row) => {
        const cellMatch = Object.values(row).some((val) => {
          const text = normalizeForMatch(String(val || ""));
          return HAS_ILOT_RE.test(text) || HAS_LOT_RE.test(text);
        });
        if (cellMatch) return true;
        const rowText = normalizeForMatch(Object.values(row).map(v => String(v || "")).join(" "));
        return HAS_ILOT_RE.test(rowText) && HAS_LOT_RE.test(rowText);
      });

      if (isGuideExcel) {
        newWarnings.push("Format guide détecté dans le fichier Excel — extraction structurée des valeurs");
        // Per-cell extractors: each column maps to its own field via its label.
        const ILOT_RE = new RegExp(`\\bILOTS?${LABEL_SEP}(\\d+)`);
        const LOT_RE = new RegExp(`\\bLOTS?${LABEL_SEP}(\\d+)`);
        const SUPERFICIE_RE = new RegExp(`(?:SUPERFICIE|SURFACE|CONTENANCE)\\s*\\(?M2?\\)?${LABEL_SEP}(\\d+[\\.,]?\\d*)`);
        const PARCELLE_RE = new RegExp(`\\bPARCELLES?${LABEL_SEP}(\\d+[\\.,]?\\d*)`);
        const AFFECT_RE = new RegExp(`(?:AFFECTATION|AFFECT)${LABEL_SEP}(.+)$`);
        const EQUIP_RE = new RegExp(`(?:EQUIPEMENTS?|EQUIPT)${LABEL_SEP}(.+)$`);
        const ATTRIB_RE = new RegExp(`(?:ATTRIBUTAIRES?|NOMS?\\s*ET\\s*PRENOMS?|NOMS?\\s*&\\s*PRENOMS?|NOM\\s*PRENOM)${LABEL_SEP}(.+)$`);
        const ATTEST_RE = new RegExp(`ATTESTATIONS?${LABEL_SEP}(.+)$`);
        const CONTACT_RE = new RegExp(`(?:CONTACTS?|TELS?|TELEPHONES?)${LABEL_SEP}(.+)$`);
        const PIECE_RE = new RegExp(`(?:PIECES?|CNIS?|PIECE\\s*D.?IDENTITE)${LABEL_SEP}(.+)$`);

        // Strip trailing dot/dash filler & spaces from a captured value.
        const cleanValue = (s: string) => s
          .replace(/[\s.\-\u2013\u2014\u00B7\u2026]+$/g, "")
          .replace(/^[\s.\-\u2013\u2014\u00B7\u2026]+/g, "")
          .trim();

        let lastIlotName: string | undefined;
        const seenInImport = new Set<string>();
        const isStrict = strictMatchingRef.current;

        for (const row of parcellesData) {
          // Build (raw, normalized) pairs for each cell to preserve original case
          // for free-text fields (names, contacts) while still matching labels.
          const cellPairs = Object.values(row)
            .map((v) => {
              const raw = String(v ?? "").trim();
              return { raw, norm: normalizeForMatch(raw) };
            })
            .filter((p) => p.raw.length > 0);

          if (cellPairs.length === 0) continue;

          const concatNorm = cellPairs.map((p) => p.norm).join(" | ");
          if (isStrict) {
            // Strict: require BOTH ILOT and LOT labels explicitly on the row.
            if (!HAS_ILOT_RE.test(concatNorm) || !HAS_LOT_RE.test(concatNorm)) continue;
          } else {
            // Permissive: accept rows that have either an ILOT or a LOT label.
            // Subsequent rows missing the ILOT inherit `lastIlotName`.
            if (!HAS_ILOT_RE.test(concatNorm) && !HAS_LOT_RE.test(concatNorm)) continue;
          }

          let ilotName: string | undefined;
          let plotNumber: string | undefined;
          let area = 0;
          let affectation: string | undefined;
          let beneficiaireName: string | undefined;
          let attestationNumber: string | undefined;
          let contact: string | undefined;
          let cniNumber: string | undefined;

          // Track which cells are already consumed by a labelled match,
          // so that unlabeled "free" cells can be assigned to the name field.
          const consumed = new Set<number>();

          cellPairs.forEach((pair, idx) => {
            const { norm, raw } = pair;
            // Extract value either after label (if present) or take whole cell.
            const tryLabel = (re: RegExp): string | null => {
              const m = norm.match(re);
              if (!m) return null;
              consumed.add(idx);
              // Use the raw cell, strip the label prefix length-equivalent.
              // Recompute on raw text using a case-insensitive variant.
              const rawMatch = raw.match(new RegExp(re.source, "i"));
              const captured = rawMatch ? rawMatch[1] : m[1];
              return cleanValue(captured);
            };

            // ILOT
            if (!ilotName) {
              const m = norm.match(ILOT_RE);
              if (m) { ilotName = m[1]; consumed.add(idx); return; }
            }
            // LOT (must avoid matching inside ILOT — \b handles it)
            if (!plotNumber) {
              const m = norm.match(LOT_RE);
              if (m && !/\bILOTS?/.test(norm.slice(0, m.index ?? 0).slice(-2))) {
                plotNumber = m[1]; consumed.add(idx); return;
              }
            }
            // SUPERFICIE / PARCELLE (area)
            if (!area) {
              const sm = norm.match(SUPERFICIE_RE) || norm.match(PARCELLE_RE);
              if (sm) {
                area = parseNumber(sm[1].replace(",", "."));
                consumed.add(idx);
                return;
              }
            }
            // AFFECTATION / EQUIPEMENT
            if (!affectation) {
              const v = tryLabel(AFFECT_RE) || tryLabel(EQUIP_RE);
              if (v) { affectation = v; return; }
            }
            // ATTRIBUTAIRE
            if (!beneficiaireName) {
              const v = tryLabel(ATTRIB_RE);
              if (v) { beneficiaireName = v; return; }
            }
            // ATTESTATION
            if (!attestationNumber) {
              const v = tryLabel(ATTEST_RE);
              if (v) { attestationNumber = v; return; }
            }
            // CONTACT
            if (!contact) {
              const v = tryLabel(CONTACT_RE);
              if (v) { contact = v; return; }
            }
            // PIECE / CNI
            if (!cniNumber) {
              const v = tryLabel(PIECE_RE);
              if (v) { cniNumber = v; return; }
            }
          });

          // Inherit ilot from previous row if this row only carries LOT info
          // (disabled in strict mode)
          if (!isStrict) {
            if (!ilotName && lastIlotName) {
              ilotName = lastIlotName;
            } else if (ilotName) {
              lastIlotName = ilotName;
            }
          }

          // For the simplified template (no header, columns in fixed order),
          // free unlabeled cells fill the remaining fields positionally.
          // Skip positional fallback in strict mode — only labelled values count.
          if (!isStrict) {
            const freeCells = cellPairs
              .map((p, i) => ({ ...p, i }))
              .filter((p) => !consumed.has(p.i));

            const takeNextFree = (predicate?: (raw: string) => boolean): string | undefined => {
              const found = freeCells.find((c) => (!predicate || predicate(c.raw)));
              if (!found) return undefined;
              consumed.add(found.i);
              const idx = freeCells.indexOf(found);
              if (idx >= 0) freeCells.splice(idx, 1);
              return found.raw;
            };

            if (!beneficiaireName) {
              beneficiaireName = takeNextFree((r) =>
                /[A-Za-zÀ-ÿ]{3,}/.test(r) && !/^\d+[\.,]?\d*$/.test(r)
              );
            }
            if (!attestationNumber) attestationNumber = takeNextFree();
            if (!contact) contact = takeNextFree((r) => /\d/.test(r));
            if (!cniNumber) cniNumber = takeNextFree();
          }

          if (!plotNumber) continue;
          if (!isValidPlotNumberCandidate(plotNumber)) continue;
          if (isExistingPlot(ilotName, String(plotNumber))) continue;

          // Avoid pushing the same (ilot, plot) twice from the same file
          const dedupKey = `${(ilotName || "").toLowerCase()}#${normalizePlotNumber(plotNumber)}`;
          if (seenInImport.has(dedupKey)) continue;
          seenInImport.add(dedupKey);

          const parcelle: ParsedGeometreParcelle = {
            plotNumber: String(plotNumber),
            area,
            price: 0,
            ilotName: ilotName ? String(ilotName) : undefined,
            beneficiaire: beneficiaireName || undefined,
            contact: contact || undefined,
            cniNumber: cniNumber || undefined,
            attestationNumber: attestationNumber || undefined,
            affectation: affectation || undefined,
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
        }
      } else {
      parcellesData.forEach((row, idx) => {
        if (shouldSkipExcelRow(row)) {
          return;
        }

        // Try specific lot/parcelle columns first, before falling back to generic "n°" which may match "N° D'ORDRE"
        let plotNumber = findValue(row, ["lots", "lot", "numero_lot", "numerolot", "nlot", "nolot", "parcelle", "numero_parcelle", "plot_number"]);
        if (!plotNumber) {
          plotNumber = findValue(row, ["numero", "numéro", "num", "n°", "no", "ref", "reference", "référence", "id", "label", "name", "nom", "designation", "désignation"]);
        }
        const areaValue = findValue(row, ["superficie", "surface", "area", "m2", "m²", "sup", "contenance"]);
        const area = parseNumber(areaValue);
        const price = parseNumber(findValue(row, ["prix", "price", "montant", "cout", "coût", "valeur", "pu", "prixunitaire"]));
        const ilotName = findValue(row, ["ilot", "îlot", "ilots", "nom_ilot", "nom ilot", "ilot_name", "block", "zone", "secteur", "section"]);
        const proprietaireTerrien = findValue(row, ["proprietaire terrien", "proprietaireterrien", "proprietaire", "propriétaire", "owner"]);
        const beneficiaire = findValue(row, ["beneficiaires", "beneficiaire", "bénéficiaire", "bénéficiaires", "membre", "collaborateur"]);

        // Fallback: use the first non-empty cell value as plot number (skipped in strict mode)
        if (!plotNumber && !strictMatchingRef.current) {
          const firstNonEmptyValue = Object.values(row).find(
            (val) => val !== null && val !== undefined && String(val).trim() !== ""
          );
          if (firstNonEmptyValue !== undefined) {
            plotNumber = firstNonEmptyValue;
          }
        }
        // Strict: require an explicit ilot column value
        if (strictMatchingRef.current && !ilotName) {
          return;
        }

        if (!plotNumber) {
          newErrors.push(`Parcelle ligne ${idx + 2}: numéro manquant`);
          return;
        }
        if (!isValidPlotNumberCandidate(plotNumber)) {
          newWarnings.push(`Ligne ${idx + 2} ignorée : valeur "${String(plotNumber).slice(0, 40)}…" non reconnue comme numéro de lot`);
          return;
        }
        if (isExistingPlot(ilotName ? String(ilotName) : undefined, String(plotNumber))) {
          newErrors.push(
            ilotName
              ? `Parcelle "${plotNumber}" existe déjà dans l'îlot "${ilotName}"`
              : `Parcelle "${plotNumber}" existe déjà`
          );
          return;
        }
        if (isFilledCell(areaValue) && area <= 0) {
          newErrors.push(`Parcelle "${plotNumber}": superficie invalide`);
          return;
        }

        const parcelle: ParsedGeometreParcelle = {
          plotNumber: String(plotNumber),
          area,
          price: price || 0,
          ilotName: ilotName ? String(ilotName) : undefined,
          proprietaireTerrien: isFilledCell(proprietaireTerrien) ? String(proprietaireTerrien) : undefined,
          beneficiaire: isFilledCell(beneficiaire) ? String(beneficiaire) : undefined,
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
    }

    if (parcelles.length === 0 && ilots.length === 0) {
      newErrors.push("Aucune donnée exploitable trouvée dans le fichier");
    }

    return { ilots, parcelles, errors: newErrors, warnings: newWarnings };
  }, [existingIlotNames, isExistingPlot]);

  // ─── Word/DOCX parser ─────────────────────────────────────────────
  const parseWordFile = useCallback(async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    const newErrors: string[] = [];
    const newWarnings: string[] = [];
    const ilots: ParsedGeometreIlot[] = [];
    const parcelles: ParsedGeometreParcelle[] = [];

    // Parse HTML tables using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const tables = doc.querySelectorAll("table");

    if (tables.length === 0) {
      newErrors.push("Aucun tableau trouvé dans le document Word");
      return { ilots, parcelles, errors: newErrors, warnings: newWarnings };
    }

    newWarnings.push(`${tables.length} tableau(x) détecté(s) dans le document`);

    // Walk body children in order so orphan paragraphs carrying
    // "ILOT : xx LOT : yy" (outside any table) propagate to the next data table.
    const HAS_ILOT_RE_W = new RegExp(`\\bILOTS?${LABEL_SEP}\\d`);
    const HAS_LOT_RE_W = new RegExp(`\\bLOTS?${LABEL_SEP}\\d`);
    const ILOT_VAL_RE = new RegExp(`\\bILOTS?${LABEL_SEP}(\\d+)`);
    const LOT_VAL_RE = new RegExp(`\\bLOTS?${LABEL_SEP}(\\d+)`);
    const SUPERFICIE_RE = new RegExp(`(?:SUPERFICIE|SURFACE|CONTENANCE)\\s*\\(?M2?\\)?${LABEL_SEP}(\\d+[\\.,]?\\d*)`);
    const PARCELLE_AREA_RE = new RegExp(`\\bPARCELLES?${LABEL_SEP}(\\d+[\\.,]?\\d*)`);
    const AFFECTATION_RE = new RegExp(`(?:AFFECTATION|AFFECT)${LABEL_SEP}([^\\n]*?)(?:\\s{2,}|ARRETE|$)`);
    const EQUIPEMENT_RE = new RegExp(`(?:EQUIPEMENTS?|EQUIPT)${LABEL_SEP}([^\\n]*?)(?:\\s{2,}|$)`);

    type PendingHeader = {
      ilotName?: string;
      plotNumber?: string;
      area: number;
      affectation?: string;
    };

    const extractHeaderFromText = (raw: string): PendingHeader | null => {
      const text = normalizeForMatch(raw);
      if (!HAS_ILOT_RE_W.test(text) && !HAS_LOT_RE_W.test(text)) return null;
      const ilotMatch = text.match(ILOT_VAL_RE);
      const lotMatch = text.match(LOT_VAL_RE);
      const superficieMatch = text.match(SUPERFICIE_RE);
      const parcelleAreaMatch = !superficieMatch ? text.match(PARCELLE_AREA_RE) : null;
      const affectationMatch = text.match(AFFECTATION_RE);
      const equipementMatch = !affectationMatch ? text.match(EQUIPEMENT_RE) : null;
      const affectationRaw = affectationMatch
        ? affectationMatch[1].trim()
        : (equipementMatch ? equipementMatch[1].trim() : undefined);
      const affectation = (affectationRaw && affectationRaw.length > 0 && !/^ARRETE/i.test(affectationRaw))
        ? affectationRaw
        : undefined;
      return {
        ilotName: ilotMatch ? ilotMatch[1].trim() : undefined,
        plotNumber: lotMatch ? lotMatch[1].trim() : undefined,
        area: superficieMatch
          ? parseNumber(superficieMatch[1].replace(",", "."))
          : (parcelleAreaMatch ? parseNumber(parcelleAreaMatch[1].replace(",", ".")) : 0),
        affectation,
      };
    };

    let pendingHeader: PendingHeader | null = null;
    const bodyNodes = doc.body ? Array.from(doc.body.querySelectorAll("*")) : [];
    // We only want top-level flow: paragraphs/headings + tables. Use direct walk.
    const flowNodes: Element[] = [];
    const visited = new WeakSet<Element>();
    const collect = (root: Element) => {
      for (const child of Array.from(root.children)) {
        const tag = child.tagName.toLowerCase();
        if (tag === "table") {
          if (!visited.has(child)) { flowNodes.push(child); visited.add(child); }
        } else if (/^(p|h[1-6]|div|section|article)$/.test(tag)) {
          // Look inside containers but capture paragraph-level text directly
          if (child.querySelector("table")) {
            collect(child);
          } else {
            flowNodes.push(child);
          }
        } else {
          collect(child);
        }
      }
    };
    if (doc.body) collect(doc.body);
    void bodyNodes; // keep for reference

    for (const node of flowNodes) {
      if (node.tagName.toLowerCase() !== "table") {
        // Paragraph-like: try to extract a header
        const header = extractHeaderFromText(node.textContent || "");
        if (header && (header.ilotName || header.plotNumber)) {
          pendingHeader = header;
        }
        continue;
      }

      const table = node as HTMLTableElement;
      const rows = table.querySelectorAll("tr");
      if (rows.length < 2) continue;

      const tableRecords = getWordTableRecords(table, [
        "numero", "numéro", "num", "n°", "lot", "lots", "parcelle",
        "superficie", "surface", "prix", "ilot", "îlot", "ilots",
        "proprietaire", "beneficiaire", "adresse", "contacts",
      ]);
      const headers = tableRecords.detectedColumns;
      if (headers.length > 0) {
        newWarnings.push(`Colonnes détectées${tableRecords.headerRowIndex >= 0 ? ` (ligne ${tableRecords.headerRowIndex + 1})` : ""} : ${headers.filter(Boolean).join(", ")}`);
      }

      const hasExplicitLotColumn = headers.some((header) => {
        const key = normalizeExcelKey(header);
        return ["lot", "lots", "parcelle", "parcelles", "numerolot", "nlot", "nolot", "numeroparcelle"].some((candidate) =>
          isCompatiblePartialHeaderMatch(key, candidate) && !key.startsWith("ilot")
        );
      });

      if (hasExplicitLotColumn) {
        let standardImportedCount = 0;
        const seenStandardRows = new Set<string>();

        for (const [recordIndex, record] of tableRecords.records.entries()) {
          if (shouldSkipExcelRow(record)) continue;

          const plotNumber = findValue(record, ["lots", "lot", "numero_lot", "numerolot", "nlot", "nolot", "parcelle", "numero_parcelle", "plot_number"]);
          const areaValue = findValue(record, ["superficie", "surface", "area", "m2", "m²", "sup", "contenance"]);
          const area = parseNumber(areaValue);
          const price = parseNumber(findValue(record, ["prix", "price", "montant", "cout", "coût", "valeur", "pu", "prixunitaire"]));
          const ilotName = findValue(record, ["ilot", "îlot", "ilots", "nom_ilot", "nom ilot", "ilot_name", "block", "zone", "secteur", "section"]);
          const proprietaireTerrien = findValue(record, ["proprietaire terrien", "proprietaireterrien", "proprietaire", "propriétaire", "owner"]);
          const beneficiaire = findValue(record, ["beneficiaires", "beneficiaire", "bénéficiaire", "bénéficiaires", "membre", "collaborateur"]);

          if (!plotNumber) continue;
          if (strictMatchingRef.current && !ilotName) continue;
          if (!isValidPlotNumberCandidate(plotNumber)) continue;
          if (isExistingPlot(ilotName ? String(ilotName) : undefined, String(plotNumber))) continue;

          const dedupKey = `${ilotName ? normalizeForMatch(String(ilotName)) : ""}#${normalizePlotNumber(plotNumber)}`;
          if (seenStandardRows.has(dedupKey)) continue;
          seenStandardRows.add(dedupKey);

          const parcelle: ParsedGeometreParcelle = {
            plotNumber: String(plotNumber),
            area,
            price: price || 0,
            ilotName: ilotName ? String(ilotName) : undefined,
            proprietaireTerrien: isFilledCell(proprietaireTerrien) ? String(proprietaireTerrien) : undefined,
            beneficiaire: isFilledCell(beneficiaire) ? String(beneficiaire) : undefined,
          };
          parcelles.push(parcelle);
          standardImportedCount++;

          if (ilotName) {
            const existingIlot = ilots.find((il) => il.name.toLowerCase() === String(ilotName).toLowerCase());
            if (existingIlot) existingIlot.parcelles.push(parcelle);
            else ilots.push({ name: String(ilotName), parcelles: [parcelle] });
          }
        }

        if (standardImportedCount > 0) {
          newWarnings.push(`${standardImportedCount} lot(s) extrait(s) du tableau Word structuré`);
          pendingHeader = null;
          continue;
        }
      }

      // Try to read header info embedded in the first rows of the table itself.
      let rawBlockText = "";
      for (let ri = 0; ri < Math.min(rows.length, 5); ri++) {
        const cells = Array.from(rows[ri].querySelectorAll("td, th"));
        rawBlockText += " " + cells.map(c => c.textContent || "").join(" ");
      }
      let header = extractHeaderFromText(rawBlockText);
      const tableHasOwnHeader = !!(header && (header.ilotName || header.plotNumber));

      // If the table has no embedded ILOT/LOT, fall back to the last orphan header.
      if (!tableHasOwnHeader && pendingHeader) {
        header = pendingHeader;
      }

      const isGuideFormat = !!(header && (header.ilotName || header.plotNumber));

      if (isGuideFormat && header) {
        if (tableHasOwnHeader) {
          newWarnings.push("Format guide détecté — extraction des valeurs ILOT, LOT, SUPERFICIE, ATTRIBUTAIRES depuis les blocs");
        } else {
          newWarnings.push(`En-tête orpheline appliquée au tableau suivant (ILOT ${header.ilotName ?? "?"} / LOT ${header.plotNumber ?? "?"})`);
        }

        const ilotName = header.ilotName;
        const plotNumber = header.plotNumber;
        const area = header.area;
        const affectation = header.affectation;

        // Once we consumed the orphan header for a data table, clear it so it is not reused.
        if (!tableHasOwnHeader) pendingHeader = null;

        if (!plotNumber) continue;
        if (!isValidPlotNumberCandidate(plotNumber)) continue;
        if (isExistingPlot(ilotName, String(plotNumber))) continue;

        // Find attributaire data
        let beneficiaireName = "";
        let contact = "";
        let cniNature = "";
        let cniNumber = "";
        let cniDate = "";
        let attestationNumber = "";
        let attestationDate = "";

        let dataHeaderRowIdx = -1;
        for (let ri = 0; ri < rows.length; ri++) {
          const cells = rows[ri].querySelectorAll("td, th");
          const rowText = Array.from(cells).map(c => (c.textContent || "").trim().toUpperCase()).join(" ");
          if (rowText.includes("NOM") && (rowText.includes("PRENOM") || rowText.includes("ATTRIBUT"))) {
            dataHeaderRowIdx = ri;
            break;
          }
        }

        if (dataHeaderRowIdx >= 0) {
          for (let ri = dataHeaderRowIdx + 1; ri < rows.length; ri++) {
            const cells = Array.from(rows[ri].querySelectorAll("td, th"));
            const cellTexts = cells.map(c => (c.textContent || "").trim());
            const firstCell = cellTexts[0] || "";
            if (!firstCell || firstCell.toUpperCase().includes("N°") || firstCell.toUpperCase().includes("NATURE")) continue;
            if (cellTexts.length >= 2 && !beneficiaireName) {
              beneficiaireName = cellTexts[1] || "";
              attestationNumber = cellTexts.length > 2 ? (cellTexts[2] || "") : "";
              attestationDate = cellTexts.length > 3 ? (cellTexts[3] || "") : "";
              contact = cellTexts.length > 4 ? (cellTexts[4] || "") : "";
              cniNature = cellTexts.length > 5 ? (cellTexts[5] || "") : "";
              cniNumber = cellTexts.length > 6 ? (cellTexts[6] || "") : "";
              cniDate = cellTexts.length > 7 ? (cellTexts[7] || "") : "";
              break;
            }
          }
        }

        const parcelle: ParsedGeometreParcelle = {
          plotNumber: String(plotNumber),
          area,
          price: 0,
          ilotName: ilotName ? String(ilotName) : undefined,
          beneficiaire: beneficiaireName || undefined,
          contact: contact || undefined,
          cniNature: cniNature || undefined,
          cniNumber: cniNumber || undefined,
          cniDate: cniDate || undefined,
          attestationNumber: attestationNumber || undefined,
          attestationDate: attestationDate || undefined,
          affectation: (affectation && affectation.length > 0) ? affectation : undefined,
        };
        parcelles.push(parcelle);

        if (ilotName) {
          const existingIlot = ilots.find((il) => il.name.toLowerCase() === String(ilotName).toLowerCase());
          if (existingIlot) existingIlot.parcelles.push(parcelle);
          else ilots.push({ name: String(ilotName), parcelles: [parcelle] });
        }
      } else {
        // Standard table format
        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i].querySelectorAll("td, th");
          const record: Record<string, unknown> = {};
          Array.from(cells).forEach((cell, idx) => {
            const key = headers[idx] || `col_${idx + 1}`;
            record[key] = cell.textContent?.trim() || "";
          });

          if (shouldSkipExcelRow(record)) continue;

          let plotNumber = findValue(record, ["lots", "lot", "numero_lot", "numerolot", "nlot", "nolot", "parcelle", "numero_parcelle", "plot_number"]);
          if (!plotNumber) {
            plotNumber = findValue(record, ["numero", "numéro", "num", "n°", "no", "ref", "reference", "référence", "id", "label", "name", "nom", "designation", "désignation"]);
          }
          const area = parseNumber(findValue(record, ["superficie", "surface", "area", "m2", "m²", "sup", "contenance"]));
          const price = parseNumber(findValue(record, ["prix", "price", "montant", "cout", "coût", "valeur", "pu", "prixunitaire"]));
          const ilotName = findValue(record, ["ilot", "îlot", "ilots", "nom_ilot", "nom ilot", "ilot_name", "block", "zone", "secteur", "section"]);
          const proprietaireTerrien = findValue(record, ["proprietaire terrien", "proprietaireterrien", "proprietaire", "propriétaire", "owner"]);
          const beneficiaire = findValue(record, ["beneficiaires", "beneficiaire", "bénéficiaire", "bénéficiaires", "membre", "collaborateur"]);

          if (!plotNumber && !strictMatchingRef.current) {
            const firstNonEmpty = Object.values(record).find(
              (val) => val !== null && val !== undefined && String(val).trim() !== ""
            );
            if (firstNonEmpty !== undefined) plotNumber = firstNonEmpty;
          }

          if (!plotNumber) continue;
          if (strictMatchingRef.current && !ilotName) continue;
          if (!isValidPlotNumberCandidate(plotNumber)) continue;
          if (isExistingPlot(ilotName ? String(ilotName) : undefined, String(plotNumber))) continue;

          const parcelle: ParsedGeometreParcelle = {
            plotNumber: String(plotNumber),
            area,
            price: price || 0,
            ilotName: ilotName ? String(ilotName) : undefined,
            proprietaireTerrien: isFilledCell(proprietaireTerrien) ? String(proprietaireTerrien) : undefined,
            beneficiaire: isFilledCell(beneficiaire) ? String(beneficiaire) : undefined,
          };
          parcelles.push(parcelle);

          if (ilotName) {
            const existingIlot = ilots.find((il) => il.name.toLowerCase() === String(ilotName).toLowerCase());
            if (existingIlot) existingIlot.parcelles.push(parcelle);
            else ilots.push({ name: String(ilotName), parcelles: [parcelle] });
          }
        }
      }
    }

    if (parcelles.length === 0 && ilots.length === 0) {
      newErrors.push("Aucune donnée exploitable trouvée dans le document Word");
    }

    return { ilots, parcelles, errors: newErrors, warnings: newWarnings };
  }, [isExistingPlot]);

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
        case "word":
          result = await parseWordFile(file);
          break;
        default:
          setErrors(["Format de fichier non reconnu. Formats acceptés : DXF, SHP, CSV, XLS, XLSX, DOCX"]);
          setStep("preview");
          return;
      }

      // Compute detected counts per ilot (from raw parse, before dedup)
      const detected: Record<string, number> = {};
      for (const p of result.parcelles) {
        const key = p.ilotName ? String(p.ilotName).trim() : "(sans îlot)";
        detected[key] = (detected[key] || 0) + 1;
      }

      // Filter duplicate parcelles (scoped per ilot when known)
      const filteredParcelles = result.parcelles.filter(
        p => !isExistingPlot(p.ilotName, p.plotNumber)
      );
      const duplicates = result.parcelles.length - filteredParcelles.length;
      if (duplicates > 0) {
        result.warnings.push(`${duplicates} parcelle(s) ignorée(s) car déjà existante(s)`);
      }

      // For ilots: keep only NEW ones for creation, but don't treat existing as errors
      // Existing ilots will be reused during import (their IDs will be resolved)
      const newIlots = result.ilots.filter(
        i => !existingIlotNames.includes(i.name)
      );
      const reusedIlots = result.ilots.length - newIlots.length;
      if (reusedIlots > 0) {
        result.warnings.push(`${reusedIlots} îlot(s) existant(s) seront réutilisé(s)`);
      }

      setErrors(result.errors);
      setWarnings(result.warnings);
      setParsedIlots(newIlots);
      setParsedParcelles(filteredParcelles);
      setDetectedByIlot(detected);
      setStep("preview");
    } catch (err) {
      setErrors(["Erreur de lecture du fichier. Vérifiez le format."]);
      setStep("preview");
    }
  }, [existingIlotNames, isExistingPlot, parseExcelFile, parseWordFile]);

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
        name.endsWith(".csv") || name.endsWith(".xls") || name.endsWith(".xlsx") ||
        name.endsWith(".docx") || name.endsWith(".doc");
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
      // Pre-populate ilotIdMap with existing ilots from DB
      const { data: existingDbIlots } = await supabase
        .from("ilots")
        .select("id, name")
        .eq("lotissement_id", lotissementId)
        .is("deleted_at", null);
      
      if (existingDbIlots) {
        for (const ilot of existingDbIlots) {
          ilotIdMap[ilot.name.toLowerCase()] = ilot.id;
        }
      }

      // Create only NEW ilots
      for (const ilot of parsedIlots) {
        try {
          const result = await createIlot.mutateAsync({
            lotissement_id: lotissementId,
            name: ilot.name,
            description: ilot.description || null,
            total_area: ilot.totalArea || null,
            plots_count: ilot.parcelles.length || null,
          });
          ilotIdMap[ilot.name.toLowerCase()] = result.id;
        } catch (ilotErr) {
          console.error(`Erreur création îlot ${ilot.name}:`, ilotErr);
        }
        done++;
        setImportProgress({ done, total: totalItems });
      }

      // Create parcelles and track beneficiaire assignments
      let successCount = 0;
      let failCount = 0;
      const createdParcelles: { id: string; parcelle: ParsedGeometreParcelle }[] = [];

      for (const parcelle of parsedParcelles) {
        try {
          const ilotId = parcelle.ilotName ? ilotIdMap[parcelle.ilotName.toLowerCase()] || null : null;
          
          // Determine attribution based on file data
          let attribution: string | undefined;
          if (parcelle.proprietaireTerrien) {
            attribution = "proprietaire";
          } else if (parcelle.beneficiaire) {
            attribution = "lotisseur";
          }

          const notesValue = [
            parcelle.proprietaireTerrien ? `Propriétaire: ${parcelle.proprietaireTerrien}` : "",
            parcelle.beneficiaire ? `Bénéficiaire: ${parcelle.beneficiaire}` : "",
          ].filter(Boolean).join(" | ") || undefined;

          // Check if a parcelle with the same (ilot, plot_number) already exists (including soft-deleted).
          // The same lot number can legitimately exist in several îlots.
          let existingParcelleQuery = supabase
            .from("parcelles")
            .select("id")
            .eq("lotissement_id", lotissementId)
            .eq("plot_number", parcelle.plotNumber);

          existingParcelleQuery = ilotId
            ? existingParcelleQuery.eq("ilot_id", ilotId)
            : existingParcelleQuery.is("ilot_id", null);

          const { data: existing } = await existingParcelleQuery.maybeSingle();

          let result: any;
          if (existing) {
            // Restore / update existing parcelle
            const { data: updated, error: updateErr } = await supabase
              .from("parcelles")
              .update({
                deleted_at: null,
                ilot_id: ilotId,
                area: parcelle.area,
                price: parcelle.price,
                ...(attribution ? { attribution } : {}),
                notes: notesValue,
              })
              .eq("id", existing.id)
              .select()
              .single();
            if (updateErr) throw updateErr;
            result = updated;
          } else {
            result = await createParcelle.mutateAsync({
              lotissement_id: lotissementId,
              ilot_id: ilotId,
              plot_number: parcelle.plotNumber,
              area: parcelle.area,
              price: parcelle.price,
              ...(attribution ? { attribution } : {}),
              notes: notesValue,
            } as any);
          }
          successCount++;
          createdParcelles.push({ id: result.id, parcelle });
        } catch (parcelleErr) {
          console.error(`Erreur création parcelle ${parcelle.plotNumber}:`, parcelleErr);
          failCount++;
        }
        done++;
        setImportProgress({ done, total: totalItems });
      }

      // Auto-create beneficiaires_lots and link parcelles
      const beneficiaireCache: Record<string, string> = {}; // name -> beneficiaire_id
      
      // Load existing beneficiaires for this lotissement
      const { data: existingBeneficiaires } = await supabase
        .from("beneficiaires_lots")
        .select("id, nom, partie")
        .eq("lotissement_id", lotissementId);
      
      if (existingBeneficiaires) {
        for (const b of existingBeneficiaires) {
          beneficiaireCache[`${b.partie}:${b.nom.toLowerCase().trim()}`] = b.id;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      for (const { id: parcelleId, parcelle } of createdParcelles) {
        try {
          let beneficiaireId: string | null = null;

          // Handle proprietaire terrien - create record but don't link yet
          if (parcelle.proprietaireTerrien) {
            const key = `proprietaire:${parcelle.proprietaireTerrien.toLowerCase().trim()}`;
            if (!beneficiaireCache[key]) {
              const { data: created } = await supabase
                .from("beneficiaires_lots")
                .insert({
                  lotissement_id: lotissementId,
                  user_id: user?.id,
                  nom: parcelle.proprietaireTerrien.trim(),
                  partie: "proprietaire",
                  telephone: parcelle.contact || null,
                  cni_number: parcelle.cniNumber || null,
                } as any)
                .select("id")
                .single();
              if (created) beneficiaireCache[key] = created.id;
            }
          }

          // Handle beneficiaire (lotisseur side or attributaire from guide)
          if (parcelle.beneficiaire) {
            const key = `lotisseur:${parcelle.beneficiaire.toLowerCase().trim()}`;
            if (!beneficiaireCache[key]) {
              const { data: created } = await supabase
                .from("beneficiaires_lots")
                .insert({
                  lotissement_id: lotissementId,
                  user_id: user?.id,
                  nom: parcelle.beneficiaire.trim(),
                  partie: "lotisseur",
                  telephone: parcelle.contact || null,
                  cni_number: parcelle.cniNumber || null,
                } as any)
                .select("id")
                .single();
              if (created) beneficiaireCache[key] = created.id;
            }
            // Always prefer the beneficiaire (actual person) as the linked record
            beneficiaireId = beneficiaireCache[key] || null;
          }

          // Only fall back to proprietaire if no beneficiaire
          if (!beneficiaireId && parcelle.proprietaireTerrien) {
            const key = `proprietaire:${parcelle.proprietaireTerrien.toLowerCase().trim()}`;
            beneficiaireId = beneficiaireCache[key] || null;
          }

          // Link parcelle to beneficiaire
          if (beneficiaireId) {
            await supabase
              .from("parcelles")
              .update({ beneficiaire_id: beneficiaireId })
              .eq("id", parcelleId);
          }
        } catch (linkErr) {
          console.warn(`Erreur liaison bénéficiaire pour ${parcelle.plotNumber}:`, linkErr);
        }
      }

      setStep("done");
      const benefCount = Object.keys(beneficiaireCache).length;
      if (failCount > 0) {
        toast.warning(`Import partiel : ${successCount} parcelle(s) créée(s), ${failCount} en erreur`);
      } else {
        toast.success(`Import réussi : ${parsedIlots.length} îlot(s), ${successCount} parcelle(s) et ${benefCount} bénéficiaire(s) créé(s)`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'import";
      console.error("Import error:", err);
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
    word: "Word (DOCX/DOC)",
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
                Formats acceptés : DXF, SHP (+DBF), CSV, XLS, XLSX, DOCX
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
                <Badge variant="secondary" className="text-xs">
                  <FileType className="h-3 w-3 mr-1" />
                  DOCX
                </Badge>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".dxf,.dwg,.shp,.dbf,.csv,.xls,.xlsx,.docx,.doc"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex justify-center pb-2">
              <Button variant="outline" onClick={downloadTemplate} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Télécharger le modèle Word (Guide de Lotissement)
              </Button>
            </div>

            <Card className="border-muted">
              <CardContent className="p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={strictMatching}
                    onChange={(e) => setStrictMatching(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">Correspondance stricte</p>
                    <p>
                      Ne crée que les lots dont le couple <strong>(îlot, numéro de lot)</strong> apparaît
                      explicitement dans le fichier. Aucun héritage de l'îlot précédent, aucune interprétation positionnelle.
                    </p>
                  </div>
                </label>
              </CardContent>
            </Card>

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
                    <p><strong>Excel/CSV/Word :</strong> Colonnes attendues — numéro, superficie, prix, îlot (optionnel)</p>
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
                          {parcelle.proprietaireTerrien && (
                            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                              Proprio: {parcelle.proprietaireTerrien}
                            </Badge>
                          )}
                          {parcelle.beneficiaire && (
                            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                              Bénéf: {parcelle.beneficiaire}
                            </Badge>
                          )}
                          {parcelle.contact && (
                            <Badge variant="outline" className="text-xs">
                              📞 {parcelle.contact}
                            </Badge>
                          )}
                          {parcelle.cniNumber && (
                            <Badge variant="outline" className="text-xs">
                              {parcelle.cniNature || "CNI"}: {parcelle.cniNumber}
                            </Badge>
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
  const rowEntries = Object.keys(row).map((rowKey) => ({
    rowKey,
    normalizedRowKey: normalizeExcelKey(rowKey),
    value: row[rowKey],
  }));

  for (const key of keys) {
    const normalizedKey = normalizeExcelKey(key);

    const exactMatch = rowEntries.find(
      ({ normalizedRowKey, value }) =>
        normalizedRowKey === normalizedKey &&
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    );

    if (exactMatch) {
      return exactMatch.value;
    }
  }

  for (const key of keys) {
    const normalizedKey = normalizeExcelKey(key);

    for (const { normalizedRowKey, value } of rowEntries) {
      if (!isFilledCell(value)) continue;
      if (!isCompatiblePartialHeaderMatch(normalizedRowKey, normalizedKey)) continue;
      return value;
    }
  }

  return undefined;
}

function isCompatiblePartialHeaderMatch(normalizedRowKey: string, normalizedKey: string): boolean {
  if (!normalizedRowKey || !normalizedKey) return false;
  if (!(normalizedRowKey.includes(normalizedKey) || normalizedKey.includes(normalizedRowKey))) {
    return false;
  }

  if (["n", "no", "num", "numero"].includes(normalizedKey) && normalizedRowKey.includes("ordre")) {
    return false;
  }

  if (["lot", "lots"].includes(normalizedKey) && normalizedRowKey.startsWith("ilot")) {
    return false;
  }

  return true;
}

function normalizeExcelKey(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function isFilledCell(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function shouldSkipExcelRow(row: Record<string, unknown>): boolean {
  const values = Object.values(row).filter(isFilledCell).map((value) => normalizeExcelKey(value));

  if (values.length === 0) return true;
  if (values.includes("lechefduvillage")) return true;

  const headerTokens = ["ndordre", "proprietaireterrien", "beneficiaires", "ilots", "lots", "adresse", "contacts", "quartier"];
  const headerMatches = values.filter((value) => headerTokens.includes(value)).length;

  return headerMatches >= 3;
}

function getWordTableRecords(
  table: HTMLTableElement,
  expectedHeaders: string[]
): {
  records: Record<string, unknown>[];
  detectedColumns: string[];
  headerRowIndex: number;
} {
  const rows = Array.from(table.querySelectorAll("tr"))
    .map((row) => Array.from(row.querySelectorAll("td, th")).flatMap((cell) => {
      const colspan = Math.max(parseInt(cell.getAttribute("colspan") || "1", 10) || 1, 1);
      const text = cell.textContent?.trim() || "";
      return Array.from({ length: colspan }, () => text);
    }))
    .filter((row) => row.some(isFilledCell));

  if (rows.length === 0) {
    return { records: [], detectedColumns: [], headerRowIndex: -1 };
  }

  const headerRowIndex = detectHeaderRowIndex(rows, expectedHeaders);
  const headerSource = headerRowIndex >= 0 ? rows[headerRowIndex] : rows[0];
  const maxColumns = Math.max(...rows.map((row) => row.length), 0);
  const seenHeaders = new Map<string, number>();
  const headers = Array.from({ length: maxColumns }, (_, index) => {
    const rawHeader = headerSource[index];
    const baseHeader = isFilledCell(rawHeader) ? String(rawHeader).trim() : `col_${index + 1}`;
    const normalized = normalizeExcelKey(baseHeader) || `col${index + 1}`;
    const count = seenHeaders.get(normalized) || 0;
    seenHeaders.set(normalized, count + 1);
    return count === 0 ? baseHeader : `${baseHeader}_${count + 1}`;
  });

  const dataRows = rows.slice(headerRowIndex >= 0 ? headerRowIndex + 1 : 0);
  const records = dataRows
    .filter((row) => row.some(isFilledCell))
    .map((row) => {
      const record: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ?? "";
      });
      return record;
    });

  return { records, detectedColumns: headers, headerRowIndex };
}

function getWorksheetRecords(
  sheet: XLSX.WorkSheet,
  expectedHeaders: string[]
): {
  records: Record<string, unknown>[];
  detectedColumns: string[];
  headerRowIndex: number;
  usedGenericHeaders: boolean;
} {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });

  const nonEmptyRows = rows.filter((row) => Array.isArray(row) && row.some(isFilledCell));
  if (nonEmptyRows.length === 0) {
    return { records: [], detectedColumns: [], headerRowIndex: -1, usedGenericHeaders: false };
  }

  const headerRowIndex = detectHeaderRowIndex(nonEmptyRows, expectedHeaders);
  const headerSource = headerRowIndex >= 0 ? nonEmptyRows[headerRowIndex] : nonEmptyRows[0];
  const maxColumns = Math.max(...nonEmptyRows.map((row) => row.length), 0);
  const headers = Array.from({ length: maxColumns }, (_, index) => {
    const rawHeader = headerSource[index];
    return isFilledCell(rawHeader) ? String(rawHeader).trim() : `col_${index + 1}`;
  });

  const dataRows = nonEmptyRows.slice(headerRowIndex >= 0 ? headerRowIndex + 1 : 0);
  const records = dataRows
    .filter((row) => row.some(isFilledCell))
    .map((row) => {
      const record: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ?? "";
      });
      return record;
    });

  return {
    records,
    detectedColumns: headers,
    headerRowIndex,
    usedGenericHeaders: headerRowIndex < 0,
  };
}

function detectHeaderRowIndex(rows: unknown[][], expectedHeaders: string[]): number {
  const normalizedExpected = expectedHeaders.map(normalizeExcelKey).filter(Boolean);
  let bestIndex = -1;
  let bestScore = 0;

  rows.slice(0, 10).forEach((row, index) => {
    const score = row.reduce<number>((total, cell) => {
      const normalizedCell = normalizeExcelKey(cell);
      if (!normalizedCell) return total;
      const matched = normalizedExpected.some(
        (expected) => normalizedCell === expected || normalizedCell.includes(expected) || expected.includes(normalizedCell)
      );
      return total + (matched ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore > 0 ? bestIndex : -1;
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

// Normalise un texte pour le matching: supprime les accents, uniformise la
// ponctuation/espacement, met en majuscules. Permet des variantes comme
// "Îlot", "ILOTS", "Équipement", "Equipement.", "Parcelle  -  148,5"…
function normalizeForMatch(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[\u00A0\u2000-\u200B]/g, " ") // nbsp & co -> space
    .replace(/\s+/g, " ")
    .toUpperCase();
}

// Sépcarateur tolérant entre un libellé et sa valeur: ":", "=", "-", "—",
// "·", "." répétés, ou simplement des espaces.
const LABEL_SEP = "\\s*(?:[:=\\-\\u2013\\u2014\\u00B7.\\u2026]+\\s*)?";

// Rejette tout numéro de lot qui n'est en réalité qu'un libellé du modèle
// (ATTRIBUTAIRES, ILOT, LOT, PARCELLE, EQUIPEMENT, ATTESTATION, CONTACTS,
// PIECE, NOM/PRENOMS, ARRETE, AFFECTATION, SUPERFICIE…) ou un blob bruité
// contenant ces libellés. Accepte les références courtes type "A12", "B-3",
// "1025", "Lot 25"…
export function isValidPlotNumberCandidate(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const raw = String(value).trim();
  if (!raw) return false;
  // Trop long → certainement pas un vrai numéro de lot
  if (raw.length > 30) return false;
  const norm = normalizeForMatch(raw)
    .replace(/[\s.\-_:;,/\\\u2013\u2014\u00B7\u2026'"`]+/g, " ")
    .trim();
  if (!norm) return false;
  // Doit contenir au moins un chiffre OU être une référence alphanumérique courte
  if (!/[0-9]/.test(norm) && norm.length > 6) return false;
  // Mots-clés interdits dans un numéro de lot
  const FORBIDDEN = [
    "ATTRIBUTAIRE", "ATTRIBUTAIRES",
    "ATTESTATION", "ATTESTATIONS",
    "CONTACT", "CONTACTS", "ADRESSE", "ADRESSES",
    "PIECE", "PIECES", "CNI",
    "NOM", "PRENOM", "PRENOMS",
    "EQUIPEMENT", "EQUIPEMENTS", "EQUIPT",
    "AFFECTATION", "AFFECT",
    "SUPERFICIE", "SURFACE", "CONTENANCE",
    "ARRETE",
    "COMMUNE", "VILLAGE", "LOTISSEMENT",
    "NATURE",
  ];
  const tokens = new Set(norm.split(" "));
  for (const kw of FORBIDDEN) {
    if (tokens.has(kw)) return false;
  }
  // Refuse aussi les blobs où apparaissent simultanément ILOT/LOT/PARCELLE
  // (= une ligne de libellés non parsée correctement).
  let hits = 0;
  if (/\bILOTS?\b/.test(norm)) hits++;
  if (/\bLOTS?\b/.test(norm)) hits++;
  if (/\bPARCELLES?\b/.test(norm)) hits++;
  if (hits >= 2) return false;
  return true;
}
