import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Home, Building2, LandPlot } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
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

export function PropertyMap({ properties }: PropertyMapProps) {
  const [geocodedProperties, setGeocodedProperties] = useState<
    (Property & { lat: number; lng: number })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  useEffect(() => {
    const geocodeProperties = async () => {
      setIsLoading(true);
      const results: (Property & { lat: number; lng: number })[] = [];

      for (const property of properties) {
        // Check if already has coordinates
        if (property.latitude && property.longitude) {
          results.push({
            ...property,
            lat: property.latitude,
            lng: property.longitude,
          });
          continue;
        }

        // Check cache
        const cached = geocodeCacheRef.current.get(property.address);
        if (cached) {
          results.push({ ...property, ...cached });
          continue;
        }

        // Geocode the address (with delay to respect rate limits)
        const coords = await geocodeAddress(property.address);
        if (coords) {
          geocodeCacheRef.current.set(property.address, coords);
          results.push({ ...property, ...coords });
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      setGeocodedProperties(results);
      setIsLoading(false);
    };

    if (properties.length > 0) {
      geocodeProperties();
    } else {
      setIsLoading(false);
    }
  }, [properties]);

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
                    <div className="min-w-[200px] p-1">
                      <div className="flex items-center gap-2 mb-2">
                        <PropertyTypeIcon type={property.property_type} />
                        <h3 className="font-semibold text-sm">{property.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{property.address}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">
                          {Number(property.price).toLocaleString("fr-FR")} F CFA
                        </span>
                        <Badge variant={statusConfig[property.status]?.variant || "outline"}>
                          {statusConfig[property.status]?.label || property.status}
                        </Badge>
                      </div>
                    </div>
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
