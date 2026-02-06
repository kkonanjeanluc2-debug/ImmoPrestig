import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface DateRangeFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateRangeChange(undefined);
  };

  const hasDateRange = dateRange?.from || dateRange?.to;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-start text-left font-normal w-full sm:w-auto",
            !hasDateRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "dd/MM/yy", { locale: fr })} -{" "}
                {format(dateRange.to, "dd/MM/yy", { locale: fr })}
              </>
            ) : (
              format(dateRange.from, "dd MMM yyyy", { locale: fr })
            )
          ) : (
            <span>Période</span>
          )}
          {hasDateRange && (
            <X
              className="ml-2 h-4 w-4 hover:text-destructive"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
          locale={fr}
        />
        <div className="flex items-center justify-between p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDateRangeChange(undefined)}
          >
            Effacer
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Appliquer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
