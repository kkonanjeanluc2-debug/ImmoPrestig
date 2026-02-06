import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthFilterProps {
  selectedMonth: { month: number; year: number } | undefined;
  onMonthChange: (value: { month: number; year: number } | undefined) => void;
}

const MONTHS = [
  { value: 0, label: "Janvier" },
  { value: 1, label: "Février" },
  { value: 2, label: "Mars" },
  { value: 3, label: "Avril" },
  { value: 4, label: "Mai" },
  { value: 5, label: "Juin" },
  { value: 6, label: "Juillet" },
  { value: 7, label: "Août" },
  { value: 8, label: "Septembre" },
  { value: 9, label: "Octobre" },
  { value: 10, label: "Novembre" },
  { value: 11, label: "Décembre" },
];

export function MonthFilter({ selectedMonth, onMonthChange }: MonthFilterProps) {
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  
  // Generate years from 2020 to current year + 1
  const years = Array.from(
    { length: currentYear - 2020 + 2 },
    (_, i) => currentYear + 1 - i
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMonthChange(undefined);
  };

  const handleMonthSelect = (monthValue: string) => {
    const month = parseInt(monthValue);
    onMonthChange({
      month,
      year: selectedMonth?.year ?? currentYear,
    });
  };

  const handleYearSelect = (yearValue: string) => {
    const year = parseInt(yearValue);
    onMonthChange({
      month: selectedMonth?.month ?? new Date().getMonth(),
      year,
    });
  };

  const getDisplayText = () => {
    if (!selectedMonth) return "Mois";
    const monthLabel = MONTHS.find((m) => m.value === selectedMonth.month)?.label;
    return `${monthLabel} ${selectedMonth.year}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-start text-left font-normal w-full sm:w-auto",
            !selectedMonth && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayText()}
          {selectedMonth && (
            <X
              className="ml-2 h-4 w-4 hover:text-destructive"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Mois
              </label>
              <Select
                value={selectedMonth?.month?.toString() ?? ""}
                onValueChange={handleMonthSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mois" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Année
              </label>
              <Select
                value={selectedMonth?.year?.toString() ?? ""}
                onValueChange={handleYearSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMonthChange(undefined)}
            >
              Effacer
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Appliquer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
