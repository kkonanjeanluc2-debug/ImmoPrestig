import { type ReceiptTemplate } from "@/hooks/useReceiptTemplates";
import { Droplets, Type, ImageIcon, Building2 } from "lucide-react";

interface WatermarkThumbnailProps {
  template: ReceiptTemplate;
  agencyLogoUrl?: string | null;
}

export function WatermarkThumbnail({ template, agencyLogoUrl }: WatermarkThumbnailProps) {
  if (!template.watermark_enabled) {
    return null;
  }

  const opacity = template.watermark_opacity / 100;
  const position = template.watermark_position;

  const getPositionClasses = () => {
    switch (position) {
      case "bottom-right":
        return "items-end justify-end pb-1 pr-1";
      case "center":
        return "items-center justify-center";
      case "diagonal":
      default:
        return "items-center justify-center";
    }
  };

  const renderWatermarkContent = () => {
    if (template.watermark_type === "text" && template.watermark_text) {
      // Text watermark
      if (position === "diagonal") {
        return (
          <div className="grid grid-cols-2 gap-1 w-full h-full p-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-center text-[6px] font-bold text-foreground/40 transform -rotate-45 truncate"
                style={{ opacity }}
              >
                {template.watermark_text}
              </div>
            ))}
          </div>
        );
      }
      return (
        <span
          className="text-[8px] font-bold text-foreground/60 truncate max-w-full px-1"
          style={{ opacity }}
        >
          {template.watermark_text}
        </span>
      );
    }

    if (template.watermark_type === "image" && template.watermark_image_url) {
      // Custom image watermark
      if (position === "diagonal") {
        return (
          <div className="grid grid-cols-2 gap-1 w-full h-full p-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-center">
                <img
                  src={template.watermark_image_url!}
                  alt="Filigrane"
                  className="w-4 h-4 object-contain transform -rotate-45"
                  style={{ opacity }}
                />
              </div>
            ))}
          </div>
        );
      }
      return (
        <img
          src={template.watermark_image_url}
          alt="Filigrane"
          className="w-8 h-8 object-contain"
          style={{ opacity }}
        />
      );
    }

    if (template.watermark_type === "agency_logo" && agencyLogoUrl) {
      // Agency logo watermark
      if (position === "diagonal") {
        return (
          <div className="grid grid-cols-2 gap-1 w-full h-full p-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-center">
                <img
                  src={agencyLogoUrl}
                  alt="Logo agence"
                  className="w-4 h-4 object-contain transform -rotate-45"
                  style={{ opacity }}
                />
              </div>
            ))}
          </div>
        );
      }
      return (
        <img
          src={agencyLogoUrl}
          alt="Logo agence"
          className="w-8 h-8 object-contain"
          style={{ opacity }}
        />
      );
    }

    // Fallback icon
    return (
      <Droplets className="h-4 w-4 text-muted-foreground" style={{ opacity: 0.3 }} />
    );
  };

  const getWatermarkIcon = () => {
    if (template.watermark_type === "text") return <Type className="h-3 w-3" />;
    if (template.watermark_type === "image") return <ImageIcon className="h-3 w-3" />;
    if (template.watermark_type === "agency_logo") return <Building2 className="h-3 w-3" />;
    return <Droplets className="h-3 w-3" />;
  };

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        {getWatermarkIcon()}
        <span>Aperçu filigrane</span>
      </div>
      <div
        className={`
          relative w-full h-16 rounded-md border border-border bg-muted/30 
          flex overflow-hidden ${getPositionClasses()}
        `}
      >
        {/* Document lines simulation */}
        <div className="absolute inset-0 p-2 pointer-events-none">
          <div className="w-3/4 h-1 bg-muted-foreground/10 rounded mb-1.5" />
          <div className="w-full h-1 bg-muted-foreground/10 rounded mb-1" />
          <div className="w-full h-1 bg-muted-foreground/10 rounded mb-1" />
          <div className="w-2/3 h-1 bg-muted-foreground/10 rounded mb-2" />
          <div className="w-1/2 h-2 bg-primary/10 rounded" />
        </div>
        
        {/* Watermark overlay */}
        <div className={`absolute inset-0 flex ${getPositionClasses()} pointer-events-none`}>
          {renderWatermarkContent()}
        </div>
      </div>
    </div>
  );
}
