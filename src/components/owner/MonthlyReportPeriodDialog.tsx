import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface MonthlyReportPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (startDate: Date, endDate: Date) => void;
  isLoading?: boolean;
}

export function MonthlyReportPeriodDialog({
  open,
  onOpenChange,
  onGenerate,
  isLoading = false,
}: MonthlyReportPeriodDialogProps) {
  const now = new Date();
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(now), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(endOfMonth(now), "yyyy-MM-dd")
  );

  const handleGenerate = () => {
    if (!startDate || !endDate) return;
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59");
    if (end < start) return;
    onGenerate(start, end);
  };

  const isInvalid = !startDate || !endDate || new Date(endDate) < new Date(startDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Sélectionner la période
          </DialogTitle>
          <DialogDescription>
            Choisissez une période personnalisée pour générer le point.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Date de début</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">Date de fin</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading || isInvalid}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Générer le PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
