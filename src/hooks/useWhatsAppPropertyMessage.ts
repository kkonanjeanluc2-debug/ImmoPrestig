import { useAgency } from "@/hooks/useAgency";
import { Property } from "@/hooks/useProperties";

const DEFAULT_TEMPLATE = `🏠 *{transactionType} - {propertyType}*

📍 *{title}*
{address}

💰 Prix: {price}
{features}
{description}
📞 Contactez-nous pour plus d'informations !`;

interface PropertyData {
  title: string;
  address: string;
  price: number;
  type: string;
  property_type: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  description?: string | null;
}

export function useWhatsAppPropertyMessage() {
  const { data: agency } = useAgency();
  
  const generateMessage = (property: PropertyData): string => {
    const template = agency?.whatsapp_property_template || DEFAULT_TEMPLATE;
    
    const typeLabels: Record<string, string> = {
      maison: "Maison",
      appartement: "Appartement",
      terrain: "Terrain",
    };
    
    const transactionType = property.type === "location" ? "À louer" : "À vendre";
    const priceText = property.type === "location" 
      ? `${property.price.toLocaleString('fr-FR')} F CFA/mois`
      : `${property.price.toLocaleString('fr-FR')} F CFA`;
    
    // Build features string
    const features: string[] = [];
    if (property.area) features.push(`📐 ${property.area} m²`);
    if (property.bedrooms) features.push(`🛏️ ${property.bedrooms} chambre${property.bedrooms > 1 ? 's' : ''}`);
    if (property.bathrooms) features.push(`🚿 ${property.bathrooms} salle${property.bathrooms > 1 ? 's' : ''} de bain`);
    const featuresText = features.length > 0 ? features.join(' | ') : '';
    
    // Build description
    const descriptionText = property.description 
      ? `\n📝 ${property.description.substring(0, 200)}${property.description.length > 200 ? '...' : ''}`
      : '';
    
    // Replace all variables
    let message = template
      .replace(/{transactionType}/g, transactionType)
      .replace(/{propertyType}/g, typeLabels[property.property_type] || property.property_type)
      .replace(/{title}/g, property.title)
      .replace(/{address}/g, property.address)
      .replace(/{price}/g, priceText)
      .replace(/{features}/g, featuresText)
      .replace(/{description}/g, descriptionText)
      .replace(/{agencyName}/g, agency?.name || '')
      .replace(/{agencyPhone}/g, agency?.phone || '');
    
    // Clean up empty lines from unused variables
    message = message.replace(/\n{3,}/g, '\n\n');
    
    return message.trim();
  };
  
  return { generateMessage };
}
