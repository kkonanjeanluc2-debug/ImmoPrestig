import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export type PeriodType = "month" | "3months" | "12months" | "custom";

export interface PeriodValue {
  type: PeriodType;
  from: Date;
  to: Date;
}

interface PeriodFilterProps {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
}

function getPresetRange(type: Exclude<PeriodType, "custom">): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  if (type === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to };
  }
  if (type === "3months") {
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { from, to };
  }
  // 12months
  const from = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
  return { from, to };
}

export function getDefaultPeriod(): PeriodValue {
  const { from, to } = getPresetRange("month");
  return { type: "month", from, to };
}

const PRESETS: { label: string; value: Exclude<PeriodType, "custom"> }[] = [
  { label: "Ce mois", value: "month" },
  { label: "3 mois", value: "3months" },
  { label: "12 mois", value: "12months" },
];

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(
    value.type === "custom" ? { from: value.from, to: value.to } : undefined
  );

  const handlePreset = (preset: Exclude<PeriodType, "custom">) => {
    const { from, to } = getPresetRange(preset);
    onChange({ type: preset, from, to });
  };

  const handleCustomApply = () => {
    if (tempRange?.from) {
      onChange({
        type: "custom",
        from: tempRange.from,
        to: tempRange.to || tempRange.from,
      });
      setCustomOpen(false);
    }
  };

  const customLabel =
    value.type === "custom"
      ? `${format(value.from, "dd/MM/yy", { locale: fr })} - ${format(value.to, "dd/MM/yy", { locale: fr })}`
      : "Personnalisé";

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Période</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={value.type === p.value ? "default" : "outline"}
            className={cn("rounded-full px-4 h-8 text-xs")}
            onClick={() => handlePreset(p.value)}
          >
            {p.label}
          </Button>
        ))}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant={value.type === "custom" ? "default" : "outline"}
              className="rounded-full px-4 h-8 text-xs"
            >
              {customLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempRange?.from || new Date()}
              selected={tempRange}
              onSelect={setTempRange}
              numberOfMonths={2}
              locale={fr}
              className="p-3 pointer-events-auto"
            />
            <div className="flex items-center justify-end gap-2 p-3 border-t">
              <Button variant="ghost" size="sm" onClick={() => setCustomOpen(false)}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleCustomApply} disabled={!tempRange?.from}>
                Appliquer
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
