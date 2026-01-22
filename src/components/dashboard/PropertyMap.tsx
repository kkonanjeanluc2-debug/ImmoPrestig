import { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Home, Building2, LandPlot, Pencil, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Validation schema for coordinates
const coordinatesSchema = z.object({
  latitude: z.number()
    .min(-90, "La latitude doit être entre -90 et 90")
    .max(90, "La latitude doit être entre -90 et 90"),
  longitude: z.number()
    .min(-180, "La longitude doit être entre -180 et 180")
    .max(180, "La longitude doit être entre -180 et 180"),
});

interface Property {
  id: string;
  title: string;
  address: string;
  price: number | string;
  status: string;
  property_type: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface PropertyMapProps {
  properties: Property[];
  onCoordinatesUpdated?: () => void;
}

// Custom marker icons based on status
const createCustomIcon = (status: string) => {
  const color = status === "occupé" ? "#10b981" : status === "disponible" ? "#3b82f6" : "#f59e0b";
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <svg style="transform: rotate(45deg); width: 14px; height: 14px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Geocode addresses using Nominatim (free, no API key)
const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          "User-Agent": "ImmoGest/1.0",
        },
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
  return null;
};

// Save coordinates to database
const saveCoordinates = async (propertyId: string, lat: number, lng: number) => {
  const { error } = await supabase
    .from("properties")
    .update({ latitude: lat, longitude: lng })
    .eq("id", propertyId);
  
  if (error) throw error;
};

// Component to fit map bounds to markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [map, positions]);
  
  return null;
}

const PropertyTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "maison":
      return <Home className="h-4 w-4" />;
    case "appartement":
      return <Building2 className="h-4 w-4" />;
    case "terrain":
      return <LandPlot className="h-4 w-4" />;
    default:
      return <MapPin className="h-4 w-4" />;
  }
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  "occupé": { label: "Occupé", variant: "default" },
  "disponible": { label: "Disponible", variant: "secondary" },
  "en attente": { label: "En attente", variant: "outline" },
};

// Popup content component with edit functionality
interface PropertyPopupProps {
  property: Property & { lat: number; lng: number };
  onUpdate: (id: string, lat: number, lng: number) => void;
}

