import { MapPin, Bed, Bath, Maximize } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  image: string;
  title: string;
  address: string;
  price: number;
  type: "location" | "vente";
  propertyType: "maison" | "appartement" | "terrain";
  bedrooms?: number;
  bathrooms?: number;
  area: number;
  status: "disponible" | "occupé" | "en attente";
}

export function PropertyCard({
  image,
  title,
  address,
  price,
  type,
  propertyType,
  bedrooms,
  bathrooms,
  area,
  status,
}: PropertyCardProps) {
  const statusClasses = {
    disponible: "bg-emerald/10 text-emerald border-emerald/20",
    occupé: "bg-navy/10 text-navy border-navy/20",
    "en attente": "bg-sand text-navy border-sand-dark/20",
  };

  const typeLabels = {
    maison: "Maison",
    appartement: "Appartement",
    terrain: "Terrain",
  };

  return (
    <div className="group bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50 animate-fade-in">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm text-foreground font-medium">
            {typeLabels[propertyType]}
          </Badge>
          <Badge className={cn("border backdrop-blur-sm", statusClasses[status])}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="bg-navy text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold">
            {type === "location" 
              ? `${price.toLocaleString('fr-FR')} €/mois`
              : `${price.toLocaleString('fr-FR')} €`
            }
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-navy transition-colors">
            {title}
          </h3>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4" />
            {address}
          </p>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 pt-3 border-t border-border">
          {bedrooms !== undefined && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Bed className="h-4 w-4" />
              <span>{bedrooms}</span>
            </div>
          )}
          {bathrooms !== undefined && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Bath className="h-4 w-4" />
              <span>{bathrooms}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Maximize className="h-4 w-4" />
            <span>{area} m²</span>
          </div>
        </div>
      </div>
    </div>
  );
}
