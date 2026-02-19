import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import { Building2 } from "lucide-react";
import { usePropertyUnitsSummary } from "@/hooks/usePropertyUnitsSummary";

interface OccupancyChartProps {
  properties: Array<{
    id?: string;
    status: string;
    property_type: string;
  }>;
}

const chartConfig = {
  occupied: {
    label: "Loués",
    color: "hsl(var(--primary))",
  },
  available: {
    label: "Disponibles",
    color: "hsl(var(--muted))",
  },
};

export function OccupancyChart({ properties }: OccupancyChartProps) {
  const { data: unitsSummary } = usePropertyUnitsSummary();

  // Group properties by type, counting units for multi-unit properties
  const getOccupancyData = () => {
    const types: Record<string, { total: number; occupied: number }> = {
      maison: { total: 0, occupied: 0 },
      appartement: { total: 0, occupied: 0 },
      terrain: { total: 0, occupied: 0 },
    };

    properties.forEach((property) => {
      const type = property.property_type || "autre";
      if (!types[type]) {
        types[type] = { total: 0, occupied: 0 };
      }

      const summary = property.id && unitsSummary ? unitsSummary[property.id] : null;

      if (summary && summary.total_units > 0) {
        // Multi-unit property: count each unit
        types[type].total += summary.total_units;
        types[type].occupied += summary.occupied_units;
      } else {
        // Single property without units
        types[type].total++;
        if (property.status === "loué") {
          types[type].occupied++;
        }
      }
    });

    const typeLabels: Record<string, string> = {
      maison: "Maisons",
      appartement: "Apparts",
      terrain: "Terrains",
    };

    return Object.entries(types)
      .filter(([, data]) => data.total > 0)
      .map(([type, data]) => ({
        name: typeLabels[type] || type,
        occupancy: data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0,
        occupied: data.occupied,
        total: data.total,
      }));
  };

  const data = getOccupancyData();

  // Calculate global stats with units
  let totalCount = 0;
  let occupiedCount = 0;
  properties.forEach((property) => {
    const summary = property.id && unitsSummary ? unitsSummary[property.id] : null;
    if (summary && summary.total_units > 0) {
      totalCount += summary.total_units;
      occupiedCount += summary.occupied_units;
    } else {
      totalCount++;
      if (property.status === "loué") {
        occupiedCount++;
      }
    }
  });

  const globalRate = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

  const getBarColor = (rate: number) => {
    if (rate >= 80) return "hsl(var(--emerald, 142 76% 36%))";
    if (rate >= 50) return "hsl(var(--primary))";
    return "hsl(var(--sand-dark, 45 93% 47%))";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Taux d'occupation</CardTitle>
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground">{globalRate}%</p>
        <p className="text-xs text-muted-foreground">
          {occupiedCount} sur {totalCount} unité{totalCount > 1 ? "s" : ""} louée{occupiedCount > 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Aucun bien enregistré
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                width={70}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, props) => [
                      `${props.payload.occupied}/${props.payload.total} (${value}%)`,
                      "Occupation",
                    ]}
                  />
                }
              />
              <Bar dataKey="occupancy" radius={[0, 4, 4, 0]} barSize={24}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.occupancy)} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-emerald" />
            <span>≥80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-primary" />
            <span>50-79%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-sand-dark" />
            <span>&lt;50%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
