import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Receipt } from "lucide-react";
import { Expense, useDeleteExpense, EXPENSE_CATEGORIES } from "@/hooks/useExpenses";
import { AddExpenseDialog } from "./AddExpenseDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePermissions } from "@/hooks/usePermissions";

interface ExpensesTableProps {
  expenses: Expense[];
  isLoading: boolean;
}

function formatCFA(amount: number) {
  return `${amount.toLocaleString("fr-FR")} F CFA`;
}

function getCategoryLabel(value: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || value;
}

export function ExpensesTable({ expenses, isLoading }: ExpensesTableProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteExpense = useDeleteExpense();
  const { role, hasPermission, isLoading: permLoading } = usePermissions();
  const isAdmin = role === "admin" || role === "super_admin";
  const canCreateExpense = isAdmin || hasPermission("can_create_expenses");

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Dépenses
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Total : {formatCFA(totalExpenses)}
              </p>
            </div>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Catégorie</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Description</th>
                  {isAdmin && <th className="text-left py-2 px-3 text-muted-foreground font-medium">Créé par</th>}
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Paiement</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Montant</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-muted-foreground">Chargement...</td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-muted-foreground">
                      Aucune dépense enregistrée pour cette période
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-foreground whitespace-nowrap">
                        {new Date(exp.expense_date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {getCategoryLabel(exp.category)}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-foreground max-w-[200px] truncate">{exp.description}</td>
                      {isAdmin && (
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {exp.creator_name || "—"}
                        </td>
                      )}
                      <td className="py-2 px-3 text-muted-foreground capitalize">{exp.payment_method || "—"}</td>
                      <td className="py-2 px-3 text-right font-semibold text-destructive">{formatCFA(Number(exp.amount))}</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditExpense(exp)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(exp.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AddExpenseDialog open={addOpen} onOpenChange={setAddOpen} />
      {editExpense && (
        <AddExpenseDialog
          open={!!editExpense}
          onOpenChange={(open) => !open && setEditExpense(null)}
          expense={editExpense}
        />
      )}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteExpense.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
