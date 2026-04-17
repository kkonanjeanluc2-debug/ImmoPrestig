import { useRef, useState, useCallback, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw, Move, RotateCw } from "lucide-react";

interface WatermarkPositionEditorProps {
  positionX: number; // 0-100
  positionY: number; // 0-100
  rotation: number;  // -180..180
  onChange: (next: { positionX: number; positionY: number; rotation: number }) => void;
  watermarkType: string;
  watermarkText?: string | null;
  watermarkImageUrl?: string | null;
  opacity: number;
  disabled?: boolean;
  templateType?: string;
}

/**
 * Visual editor: drag the watermark on a mini A4 page to set its real position,
 * and rotate it via a circular handle. Mirrors the actual attestation layout ratio.
 */
export function WatermarkPositionEditor({
  positionX,
  positionY,
  rotation,
  onChange,
  watermarkType,
  watermarkText,
  watermarkImageUrl,
  opacity,
  disabled,
  templateType,
}: WatermarkPositionEditorProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [draggingMode, setDraggingMode] = useState<null | "move" | "rotate">(null);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number, mode: "move" | "rotate") => {
      const el = pageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      if (mode === "move") {
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        onChange({
          positionX: Math.max(0, Math.min(100, x)),
          positionY: Math.max(0, Math.min(100, y)),
          rotation,
        });
      } else {
        // rotate around current watermark center
        const centerX = rect.left + (positionX / 100) * rect.width;
        const centerY = rect.top + (positionY / 100) * rect.height;
        const angleRad = Math.atan2(clientY - centerY, clientX - centerX);
        let angleDeg = angleRad * (180 / Math.PI);
        // Normalize to -180..180
        if (angleDeg > 180) angleDeg -= 360;
        if (angleDeg < -180) angleDeg += 360;
        onChange({
          positionX,
          positionY,
          rotation: Math.round(angleDeg),
        });
      }
    },
    [onChange, positionX, positionY, rotation]
  );

  useEffect(() => {
    if (!draggingMode) return;
    const handleMove = (e: PointerEvent) => {
      e.preventDefault();
      updateFromPointer(e.clientX, e.clientY, draggingMode);
    };
    const handleUp = () => setDraggingMode(null);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [draggingMode, updateFromPointer]);

  const handlePageClick = (e: React.PointerEvent) => {
    if (disabled) return;
    // Only react to direct page clicks (background), not the watermark handle
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.role === "page-bg") {
      updateFromPointer(e.clientX, e.clientY, "move");
    }
  };

  const handleReset = () => {
    onChange({ positionX: 50, positionY: 50, rotation: templateType === "cession" ? -34 : -45 });
  };

  // Rotate handle position: 60px from center along current rotation
  const rotateHandleAngle = (rotation - 90) * (Math.PI / 180);
  const handleOffsetX = Math.cos(rotateHandleAngle) * 50;
  const handleOffsetY = Math.sin(rotateHandleAngle) * 50;

  const watermarkSize = watermarkType === "image" ? 70 : 50;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Move className="h-4 w-4" />
          Position et orientation du filigrane
        </Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleReset}
          disabled={disabled}
          className="h-7 text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Réinitialiser
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Glissez le filigrane sur la page pour le positionner. Utilisez la poignée bleue pour le faire pivoter.
      </p>

      <div className="flex flex-col items-center gap-3">
        {/* Mini A4 page (ratio 1:1.414) */}
        <div
          ref={pageRef}
          onPointerDown={handlePageClick}
          data-role="page-bg"
          className={`relative bg-white border-2 border-border rounded-md shadow-sm select-none ${
            disabled ? "opacity-50 pointer-events-none" : "cursor-crosshair"
          }`}
          style={{ width: 240, height: 339 /* ~A4 ratio */ }}
        >
          {/* Fake content lines for visual context */}
          <div className="absolute inset-0 p-3 pointer-events-none" data-role="page-bg">
            <div className="h-3 bg-primary/20 rounded mb-2 w-2/3 mx-auto" />
            <div className="h-1 bg-muted-foreground/10 rounded mb-1.5" />
            <div className="h-1 bg-muted-foreground/10 rounded mb-1.5 w-5/6" />
            <div className="h-1 bg-muted-foreground/10 rounded mb-3 w-4/5" />
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="h-1 bg-muted-foreground/10 rounded mb-1.5"
                style={{ width: `${75 + ((i * 13) % 25)}%` }}
              />
            ))}
          </div>

          {/* Watermark visual */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${positionX}%`,
              top: `${positionY}%`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              transformOrigin: "center",
            }}
          >
            {watermarkType === "text" && watermarkText?.trim() && (
              <span
                className="font-bold whitespace-nowrap text-primary"
                style={{
                  fontSize: 14,
                  opacity: Math.max(0.25, opacity * 2),
                  letterSpacing: "0.05em",
                }}
              >
                {watermarkText}
              </span>
            )}
            {watermarkType === "image" && watermarkImageUrl && (
              <img
                src={watermarkImageUrl}
                alt=""
                className="object-contain"
                style={{
                  width: watermarkSize,
                  height: watermarkSize,
                  opacity: Math.max(0.25, opacity * 2),
                }}
              />
            )}
            {watermarkType === "none" && (
              <span className="text-xs text-muted-foreground italic">Aucun filigrane</span>
            )}
          </div>

          {/* Drag handle for moving (overlay on watermark center) */}
          {watermarkType !== "none" && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDraggingMode("move");
              }}
              className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary border-2 border-white shadow-lg cursor-move hover:scale-110 transition-transform flex items-center justify-center"
              style={{
                left: `${positionX}%`,
                top: `${positionY}%`,
                zIndex: 10,
              }}
              aria-label="Déplacer le filigrane"
            >
              <Move className="h-3 w-3 text-primary-foreground" />
            </button>
          )}

          {/* Rotation handle */}
          {watermarkType !== "none" && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDraggingMode("rotate");
              }}
              className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 border-2 border-white shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform flex items-center justify-center"
              style={{
                left: `calc(${positionX}% + ${handleOffsetX}px)`,
                top: `calc(${positionY}% + ${handleOffsetY}px)`,
                zIndex: 11,
              }}
              aria-label="Faire pivoter le filigrane"
            >
              <RotateCw className="h-2.5 w-2.5 text-white" />
            </button>
          )}

          {/* Connection line between center and rotate handle */}
          {watermarkType !== "none" && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width="100%"
              height="100%"
              style={{ zIndex: 9 }}
            >
              <line
                x1={`${positionX}%`}
                y1={`${positionY}%`}
                x2={`calc(${positionX}% + ${handleOffsetX}px)` as any}
                y2={`calc(${positionY}% + ${handleOffsetY}px)` as any}
                stroke="rgb(59, 130, 246)"
                strokeWidth="1.5"
                strokeDasharray="3 2"
                opacity="0.6"
              />
            </svg>
          )}
        </div>

        {/* Live values readout */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] text-center">
          <div className="rounded bg-muted/50 px-2 py-1.5">
            <div className="text-[10px] text-muted-foreground uppercase">X</div>
            <div className="text-xs font-mono font-semibold">{Math.round(positionX)}%</div>
          </div>
          <div className="rounded bg-muted/50 px-2 py-1.5">
            <div className="text-[10px] text-muted-foreground uppercase">Y</div>
            <div className="text-xs font-mono font-semibold">{Math.round(positionY)}%</div>
          </div>
          <div className="rounded bg-muted/50 px-2 py-1.5">
            <div className="text-[10px] text-muted-foreground uppercase">Angle</div>
            <div className="text-xs font-mono font-semibold">{Math.round(rotation)}°</div>
          </div>
        </div>
      </div>
    </div>
  );
}
