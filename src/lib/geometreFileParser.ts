/**
 * Parsers for surveyor (géomètre) file formats:
 * - DXF (AutoCAD interchange format)
 * - Shapefile (.shp + .dbf)
 * - Excel/CSV (handled separately in ImportGeometreDialog)
 */

export interface ParsedGeometreIlot {
  name: string;
  description?: string;
  totalArea?: number;
  parcelles: ParsedGeometreParcelle[];
}

export interface ParsedGeometreParcelle {
  plotNumber: string;
  area: number;
  price: number;
  ilotName?: string;
  coordinates?: [number, number][];
}

export interface GeometreParseResult {
  ilots: ParsedGeometreIlot[];
  parcelles: ParsedGeometreParcelle[];
  errors: string[];
  warnings: string[];
}

// ─── Shoelace formula for polygon area ────────────────────────────────
function calculatePolygonArea(vertices: [number, number][]): number {
  if (vertices.length < 3) return 0;
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i][0] * vertices[j][1];
    area -= vertices[j][0] * vertices[i][1];
  }
  return Math.abs(area / 2);
}

// ─── DXF Parser ───────────────────────────────────────────────────────
export async function parseDXF(file: File): Promise<GeometreParseResult> {
  const dxfModule = await import("dxf-parser");
  const DxfParser = dxfModule.default || dxfModule;
  const text = await file.text();
  const parser = typeof DxfParser === 'function' ? new DxfParser() : new (DxfParser as any).default();
  const errors: string[] = [];
  const warnings: string[] = [];
  const ilots: ParsedGeometreIlot[] = [];
  const parcelles: ParsedGeometreParcelle[] = [];

  try {
    const dxf = parser.parseSync(text);
    if (!dxf || !dxf.entities || dxf.entities.length === 0) {
      errors.push("Fichier DXF vide ou illisible");
      return { ilots, parcelles, errors, warnings };
    }

    // Group entities by layer — layers often represent ilots
    const layerEntities: Record<string, any[]> = {};
    const textEntities: any[] = [];

    for (const entity of dxf.entities) {
      const layer = entity.layer || "DEFAULT";
      if (!layerEntities[layer]) layerEntities[layer] = [];
      layerEntities[layer].push(entity);

      if (entity.type === "TEXT" || entity.type === "MTEXT") {
        textEntities.push(entity);
      }
    }

    // Extract closed polylines as parcelles
    let plotCounter = 1;

    for (const [layerName, entities] of Object.entries(layerEntities)) {
      const polylines = entities.filter(
        (e) =>
          e.type === "LWPOLYLINE" ||
          e.type === "POLYLINE" ||
          e.type === "LINE" ||
          e.type === "CIRCLE" ||
          e.type === "3DFACE"
      );

      // Filter only closed polylines (parcelle boundaries)
      const closedPolys = polylines.filter((e) => {
        if (e.type === "LWPOLYLINE" || e.type === "POLYLINE") {
          // Check if explicitly closed or if first/last vertex match
          if (e.shape === true || e.closed === true) return true;
          if (e.vertices && e.vertices.length >= 3) {
            const first = e.vertices[0];
            const last = e.vertices[e.vertices.length - 1];
            const dist = Math.sqrt(
              Math.pow((first.x || 0) - (last.x || 0), 2) +
                Math.pow((first.y || 0) - (last.y || 0), 2)
            );
            return dist < 0.01; // Nearly closed
          }
        }
        return false;
      });

      if (closedPolys.length === 0) continue;

      // Determine if this layer represents an ilot
      const isIlotLayer =
        layerName.toLowerCase().includes("ilot") ||
        layerName.toLowerCase().includes("îlot") ||
        layerName.toLowerCase().includes("block") ||
        layerName.toLowerCase().includes("zone");

      const ilotName = isIlotLayer ? layerName : undefined;

      // If it's an ilot layer, create ilot entry
      let currentIlot: ParsedGeometreIlot | undefined;
      if (ilotName) {
        currentIlot = {
          name: layerName,
          parcelles: [],
        };
      }

      for (const poly of closedPolys) {
        const vertices: [number, number][] = (poly.vertices || []).map(
          (v: any) => [v.x || 0, v.y || 0] as [number, number]
        );

        const area = calculatePolygonArea(vertices);
        if (area < 0.1) continue; // Skip tiny polygons

        // Try to find a nearby text entity for plot number
        let plotNumber = "";
        const centroid = getCentroid(vertices);

        for (const txt of textEntities) {
          const txtPos = txt.startPoint || txt.position || {};
          const dist = Math.sqrt(
            Math.pow(centroid[0] - (txtPos.x || 0), 2) +
              Math.pow(centroid[1] - (txtPos.y || 0), 2)
          );
          // If text is within reasonable distance of the polygon centroid
          if (dist < Math.sqrt(area) * 2) {
            const textVal = (txt.text || txt.string || "").trim();
            if (textVal && textVal.length < 20) {
              plotNumber = textVal;
              break;
            }
          }
        }

        if (!plotNumber) {
          plotNumber = `${layerName}-${plotCounter}`;
          plotCounter++;
        }

        const parcelle: ParsedGeometreParcelle = {
          plotNumber,
          area: Math.round(area * 100) / 100,
          price: 0,
          ilotName: ilotName || layerName,
          coordinates: vertices,
        };

        parcelles.push(parcelle);
        if (currentIlot) {
          currentIlot.parcelles.push(parcelle);
        }
      }

      if (currentIlot && currentIlot.parcelles.length > 0) {
        currentIlot.totalArea = currentIlot.parcelles.reduce(
          (sum, p) => sum + p.area,
          0
        );
        ilots.push(currentIlot);
      }
    }

    // Auto-create ilots from unique ilotNames if not already created
    const ilotNamesFromParcelles = [
      ...new Set(
        parcelles
          .filter((p) => p.ilotName && !ilots.find((i) => i.name === p.ilotName))
          .map((p) => p.ilotName!)
      ),
    ];

    for (const name of ilotNamesFromParcelles) {
      const relatedParcelles = parcelles.filter((p) => p.ilotName === name);
      ilots.push({
        name,
        parcelles: relatedParcelles,
        totalArea: relatedParcelles.reduce((sum, p) => sum + p.area, 0),
      });
    }

    if (parcelles.length === 0) {
      warnings.push(
        "Aucun polygone fermé trouvé. Vérifiez que le fichier contient des polylignes fermées représentant les lots."
      );
    }

    warnings.push(
      `${Object.keys(layerEntities).length} calque(s) détecté(s), ${parcelles.length} parcelle(s) extraite(s)`
    );
  } catch (err) {
    errors.push(
      `Erreur lors de l'analyse du fichier DXF : ${err instanceof Error ? err.message : "format invalide"}`
    );
  }

  return { ilots, parcelles, errors, warnings };
}

