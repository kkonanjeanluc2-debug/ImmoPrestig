import { MapPin, Bed, Bath, Maximize, Pencil, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Property } from "@/hooks/useProperties";
import { useNavigate } from "react-router-dom";
import { AssignmentBadge } from "@/components/assignment/AssignUserSelect";

interface PropertyCardProps {
  property: Property;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function PropertyCard({
  property,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}: PropertyCardProps) {
  const navigate = useNavigate();
  const { 
    image_url, 
    title, 
    address, 
    price, 
    type, 
    property_type: propertyType, 
    bedrooms, 
    bathrooms, 
    area, 
    status 
  } = property;
  const assignedTo = (property as any).assigned_to;

  const image = image_url || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80";

  const statusClasses: Record<string, string> = {
    disponible: "bg-emerald/10 text-emerald border-emerald/20",
    occupé: "bg-navy/10 text-navy border-navy/20",
    "en attente": "bg-sand text-navy border-sand-dark/20",
  };

  const typeLabels: Record<string, string> = {
    maison: "Maison",
    appartement: "Appartement",
    terrain: "Terrain",
  };

  const handleCardClick = () => {
    navigate(`/properties/${property.id}`);
  };

  return (
    <div 
      className="group bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50 animate-fade-in cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm text-foreground font-medium">
            {typeLabels[propertyType] || propertyType}
          </Badge>
          <Badge className={cn("border backdrop-blur-sm", statusClasses[status] || "")}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="bg-navy text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold">
            {type === "location" 
              ? `${price.toLocaleString('fr-FR')} F CFA/mois`
              : `${price.toLocaleString('fr-FR')} F CFA`
            }
          </span>
        </div>
        {/* Action buttons on hover */}
        {(canEdit || canDelete) && (
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-card/90 backdrop-blur-sm hover:bg-card"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(property);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(property);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-navy transition-colors">
              {title}
            </h3>
            {assignedTo && <AssignmentBadge userId={assignedTo} />}
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4" />
            {address}
          </p>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 pt-3 border-t border-border">
          {bedrooms !== undefined && bedrooms !== null && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Bed className="h-4 w-4" />
              <span>{bedrooms}</span>
            </div>
          )}
          {bathrooms !== undefined && bathrooms !== null && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Bath className="h-4 w-4" />
              <span>{bathrooms}</span>
            </div>
          )}
          {area && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Maximize className="h-4 w-4" />
              <span>{area} m²</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
