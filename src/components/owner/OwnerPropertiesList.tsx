import { Property } from "@/hooks/useProperties";
import { Badge } from "@/components/ui/badge";
import { Home, Building, MapPin, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OwnerPropertiesListProps {
  properties: Property[];
  maxDisplay?: number;
}

export const OwnerPropertiesList = ({ properties, maxDisplay = 3 }: OwnerPropertiesListProps) => {
  const navigate = useNavigate();

  if (properties.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">Aucun bien associé</p>
    );
  }

  const displayedProperties = properties.slice(0, maxDisplay);
  const remainingCount = properties.length - maxDisplay;

  const typeIcons: Record<string, React.ReactNode> = {
    maison: <Home className="h-3 w-3" />,
    appartement: <Building className="h-3 w-3" />,
    terrain: <MapPin className="h-3 w-3" />,
  };

  return (
    <div className="space-y-2">
      {displayedProperties.map((property) => (
        <div
          key={property.id}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/properties/${property.id}`);
          }}
          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors group"
        >
          {property.image_url ? (
            <img
              src={property.image_url}
              alt={property.title}
              className="h-8 w-8 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
              {typeIcons[property.property_type] || <Building className="h-3 w-3 text-primary" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{property.title}</p>
            <p className="text-[10px] text-muted-foreground truncate">{property.address}</p>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
            {property.type === "location" 
              ? `${(property.price / 1000).toFixed(0)}k/mois` 
              : `${(property.price / 1000000).toFixed(1)}M`}
          </Badge>
          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ))}
      {remainingCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/properties");
          }}
          className="text-xs text-primary hover:underline w-full text-left pl-2"
        >
          + {remainingCount} autre{remainingCount > 1 ? "s" : ""} bien{remainingCount > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
};