// ─── Shapefile Parser ─────────────────────────────────────────────────
export async function parseShapefile(
  shpFile: File,
  dbfFile?: File
): Promise<GeometreParseResult> {
  const shapefile = await import("shapefile");
  const errors: string[] = [];
  const warnings: string[] = [];
  const ilots: ParsedGeometreIlot[] = [];
  const parcelles: ParsedGeometreParcelle[] = [];

  try {
    const shpBuffer = await shpFile.arrayBuffer();
    const dbfBuffer = dbfFile ? await dbfFile.arrayBuffer() : undefined;

    const source = await shapefile.open(shpBuffer, dbfBuffer);

    let plotCounter = 1;
    const ilotMap: Record<string, ParsedGeometreIlot> = {};

    let result = await source.read();
    while (!result.done) {
      const feature = result.value;
      const props = feature.properties || {};
      const geometry = feature.geometry;

      // Extract plot number from properties
      const plotNumber =
        findProp(props, [
          "numero",
          "numéro",
          "num",
          "n°",
          "plot_number",
          "lot",
          "parcelle",
          "id",
          "name",
          "nom",
          "label",
          "fid",
        ]) || `LOT-${plotCounter}`;
      plotCounter++;

      // Extract area from properties or calculate from geometry
      let area =
        parseFloat(
          String(
            findProp(props, [
              "superficie",
              "surface",
              "area",
              "shape_area",
              "st_area",
              "m2",
              "m²",
            ]) || "0"
          )
        ) || 0;

      if (area === 0 && geometry) {
        area = calculateGeometryArea(geometry);
      }

      // Extract ilot name
      const ilotName =
        findProp(props, [
          "ilot",
          "îlot",
          "block",
          "zone",
          "secteur",
          "section",
          "group",
        ]) || undefined;

      // Extract price
      const price =
        parseFloat(
          String(
            findProp(props, ["prix", "price", "montant", "valeur", "cout"]) ||
              "0"
          )
        ) || 0;

      // Extract coordinates
      let coordinates: [number, number][] | undefined;
      if (geometry && geometry.type === "Polygon" && geometry.coordinates) {
        coordinates = geometry.coordinates[0] as [number, number][];
      }

      const parcelle: ParsedGeometreParcelle = {
        plotNumber: String(plotNumber),
        area: Math.round(area * 100) / 100,
        price,
        ilotName: ilotName ? String(ilotName) : undefined,
        coordinates,
      };
      parcelles.push(parcelle);

      // Group into ilots
      if (ilotName) {
        const key = String(ilotName).toLowerCase();
        if (!ilotMap[key]) {
          ilotMap[key] = {
            name: String(ilotName),
            parcelles: [],
          };
        }
        ilotMap[key].parcelles.push(parcelle);
      }

      result = await source.read();
    }

    // Finalize ilots
    for (const ilot of Object.values(ilotMap)) {
      ilot.totalArea = ilot.parcelles.reduce((sum, p) => sum + p.area, 0);
      ilots.push(ilot);
    }

    if (parcelles.length === 0) {
      errors.push("Aucune entité géographique trouvée dans le Shapefile");
    } else {
      warnings.push(`${parcelles.length} parcelle(s) extraite(s) du Shapefile`);
    }
  } catch (err) {
    errors.push(
      `Erreur lors de la lecture du Shapefile : ${err instanceof Error ? err.message : "format invalide"}`
    );
  }

  return { ilots, parcelles, errors, warnings };
}

