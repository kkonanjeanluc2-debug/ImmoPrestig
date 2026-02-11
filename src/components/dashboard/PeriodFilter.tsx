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
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

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
  const from = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
  return { from, to };
}

export function getDefaultPeriod(): PeriodValue {
  const { from, to } = getPresetRange("month");
  return { type: "month", from, to };
}

export function getPeriodLabel(period: PeriodValue): { title: string; subtitle: string } {
  if (period.type === "month") {
    const monthName = period.from.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return { title: `Revenus de ${monthName}`, subtitle: `Total du mois` };
  }
  if (period.type === "3months") {
    return { title: "Revenus (3 mois)", subtitle: "Total des 3 derniers mois" };
  }
  if (period.type === "12months") {
    return { title: "Revenus (12 mois)", subtitle: "Total des 12 derniers mois" };
  }
  const fromStr = format(period.from, "dd/MM/yyyy", { locale: fr });
  const toStr = format(period.to, "dd/MM/yyyy", { locale: fr });
  return { title: "Revenus personnalisés", subtitle: `Du ${fromStr} au ${toStr}` };
}

const PRESETS: { label: string; value: Exclude<PeriodType, "custom"> }[] = [
  { label: "Ce mois", value: "month" },
  { label: "3 mois", value: "3months" },
  { label: "12 mois", value: "12months" },
];

function DatePickerInput({ label, date, onSelect }: { label: string; date?: Date; onSelect: (d: Date | undefined) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-8 w-[130px] justify-start text-left text-xs font-normal px-2",
              !date && "text-muted-foreground"
            )}
          >
            {date ? format(date, "dd/MM/yyyy", { locale: fr }) : "jj/mm/aaaa"}
            <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => { onSelect(d); setOpen(false); }}
            locale={fr}
            className="p-3 pointer-events-auto"
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const isCustom = value.type === "custom";

  const handlePreset = (preset: Exclude<PeriodType, "custom">) => {
    const { from, to } = getPresetRange(preset);
    onChange({ type: preset, from, to });
  };

  const handleCustomToggle = () => {
    if (!isCustom) {
      onChange({ type: "custom", from: value.from, to: value.to });
    }
  };

  const handleFromChange = (d: Date | undefined) => {
    if (d) onChange({ type: "custom", from: d, to: value.to < d ? d : value.to });
  };

  const handleToChange = (d: Date | undefined) => {
    if (d) onChange({ type: "custom", from: value.from > d ? d : value.from, to: d });
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Période</span>
      <div className="flex flex-wrap items-end gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={value.type === p.value ? "default" : "outline"}
            className="rounded-full px-4 h-8 text-xs"
            onClick={() => handlePreset(p.value)}
          >
            {p.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant={isCustom ? "default" : "outline"}
          className="rounded-full px-4 h-8 text-xs"
          onClick={handleCustomToggle}
        >
          Personnalisé
        </Button>
        {isCustom && (
          <>
            <DatePickerInput label="Du" date={value.from} onSelect={handleFromChange} />
            <DatePickerInput label="Au" date={value.to} onSelect={handleToChange} />
          </>
        )}
      </div>
    </div>
  );
}
