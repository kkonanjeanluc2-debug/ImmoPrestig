import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ParcelleStats {
  total: number;
  disponibles: number;
  vendues: number;
  reservees: number;
  revenue: number;
}

export const useParcellesStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["parcelles-stats-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelles")
        .select("lotissement_id, status, price")
        .is("deleted_at", null);

      if (error) throw error;

      const statsMap = new Map<string, ParcelleStats>();
      let globalTotal = 0;
      let globalDisponibles = 0;
      let globalVendues = 0;
      let globalReservees = 0;
      let globalRevenue = 0;

      // Paginate if needed - fetch all rows
      let allData = data || [];
      
      // If we hit the 1000 limit, fetch remaining
      if (allData.length === 1000) {
        let offset = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data: moreData, error: moreError } = await supabase
            .from("parcelles")
            .select("lotissement_id, status, price")
            .is("deleted_at", null)
            .range(offset, offset + 999);
          
          if (moreError) throw moreError;
          if (moreData && moreData.length > 0) {
            allData = [...allData, ...moreData];
            offset += moreData.length;
            if (moreData.length < 1000) hasMore = false;
          } else {
            hasMore = false;
          }
        }
      }

      for (const row of allData) {
        const existing = statsMap.get(row.lotissement_id) || {
          total: 0,
          disponibles: 0,
          vendues: 0,
          reservees: 0,
          revenue: 0,
        };

        existing.total++;
        globalTotal++;

        if (row.status === "disponible") {
          existing.disponibles++;
          globalDisponibles++;
        } else if (row.status === "vendu") {
          existing.vendues++;
          globalVendues++;
          existing.revenue += row.price || 0;
          globalRevenue += row.price || 0;
        } else if (row.status === "reserve") {
          existing.reservees++;
          globalReservees++;
        }

        statsMap.set(row.lotissement_id, existing);
      }

      return {
        byLotissement: Object.fromEntries(statsMap) as Record<string, ParcelleStats>,
        global: {
          total: globalTotal,
          disponibles: globalDisponibles,
          vendues: globalVendues,
          reservees: globalReservees,
          revenue: globalRevenue,
        } as ParcelleStats,
      };
    },
    enabled: !!user,
  });
};
