import { Button } from "@/components/ui/button";
import { Calendar, Settings2, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PeriodFilter, WidgetId, WIDGET_LABELS } from "@/hooks/useDashboardPreferences";

interface DashboardFiltersProps {
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  visibleWidgets: WidgetId[];
  onToggleWidget: (widgetId: WidgetId) => void;
  onReset: () => void;
}

export function DashboardFilters({
  period,
  onPeriodChange,
  visibleWidgets,
  onToggleWidget,
  onReset,
}: DashboardFiltersProps) {
  const allWidgets = Object.keys(WIDGET_LABELS) as WidgetId[];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period Filter */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={period} onValueChange={(value) => onPeriodChange(value as PeriodFilter)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="quarter">Ce trimestre</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Widget Visibility */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Personnaliser
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Afficher les widgets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allWidgets.map((widgetId) => (
            <DropdownMenuCheckboxItem
              key={widgetId}
              checked={visibleWidgets.includes(widgetId)}
              onCheckedChange={() => onToggleWidget(widgetId)}
            >
              {WIDGET_LABELS[widgetId]}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem onClick={onReset} className="text-muted-foreground">
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
