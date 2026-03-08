import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Navigation, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface GpsPositionInputProps {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
}

export function GpsPositionInput({ latitude, longitude, onChange }: GpsPositionInputProps) {
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(String(position.coords.latitude), String(position.coords.longitude));
        setGettingLocation(false);
        toast.success("Position GPS capturée");
      },
      () => {
        setGettingLocation(false);
        toast.error("Impossible d'obtenir la position GPS");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openGoogleMaps = () => {
    if (latitude && longitude) {
      window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, "_blank");
    } else {
      // Open Google Maps to pick a location - user can copy coords
      window.open("https://www.google.com/maps", "_blank");
    }
  };

  const hasCoords = latitude && longitude;

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Position GPS
      </Label>
      <div className="flex gap-2">
        <Input
          type="number"
          step="any"
          placeholder="Latitude"
          value={latitude}
          onChange={(e) => onChange(e.target.value, longitude)}
          className="flex-1"
        />
        <Input
          type="number"
          step="any"
          placeholder="Longitude"
          value={longitude}
          onChange={(e) => onChange(latitude, e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleGetLocation}
          disabled={gettingLocation}
          title="Capturer ma position"
        >
          {gettingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={openGoogleMaps}
          title={hasCoords ? "Voir sur Google Maps" : "Ouvrir Google Maps"}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Capturez votre position ou ouvrez Google Maps pour choisir un emplacement
      </p>
      {hasCoords && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Navigation className="h-3 w-3" />
          Suivre l'itinéraire
        </a>
      )}
    </div>
  );
}
