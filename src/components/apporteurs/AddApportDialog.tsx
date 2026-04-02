import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateApport, type ApporteurAffaires } from "@/hooks/useApporteursAffaires";

const schema = z.object({
  commission_percentage: z.coerce.number().min(0).max(100),
  commission_amount: z.coerce.number().min(0).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  apport_date: z.string().min(1, "La date est requise"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apporteur: ApporteurAffaires;
}

export function AddApportDialog({ open, onOpenChange, apporteur }: Props) {
  const createApport = useCreateApport();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      commission_percentage: apporteur.commission_percentage,
      commission_amount: undefined,
      description: "",
      apport_date: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = async (values: FormValues) => {
    await createApport.mutateAsync({
      apporteur_id: apporteur.id,
      commission_percentage: values.commission_percentage,
      commission_amount: values.commission_amount,
      description: values.description || undefined,
      apport_date: values.apport_date,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un apport</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="apport_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Date de l'apport *</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Ex: Locataire apporté pour villa X" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="commission_percentage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission (%)</FormLabel>
                  <FormControl><Input type="number" min={0} max={100} step={0.5} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="commission_amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant (FCFA)</FormLabel>
                  <FormControl><Input type="number" min={0} placeholder="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={createApport.isPending}>Enregistrer</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
