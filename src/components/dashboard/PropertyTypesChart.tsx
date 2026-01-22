import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { Home } from "lucide-react";

interface PropertyTypesChartProps {
  properties: Array<{
    property_type: string;
  }>;
}

const typeLabels: Record<string, string> = {
  maison: "Maisons",
  appartement: "Appartements",
  terrain: "Terrains",
};

const typeColors: Record<string, string> = {
  maison: "hsl(var(--primary))",
  appartement: "hsl(142 76% 36%)", // emerald
  terrain: "hsl(45 93% 47%)", // sand
};

const chartConfig = {
  maison: {
    label: "Maisons",
    color: "hsl(var(--primary))",
  },
  appartement: {
    label: "Appartements",
    color: "hsl(142 76% 36%)",
  },
  terrain: {
    label: "Terrains",
    color: "hsl(45 93% 47%)",
  },
};

export function PropertyTypesChart({ properties }: PropertyTypesChartProps) {
  const getTypeData = () => {
    const counts: Record<string, number> = {};

    properties.forEach((property) => {
      const type = property.property_type || "autre";
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts).map(([type, count]) => ({
      name: typeLabels[type] || type,
      value: count,
      type,
      color: typeColors[type] || "hsl(var(--muted))",
    }));
  };

  const data = getTypeData();
  const total = properties.length;

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Types de biens</CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold text-foreground">{total}</p>
        <p className="text-xs text-muted-foreground">
          {total > 1 ? "biens au total" : "bien au total"}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Aucun bien enregistré
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, props) => [
                        `${value} bien${Number(value) > 1 ? "s" : ""}`,
                        props.payload.name,
                      ]}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Legend */}
        {data.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
            {data.map((entry) => (
              <div key={entry.type} className="flex items-center gap-1.5 text-xs">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">
                  {entry.name} ({entry.value})
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
