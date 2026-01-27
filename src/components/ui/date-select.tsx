import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DateSelectProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  className?: string;
}

const months = [
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

export function DateSelect({
  value,
  onChange,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  disabled = false,
  className,
}: DateSelectProps) {
  const currentYear = new Date().getFullYear();
  
  // Generate years from maxYear to minYear (descending for birth dates)
  const years = React.useMemo(() => {
    const yearsArray = [];
    for (let year = maxYear; year >= minYear; year--) {
      yearsArray.push(year);
    }
    return yearsArray;
  }, [minYear, maxYear]);

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const selectedYear = value?.getFullYear();
  const selectedMonth = value?.getMonth();
  const selectedDay = value?.getDate();

  const daysInMonth = React.useMemo(() => {
    if (selectedYear !== undefined && selectedMonth !== undefined) {
      return getDaysInMonth(selectedYear, selectedMonth);
    }
    return 31;
  }, [selectedYear, selectedMonth]);

  const days = React.useMemo(() => {
    const daysArray = [];
    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(day);
    }
    return daysArray;
  }, [daysInMonth]);

  const handleYearChange = (yearStr: string) => {
    const year = parseInt(yearStr);
    const month = selectedMonth ?? 0;
    const day = Math.min(selectedDay ?? 1, getDaysInMonth(year, month));
    onChange(new Date(year, month, day));
  };

  const handleMonthChange = (monthStr: string) => {
    const month = parseInt(monthStr);
    const year = selectedYear ?? currentYear;
    const day = Math.min(selectedDay ?? 1, getDaysInMonth(year, month));
    onChange(new Date(year, month, day));
  };

  const handleDayChange = (dayStr: string) => {
    const day = parseInt(dayStr);
    const year = selectedYear ?? currentYear;
    const month = selectedMonth ?? 0;
    onChange(new Date(year, month, day));
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Select
        value={selectedDay?.toString()}
        onValueChange={handleDayChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="Jour" />
        </SelectTrigger>
        <SelectContent>
          {days.map((day) => (
            <SelectItem key={day} value={day.toString()}>
              {day}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedMonth?.toString()}
        onValueChange={handleMonthChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Mois" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month.value} value={month.value.toString()}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedYear?.toString()}
        onValueChange={handleYearChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[100px]">
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
  );
}
