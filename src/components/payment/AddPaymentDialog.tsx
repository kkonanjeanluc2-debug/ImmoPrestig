import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useTenants } from "@/hooks/useTenants";
import { useAgency } from "@/hooks/useAgency";
import { useCreatePayment } from "@/hooks/usePayments";
import { toast } from "sonner";
import { MonthYearSelector } from "./MonthYearSelector";

const formSchema = z.object({
  tenant_id: z.string().uuid("Veuillez sélectionner un locataire"),
  amount: z.string().min(1, "Le montant est requis"),
  due_date: z.string().min(1, "La date d'échéance est requise"),
  paid_date: z.string().optional(),
  status: z.enum(["pending", "paid", "late"]),
  method: z.string().optional(),
  payment_months: z.array(z.string()).min(1, "Veuillez sélectionner au moins un mois"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddPaymentDialogProps {
  onSuccess?: () => void;
}

export function AddPaymentDialog({ onSuccess }: AddPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const createPayment = useCreatePayment();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: agency } = useAgency();
  const rentDueDay = agency?.rent_due_day ?? 10;

  const tenantsWithContracts = tenants?.filter(t => 
    t.contracts?.some(c => c.status === 'active') &&
    t.property?.property_type !== 'meuble'
  ) || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenant_id: "",
      amount: "",
      due_date: new Date().toISOString().split("T")[0],
      paid_date: "",
      status: "pending",
      method: "",
      payment_months: [],
    },
  });

  const selectedTenantId = form.watch("tenant_id");
  const selectedTenant = tenants?.find(t => t.id === selectedTenantId);
  const activeContract = selectedTenant?.contracts?.find(c => c.status === 'active');
  const baseRentAmount = activeContract?.rent_amount || 0;

  // Auto-fill rent amount when tenant is selected
  const handleTenantChange = (tenantId: string) => {
    form.setValue("tenant_id", tenantId);
    setSelectedMonths([]);
    form.setValue("payment_months", []);
    const tenant = tenants?.find(t => t.id === tenantId);
    const contract = tenant?.contracts?.find(c => c.status === 'active');
    if (contract?.rent_amount) {
      form.setValue("amount", contract.rent_amount.toString());
    }
  };

  const parseMonthKey = (monthKey: string): Date | null => {
    const MONTHS_MAP: Record<string, number> = {
      "Janvier": 0, "Février": 1, "Mars": 2, "Avril": 3, "Mai": 4, "Juin": 5,
      "Juillet": 6, "Août": 7, "Septembre": 8, "Octobre": 9, "Novembre": 10, "Décembre": 11
    };
    const parts = monthKey.split(" ");
    if (parts.length !== 2) return null;
    const monthIndex = MONTHS_MAP[parts[0]];
    const year = parseInt(parts[1]);
    if (monthIndex === undefined || isNaN(year)) return null;
    return new Date(year, monthIndex, rentDueDay);
  };

  const handleMonthsChange = useCallback((months: string[]) => {
    setSelectedMonths(months);
    form.setValue("payment_months", months);

    // Auto-set due_date to the 10th of the last selected month
    if (months.length > 0) {
      const dates = months.map(parseMonthKey).filter(Boolean) as Date[];
      dates.sort((a, b) => a.getTime() - b.getTime());
      const lastDate = dates[dates.length - 1];
      const yyyy = lastDate.getFullYear();
      const mm = String(lastDate.getMonth() + 1).padStart(2, "0");
      const dd = String(rentDueDay).padStart(2, "0");
      form.setValue("due_date", `${yyyy}-${mm}-${dd}`);
    }
  }, [form]);

  const handleTotalChange = useCallback((total: number) => {
    form.setValue("amount", total.toString());
  }, [form]);

  const onSubmit = async (values: FormValues) => {
    if (values.payment_months.length === 0) {
      toast.error("Veuillez sélectionner au moins un mois");
      return;
    }

    try {
      await createPayment.mutateAsync({
        tenant_id: values.tenant_id,
        contract_id: activeContract?.id || null,
        amount: parseFloat(values.amount),
        due_date: values.due_date,
        paid_date: values.status === "paid" ? (values.paid_date || values.due_date) : null,
        status: values.status,
        method: values.method || null,
        payment_months: values.payment_months,
        tenantName: selectedTenant?.name,
      });

      toast.success("Paiement enregistré avec succès");
      form.reset();
      setSelectedMonths([]);
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating payment:", error);
      if (error.message?.includes("déjà été payé")) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de l'enregistrement du paiement");
      }
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
      setSelectedMonths([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-emerald hover:bg-emerald/90 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Enregistrer un paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tenant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locataire *</FormLabel>
                  <Select onValueChange={handleTenantChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={tenantsLoading ? "Chargement..." : "Sélectionner un locataire"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border z-50">
                      {tenantsWithContracts.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Aucun locataire avec contrat actif
                        </div>
                      ) : (
                        tenantsWithContracts.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            <div className="flex flex-col">
                              <span>{tenant.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {tenant.property?.title || "Bien non assigné"} - {tenant.contracts?.find(c => c.status === 'active')?.rent_amount?.toLocaleString("fr-FR")} F CFA/mois
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Month selector - only show when tenant is selected */}
            {selectedTenantId && (
              <FormField
                control={form.control}
                name="payment_months"
                render={() => (
                  <FormItem>
                    <MonthYearSelector
                      tenantId={selectedTenantId}
                      selectedMonths={selectedMonths}
                      onSelectionChange={handleMonthsChange}
                      baseRentAmount={baseRentAmount}
                      onTotalChange={handleTotalChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (F CFA) *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="150000" {...field} />
                    </FormControl>
                    {selectedMonths.length > 0 && parseFloat(field.value) < baseRentAmount * selectedMonths.length && (
                      <p className="text-xs text-amber-600">
                        Paiement partiel ({((parseFloat(field.value) / (baseRentAmount * selectedMonths.length)) * 100).toFixed(0)}% du total)
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border z-50">
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="paid">Payé</SelectItem>
                        <SelectItem value="late">En retard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'échéance *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("status") === "paid" && (
                <FormField
                  control={form.control}
                  name="paid_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de paiement</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode de paiement</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border z-50">
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="virement">Virement bancaire</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createPayment.isPending}
                className="flex-1 bg-emerald hover:bg-emerald/90"
              >
                {createPayment.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
