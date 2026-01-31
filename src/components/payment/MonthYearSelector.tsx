import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarDays, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MonthYearSelectorProps {
  tenantId: string;
  selectedMonths: string[];
  onSelectionChange: (months: string[]) => void;
  baseRentAmount: number;
  onTotalChange: (total: number) => void;
}

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export function MonthYearSelector({
  tenantId,
  selectedMonths,
  onSelectionChange,
  baseRentAmount,
  onTotalChange,
}: MonthYearSelectorProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [paidMonths, setPaidMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch already paid months for this tenant
  useEffect(() => {
    const fetchPaidMonths = async () => {
      if (!tenantId) {
        setPaidMonths([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("payment_months")
          .eq("tenant_id", tenantId)
          .neq("status", "cancelled");

        if (error) throw error;

        // Flatten all paid months from all payments
        const allPaidMonths: string[] = [];
        data?.forEach((payment) => {
          if (payment.payment_months && Array.isArray(payment.payment_months)) {
            allPaidMonths.push(...payment.payment_months);
          }
        });

        setPaidMonths(allPaidMonths);
      } catch (error) {
        console.error("Error fetching paid months:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaidMonths();
  }, [tenantId]);

  // Update total when selection changes
  useEffect(() => {
    onTotalChange(selectedMonths.length * baseRentAmount);
  }, [selectedMonths, baseRentAmount, onTotalChange]);

  const toggleMonth = (monthKey: string) => {
    if (paidMonths.includes(monthKey)) return; // Cannot select already paid months

    if (selectedMonths.includes(monthKey)) {
      onSelectionChange(selectedMonths.filter((m) => m !== monthKey));
    } else {
      onSelectionChange([...selectedMonths, monthKey]);
    }
  };

  const getMonthKey = (monthIndex: number) => {
    return `${MONTHS[monthIndex]} ${year}`;
  };

  const isMonthPaid = (monthIndex: number) => {
    return paidMonths.includes(getMonthKey(monthIndex));
  };

  const isMonthSelected = (monthIndex: number) => {
    return selectedMonths.includes(getMonthKey(monthIndex));
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Mois à payer
        </Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setYear(year - 1)}
            className="px-2 py-1 text-sm border rounded hover:bg-muted"
          >
            ←
          </button>
          <span className="font-medium min-w-[60px] text-center">{year}</span>
          <button
            type="button"
            onClick={() => setYear(year + 1)}
            className="px-2 py-1 text-sm border rounded hover:bg-muted"
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          Chargement...
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {MONTHS.map((month, index) => {
            const monthKey = getMonthKey(index);
            const isPaid = isMonthPaid(index);
            const isSelected = isMonthSelected(index);
            const isFuture = year > currentYear || (year === currentYear && index > currentMonth);

            return (
              <div
                key={monthKey}
                onClick={() => !isPaid && toggleMonth(monthKey)}
                className={`
                  relative p-2 rounded-lg border text-center text-sm cursor-pointer transition-all
                  ${isPaid 
                    ? "bg-emerald/10 border-emerald text-emerald cursor-not-allowed" 
                    : isSelected 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : isFuture 
                        ? "bg-muted/30 border-muted-foreground/20 hover:border-primary/50"
                        : "bg-background border-input hover:border-primary"
                  }
                `}
              >
                {isPaid && (
                  <Badge 
                    variant="outline" 
                    className="absolute -top-2 -right-2 text-[10px] px-1 bg-emerald text-white border-emerald"
                  >
                    Payé
                  </Badge>
                )}
                <span className="block font-medium">{month.substring(0, 3)}</span>
              </div>
            );
          })}
        </div>
      )}

      {selectedMonths.length > 0 && (
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Mois sélectionnés :</span>
            <span className="font-medium">{selectedMonths.length}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedMonths.sort().map((month) => (
              <Badge key={month} variant="secondary" className="text-xs">
                {month}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <span className="font-medium">Montant total :</span>
            <span className="text-lg font-bold text-primary">
              {(selectedMonths.length * baseRentAmount).toLocaleString("fr-FR")} F CFA
            </span>
          </div>
        </div>
      )}

      {paidMonths.filter(m => m.includes(year.toString())).length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Les mois marqués "Payé" ont déjà été réglés et ne peuvent pas être sélectionnés à nouveau.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