function PropertyPopup({ property, onUpdate }: PropertyPopupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [latitude, setLatitude] = useState(property.lat.toString());
  const [longitude, setLongitude] = useState(property.lng.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSave = async () => {
    setError(null);
    
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    // Validate inputs
    const result = coordinatesSchema.safeParse({ latitude: latNum, longitude: lngNum });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsSaving(true);
    try {
      await saveCoordinates(property.id, latNum, lngNum);
      onUpdate(property.id, latNum, lngNum);
      setIsEditing(false);
      toast({
        title: "Coordonnées mises à jour",
        description: "La position du bien a été corrigée.",
      });
    } catch (err: any) {
      setError("Erreur lors de la sauvegarde");
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les coordonnées.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLatitude(property.lat.toString());
    setLongitude(property.lng.toString());
    setError(null);
    setIsEditing(false);
  };

  return (
    <div className="min-w-[220px] p-1">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <PropertyTypeIcon type={property.property_type} />
          <h3 className="font-semibold text-sm">{property.title}</h3>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Modifier les coordonnées"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground mb-2">{property.address}</p>
      
      {isEditing ? (
        <div className="space-y-3 pt-2 border-t">
          <div className="space-y-1.5">
            <Label htmlFor={`lat-${property.id}`} className="text-xs">
              Latitude
            </Label>
            <Input
              id={`lat-${property.id}`}
              type="number"
              step="0.0000001"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="h-8 text-xs"
              placeholder="-90 à 90"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`lng-${property.id}`} className="text-xs">
              Longitude
            </Label>
            <Input
              id={`lng-${property.id}`}
              type="number"
              step="0.0000001"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="h-8 text-xs"
              placeholder="-180 à 180"
            />
          </div>
          
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 text-xs flex-1"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Enregistrer
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-7 text-xs"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-primary">
              {Number(property.price).toLocaleString("fr-FR")} F CFA
            </span>
            <Badge variant={statusConfig[property.status]?.variant || "outline"}>
              {statusConfig[property.status]?.label || property.status}
            </Badge>
          </div>
          <div className="text-[10px] text-muted-foreground border-t pt-2">
            <span>GPS: {property.lat.toFixed(6)}, {property.lng.toFixed(6)}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function PropertyMap({ properties, onCoordinatesUpdated }: PropertyMapProps) {
  const { toast } = useToast();
  const [geocodedProperties, setGeocodedProperties] = useState<
    (Property & { lat: number; lng: number })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  useEffect(() => {
    const geocodeProperties = async () => {
      setIsLoading(true);
      const results: (Property & { lat: number; lng: number })[] = [];
      let coordinatesUpdated = false;

      for (const property of properties) {
        // Check if already has coordinates in database
        if (property.latitude && property.longitude) {
          results.push({
            ...property,
            lat: Number(property.latitude),
            lng: Number(property.longitude),
          });
          continue;
        }

        // Check cache
        const cached = geocodeCacheRef.current.get(property.address);
        if (cached) {
          results.push({ ...property, ...cached });
          // Save to database if not already saved
          await saveCoordinates(property.id, cached.lat, cached.lng);
          coordinatesUpdated = true;
          continue;
        }

        // Geocode the address (with delay to respect rate limits)
        const coords = await geocodeAddress(property.address);
        if (coords) {
          geocodeCacheRef.current.set(property.address, coords);
          results.push({ ...property, ...coords });
          // Save coordinates to database
          await saveCoordinates(property.id, coords.lat, coords.lng);
          coordinatesUpdated = true;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      setGeocodedProperties(results);
      setIsLoading(false);
      
      // Notify parent if coordinates were updated
      if (coordinatesUpdated && onCoordinatesUpdated) {
        onCoordinatesUpdated();
      }
    };

    if (properties.length > 0) {
      geocodeProperties();
    } else {
      setGeocodedProperties([]);
      setIsLoading(false);
    }
  }, [properties, onCoordinatesUpdated]);

  const handleCoordinatesUpdate = useCallback((propertyId: string, lat: number, lng: number) => {
    setGeocodedProperties((prev) =>
      prev.map((p) =>
        p.id === propertyId ? { ...p, lat, lng } : p
      )
    );
    if (onCoordinatesUpdated) {
      onCoordinatesUpdated();
    }
  }, [onCoordinatesUpdated]);

  // Default center (Senegal - Dakar as example)
  const defaultCenter: [number, number] = [14.6928, -17.4467];
  const positions: [number, number][] = geocodedProperties.map((p) => [p.lat, p.lng]);

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Carte des biens</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {geocodedProperties.length} bien(s) localisé(s) sur {properties.length}
              {geocodedProperties.length > 0 && " • Cliquez sur un marqueur pour modifier"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-emerald" />
              <span>Occupé</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span>En attente</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Géolocalisation des adresses...</p>
            </div>
          </div>
        ) : geocodedProperties.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center bg-muted/50 rounded-lg">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">Aucun bien à afficher sur la carte</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ajoutez des biens avec des adresses valides
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[400px] rounded-lg overflow-hidden border border-border">
            <MapContainer
              center={positions.length > 0 ? positions[0] : defaultCenter}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {positions.length > 1 && <FitBounds positions={positions} />}
              {geocodedProperties.map((property) => (
                <Marker
                  key={property.id}
                  position={[property.lat, property.lng]}
                  icon={createCustomIcon(property.status)}
                >
                  <Popup>
                    <PropertyPopup
                      property={property}
                      onUpdate={handleCoordinatesUpdate}
                    />
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
