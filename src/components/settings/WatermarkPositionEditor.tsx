import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw, Move, RotateCw } from "lucide-react";
import {
  estimatePreviewWatermarkImageSize,
  estimatePreviewWatermarkTextSize,
  getAttestationWatermarkBounds,
} from "@/lib/attestationWatermark";

interface WatermarkPositionEditorProps {
  positionX: number; // 0-100
  positionY: number; // 0-100
  rotation: number;  // -180..180
  onChange: (next: { positionX: number; positionY: number; rotation: number }) => void;
  watermarkType: string;
  watermarkAngle?: string | null;
  watermarkText?: string | null;
  watermarkImageUrl?: string | null;
  watermarkRepeat?: boolean | null;
  opacity: number;
  disabled?: boolean;
  templateType?: string;
  pageBorderEnabled?: boolean;
  pageBorderStyle?: string | null;
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
  watermarkAngle,
  watermarkText,
  watermarkImageUrl,
  watermarkRepeat,
  opacity,
  disabled,
  templateType,
  pageBorderEnabled,
  pageBorderStyle,
}: WatermarkPositionEditorProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [draggingMode, setDraggingMode] = useState<null | "move" | "rotate">(null);
  const pageWidth = 240;
  const pageHeight = 339;
  const isInteractionDisabled = disabled ?? false;
  const rotationDisabled = watermarkAngle === "horizontal";
  const effectiveRotation = rotationDisabled ? 0 : rotation;
  const watermarkBounds = useMemo(
    () => getAttestationWatermarkBounds({
      pageWidth,
      pageHeight,
      templateType,
      pageBorderEnabled,
      pageBorderStyle,
    }),
    [pageBorderEnabled, pageBorderStyle, templateType]
  );
  const previewCenterX = watermarkBounds.left + (watermarkBounds.width * positionX) / 100;
  const previewCenterY = watermarkBounds.top + (watermarkBounds.height * positionY) / 100;
  const isCustomPlacement = Math.abs(positionX - 50) > 0.5
    || Math.abs(positionY - 50) > 0.5
    || (!rotationDisabled && Math.abs(rotation - (templateType === "cession" ? -34 : -45)) > 0.5);
  const showRepeated = (watermarkRepeat ?? true) && !isCustomPlacement;
  const isCession = templateType === "cession";
  const repeatedRatios = showRepeated
    ? rotationDisabled
      ? [{ x: 0.5, y: 0.18 }, { x: 0.5, y: 0.38 }, { x: 0.5, y: 0.58 }, { x: 0.5, y: 0.78 }]
      : isCession
        ? [{ x: 0.5, y: 0.78 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.22 }]
        : [{ x: 0.5, y: 0.22 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.78 }]
    : [];
  const repeatedSize = showRepeated
    ? watermarkType === "image"
      ? estimatePreviewWatermarkImageSize(watermarkBounds, false)
      : estimatePreviewWatermarkTextSize({
          text: watermarkText || "",
          bounds: watermarkBounds,
          centerX: watermarkBounds.left + watermarkBounds.width * 0.5,
          templateType,
          isHorizontal: rotationDisabled,
          hasCustomPos: false,
        }) * 0.55
    : 0;
  const watermarkSize = watermarkType === "image"
    ? estimatePreviewWatermarkImageSize(watermarkBounds, true)
    : estimatePreviewWatermarkTextSize({
        text: watermarkText || "",
        bounds: watermarkBounds,
        centerX: previewCenterX,
        templateType,
        isHorizontal: rotationDisabled,
        hasCustomPos: true,
      });

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number, mode: "move" | "rotate") => {
      const el = pageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      if (mode === "move") {
        const x = ((clientX - rect.left - watermarkBounds.left) / watermarkBounds.width) * 100;
        const y = ((clientY - rect.top - watermarkBounds.top) / watermarkBounds.height) * 100;
        onChange({
          positionX: Math.max(0, Math.min(100, x)),
          positionY: Math.max(0, Math.min(100, y)),
          rotation,
        });
      } else {
        // rotate around current watermark center
        const centerX = rect.left + watermarkBounds.left + (positionX / 100) * watermarkBounds.width;
        const centerY = rect.top + watermarkBounds.top + (positionY / 100) * watermarkBounds.height;
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
    [onChange, positionX, positionY, rotation, watermarkBounds]
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
    if (isInteractionDisabled) return;
    // Only react to direct page clicks (background), not the watermark handle
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.role === "page-bg") {
      updateFromPointer(e.clientX, e.clientY, "move");
    }
  };

  const handleReset = () => {
    onChange({ positionX: 50, positionY: 50, rotation: templateType === "cession" ? -34 : -45 });
  };

  // Rotate handle position: 60px from center along current rotation
  const rotateHandleAngle = (effectiveRotation - 90) * (Math.PI / 180);
  const handleOffsetX = Math.cos(rotateHandleAngle) * 50;
  const handleOffsetY = Math.sin(rotateHandleAngle) * 50;

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
          disabled={isInteractionDisabled}
          className="h-7 text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Réinitialiser
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Le repère suit maintenant la même zone utile que sur l'attestation générée.
      </p>

      <div className="flex flex-col items-center gap-3">
        {/* Mini A4 page (ratio 1:1.414) */}
        <div
          ref={pageRef}
          onPointerDown={handlePageClick}
          data-role="page-bg"
          className={`relative bg-white border-2 border-border rounded-md shadow-sm select-none ${
            isInteractionDisabled ? "opacity-50 pointer-events-none" : "cursor-crosshair"
          }`}
          style={{ width: pageWidth, height: pageHeight /* ~A4 ratio */ }}
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
          <div
            className="absolute pointer-events-none rounded-sm border border-dashed border-border/70 bg-primary/5"
            style={{
              left: watermarkBounds.left,
              top: watermarkBounds.top,
              width: watermarkBounds.width,
              height: watermarkBounds.height,
            }}
          >
            <span className="absolute left-1.5 top-1 text-[9px] uppercase tracking-wide text-muted-foreground">
              Zone PDF
            </span>
          </div>

          {/* Watermark visual */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: previewCenterX,
              top: previewCenterY,
              transform: `translate(-50%, -50%) rotate(${effectiveRotation}deg)`,
              transformOrigin: "center",
            }}
          >
            {watermarkType === "text" && watermarkText?.trim() && (
              <span
                className="font-bold whitespace-nowrap text-primary"
                style={{
                  fontSize: watermarkSize,
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
                left: previewCenterX,
                top: previewCenterY,
                zIndex: 10,
              }}
              aria-label="Déplacer le filigrane"
            >
              <Move className="h-3 w-3 text-primary-foreground" />
            </button>
          )}

          {/* Rotation handle */}
          {watermarkType !== "none" && !rotationDisabled && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDraggingMode("rotate");
              }}
              className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent border-2 border-white shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform flex items-center justify-center"
              style={{
                left: previewCenterX + handleOffsetX,
                top: previewCenterY + handleOffsetY,
                zIndex: 11,
              }}
              aria-label="Faire pivoter le filigrane"
            >
              <RotateCw className="h-2.5 w-2.5 text-accent-foreground" />
            </button>
          )}

          {/* Connection line between center and rotate handle */}
          {watermarkType !== "none" && !rotationDisabled && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width="100%"
              height="100%"
              style={{ zIndex: 9 }}
            >
              <line
                x1={previewCenterX}
                y1={previewCenterY}
                x2={previewCenterX + handleOffsetX}
                y2={previewCenterY + handleOffsetY}
                stroke="hsl(var(--accent))"
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
            <div className="text-xs font-mono font-semibold">{Math.round(effectiveRotation)}°</div>
          </div>
        </div>
      </div>
    </div>
  );
}
