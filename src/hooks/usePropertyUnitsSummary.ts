import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PropertyUnitsSummary {
  property_id: string;
  total_units: number;
  available_units: number;
  occupied_units: number;
}

export const usePropertyUnitsSummary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property-units-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_units")
        .select("property_id, status");

      if (error) throw error;

      // Group by property_id and count
      const summaryMap = new Map<string, PropertyUnitsSummary>();
      
      for (const unit of data) {
        const existing = summaryMap.get(unit.property_id) || {
          property_id: unit.property_id,
          total_units: 0,
          available_units: 0,
          occupied_units: 0,
        };
        
        existing.total_units++;
        if (unit.status === "disponible") {
          existing.available_units++;
        } else if (unit.status === "occupé") {
          existing.occupied_units++;
        }
        
        summaryMap.set(unit.property_id, existing);
      }

      return Object.fromEntries(summaryMap) as Record<string, PropertyUnitsSummary>;
    },
    enabled: !!user,
  });
};
