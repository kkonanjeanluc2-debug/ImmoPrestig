import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Undo2 } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
}

export function SignaturePad({ 
  onSignatureChange, 
  width = 400, 
  height = 200 
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const saveToHistory = useCallback(() => {
    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(-10), imageData]);
  }, [getContext]);

  const initCanvas = useCallback(() => {
    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    // Fond blanc
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Style du trait
    ctx.strokeStyle = "#1a365d";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [getContext]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    saveToHistory();
    setIsDrawing(true);
    
    const ctx = getContext();
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const ctx = getContext();
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setHasSignature(true);
      
      const canvas = canvasRef.current;
      if (canvas) {
        onSignatureChange(canvas.toDataURL("image/png"));
      }
    }
  };

  const handleClear = () => {
    initCanvas();
    setHasSignature(false);
    setHistory([]);
    onSignatureChange(null);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    
    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(prev => prev.slice(0, -1));
    
    // Vérifier si le canvas est vide
    const isEmpty = isCanvasEmpty(ctx, canvas);
    setHasSignature(!isEmpty);
    onSignatureChange(isEmpty ? null : canvas.toDataURL("image/png"));
  };

  const isCanvasEmpty = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Vérifier si le pixel n'est pas blanc
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
        return false;
      }
    }
    return true;
  };

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-muted-foreground/50 text-sm">
              Signez ici avec la souris ou le doigt
            </span>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={history.length === 0}
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Annuler
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={!hasSignature}
        >
          <Eraser className="h-4 w-4 mr-1" />
          Effacer
        </Button>
      </div>
    </div>
  );
}
