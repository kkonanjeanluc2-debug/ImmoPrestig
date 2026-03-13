import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAddExpense, useUpdateExpense, EXPENSE_CATEGORIES, Expense } from "@/hooks/useExpenses";

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}

const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "virement", label: "Virement bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "carte", label: "Carte bancaire" },
];

export function AddExpenseDialog({ open, onOpenChange, expense }: AddExpenseDialogProps) {
  const isEditing = !!expense;
  const addExpense = useAddExpense();
  const updateExpense = useUpdateExpense();

  const [form, setForm] = useState({
    category: expense?.category || "autre",
    description: expense?.description || "",
    amount: expense?.amount?.toString() || "",
    expense_date: expense?.expense_date || new Date().toISOString().split("T")[0],
    payment_method: expense?.payment_method || "",
    notes: expense?.notes || "",
  });

  const handleSubmit = () => {
    if (!form.description || !form.amount || Number(form.amount) <= 0) return;

    const payload = {
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      payment_method: form.payment_method || undefined,
      notes: form.notes || undefined,
    };

    if (isEditing) {
      updateExpense.mutate({ id: expense.id, ...payload }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      addExpense.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier la dépense" : "Ajouter une dépense"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Catégorie *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Achat fournitures de bureau"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Montant (F CFA) *</Label>
              <Input
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mode de paiement</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes supplémentaires..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.description || !form.amount || Number(form.amount) <= 0 || addExpense.isPending || updateExpense.isPending}
          >
            {isEditing ? "Modifier" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