// ─── Helpers ──────────────────────────────────────────────────────────

function getCentroid(vertices: [number, number][]): [number, number] {
  const n = vertices.length;
  if (n === 0) return [0, 0];
  const sum = vertices.reduce(
    (acc, v) => [acc[0] + v[0], acc[1] + v[1]] as [number, number],
    [0, 0] as [number, number]
  );
  return [sum[0] / n, sum[1] / n];
}

function findProp(
  props: Record<string, any>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    for (const propKey of Object.keys(props)) {
      if (
        propKey
          .toLowerCase()
          .trim()
          .replace(/[_\s]/g, "") ===
        key.replace(/[_\s]/g, "")
      ) {
        const val = props[propKey];
        if (val !== null && val !== undefined && String(val).trim() !== "") {
          return String(val);
        }
      }
    }
  }
  return undefined;
}

function calculateGeometryArea(geometry: any): number {
  if (geometry.type === "Polygon" && geometry.coordinates) {
    return calculatePolygonArea(geometry.coordinates[0]);
  }
  if (geometry.type === "MultiPolygon" && geometry.coordinates) {
    return geometry.coordinates.reduce(
      (sum: number, poly: any) => sum + calculatePolygonArea(poly[0]),
      0
    );
  }
  return 0;
}

// ─── File type detection ──────────────────────────────────────────────
export type GeometreFileType = "dxf" | "dwg" | "shapefile" | "excel" | "unknown";

export function detectFileType(file: File): GeometreFileType {
  const name = file.name.toLowerCase();
  if (name.endsWith(".dxf")) return "dxf";
  if (name.endsWith(".dwg")) return "dwg";
  if (name.endsWith(".shp")) return "shapefile";
  if (
    name.endsWith(".csv") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx")
  )
    return "excel";
  return "unknown";
}
