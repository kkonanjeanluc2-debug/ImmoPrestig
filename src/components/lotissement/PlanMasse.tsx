import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ZoomIn, ZoomOut, Filter, RotateCcw } from "lucide-react";
import { Parcelle } from "@/hooks/useParcelles";
import { SellParcelleDialog } from "./SellParcelleDialog";
import { EditParcelleDialog } from "./EditParcelleDialog";
import { ReserveParcelleDialog } from "./ReserveParcelleDialog";

interface PlanMasseProps {
  parcelles: Parcelle[];
  lotissementName: string;
}

type StatusFilter = "all" | "disponible" | "reserve" | "vendu";

const STATUS_COLORS = {
  disponible: {
    fill: "#10b981",
    stroke: "#059669",
    text: "text-emerald-700",
    label: "Disponible",
  },
  reserve: {
    fill: "#f59e0b",
    stroke: "#d97706",
    text: "text-amber-700",
    label: "Réservée",
  },
  vendu: {
    fill: "#3b82f6",
    stroke: "#2563eb",
    text: "text-blue-700",
    label: "Vendue",
  },
};

export function PlanMasse({ parcelles, lotissementName }: PlanMasseProps) {
  const [zoom, setZoom] = useState(1);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedParcelle, setSelectedParcelle] = useState<Parcelle | null>(null);
  const [actionType, setActionType] = useState<"sell" | "edit" | "reserve" | null>(null);

  // Calculate grid layout
  const gridConfig = useMemo(() => {
    const count = parcelles.length;
    if (count === 0) return { cols: 1, rows: 1 };
    
    // Calculate optimal grid dimensions
    const cols = Math.ceil(Math.sqrt(count * 1.5));
    const rows = Math.ceil(count / cols);
    return { cols, rows };
  }, [parcelles.length]);

  // Filter parcelles
  const filteredParcelles = useMemo(() => {
    if (filter === "all") return parcelles;
    return parcelles.filter((p) => p.status === filter);
  }, [parcelles, filter]);

  // Sort parcelles by plot number for consistent display
  const sortedParcelles = useMemo(() => {
    return [...filteredParcelles].sort((a, b) => {
      const numA = parseInt(a.plot_number.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.plot_number.replace(/\D/g, "")) || 0;
      return numA - numB;
    });
  }, [filteredParcelles]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  const handleParcelleClick = (parcelle: Parcelle) => {
    setSelectedParcelle(parcelle);
    if (parcelle.status === "disponible") {
      setActionType("sell");
    } else if (parcelle.status === "reserve") {
      setActionType("edit");
    } else {
      setActionType("edit");
    }
  };

  // Calculate cell size based on grid
  const cellWidth = 80;
  const cellHeight = 60;
  const gap = 8;
  const svgWidth = gridConfig.cols * (cellWidth + gap) + gap;
  const svgHeight = gridConfig.rows * (cellHeight + gap) + gap;

  if (parcelles.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <p className="text-muted-foreground">Aucune parcelle à afficher</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Plan de masse - {lotissementName}</CardTitle>
          <div className="flex items-center gap-2">
            {/* Filter */}
            <Select value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="disponible">Disponibles</SelectItem>
                <SelectItem value="reserve">Réservées</SelectItem>
                <SelectItem value="vendu">Vendues</SelectItem>
              </SelectContent>
            </Select>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 border rounded-md">
              <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4">
          {Object.entries(STATUS_COLORS).map(([status, config]) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: config.fill }}
              />
              <span className="text-sm text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>

        {/* Map container */}
        <div className="overflow-auto border rounded-lg bg-muted/30 p-4">
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              transition: "transform 0.2s ease",
            }}
          >
            <TooltipProvider>
              <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="select-none"
              >
                {/* Grid background */}
                <defs>
                  <pattern
                    id="grid"
                    width={cellWidth + gap}
                    height={cellHeight + gap}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${cellWidth + gap} 0 L 0 0 0 ${cellHeight + gap}`}
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.1"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Parcelles */}
                {sortedParcelles.map((parcelle, index) => {
                  const col = index % gridConfig.cols;
                  const row = Math.floor(index / gridConfig.cols);
                  const x = gap + col * (cellWidth + gap);
                  const y = gap + row * (cellHeight + gap);
                  const colors = STATUS_COLORS[parcelle.status];

                  return (
                    <Tooltip key={parcelle.id}>
                      <TooltipTrigger asChild>
                        <g
                          className="cursor-pointer transition-all hover:opacity-80"
                          onClick={() => handleParcelleClick(parcelle)}
                        >
                          {/* Plot rectangle */}
                          <rect
                            x={x}
                            y={y}
                            width={cellWidth}
                            height={cellHeight}
                            rx={4}
                            fill={colors.fill}
                            stroke={colors.stroke}
                            strokeWidth={2}
                            className="transition-all hover:stroke-[3]"
                          />
                          
                          {/* Plot number */}
                          <text
                            x={x + cellWidth / 2}
                            y={y + 22}
                            textAnchor="middle"
                            className="text-sm font-bold fill-white"
                            style={{ fontSize: "14px" }}
                          >
                            {parcelle.plot_number}
                          </text>
                          
                          {/* Area */}
                          <text
                            x={x + cellWidth / 2}
                            y={y + 38}
                            textAnchor="middle"
                            className="fill-white/80"
                            style={{ fontSize: "10px" }}
                          >
                            {parcelle.area} m²
                          </text>
                          
                          {/* Price */}
                          <text
                            x={x + cellWidth / 2}
                            y={y + 52}
                            textAnchor="middle"
                            className="fill-white/70"
                            style={{ fontSize: "9px" }}
                          >
                            {(parcelle.price / 1000000).toFixed(1)}M
                          </text>
                        </g>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-bold">Lot {parcelle.plot_number}</p>
                          <p className="text-sm">Superficie: {parcelle.area} m²</p>
                          <p className="text-sm">Prix: {parcelle.price.toLocaleString("fr-FR")} F CFA</p>
                          <Badge
                            variant="outline"
                            className={`mt-1 ${
                              parcelle.status === "disponible"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : parcelle.status === "reserve"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-blue-500/10 text-blue-600"
                            }`}
                          >
                            {colors.label}
                          </Badge>
                          {parcelle.status === "disponible" && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Cliquez pour vendre ou réserver
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </svg>
            </TooltipProvider>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Affichées:</span>{" "}
            <span className="font-medium">{sortedParcelles.length}</span> parcelles
          </div>
          {filter !== "all" && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setFilter("all")}
              className="text-sm h-auto p-0"
            >
              Afficher toutes
            </Button>
          )}
        </div>
      </CardContent>

      {/* Dialogs */}
      {selectedParcelle && actionType === "sell" && (
        <SellParcelleDialog
          parcelle={selectedParcelle}
          open={!!selectedParcelle && actionType === "sell"}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedParcelle(null);
              setActionType(null);
            }
          }}
        />
      )}

      {selectedParcelle && actionType === "reserve" && (
        <ReserveParcelleDialog
          parcelle={selectedParcelle}
          open={!!selectedParcelle && actionType === "reserve"}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedParcelle(null);
              setActionType(null);
            }
          }}
        />
      )}

      {selectedParcelle && actionType === "edit" && (
        <EditParcelleDialog
          parcelle={selectedParcelle}
          open={!!selectedParcelle && actionType === "edit"}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedParcelle(null);
              setActionType(null);
            }
          }}
          existingNumbers={parcelles
            .filter((p) => p.id !== selectedParcelle.id)
            .map((p) => p.plot_number)}
        />
      )}
    </Card>
  );
}
