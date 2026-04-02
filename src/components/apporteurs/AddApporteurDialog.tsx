import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateApporteur, useUpdateApporteur, type ApporteurAffaires } from "@/hooks/useApporteursAffaires";

const schema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("Email invalide").max(255).optional().or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  cni_number: z.string().max(50).optional().or(z.literal("")),
  commission_percentage: z.coerce.number().min(0).max(100).default(5),
  notes: z.string().max(500).optional().or(z.literal("")),
  status: z.string().default("actif"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apporteur?: ApporteurAffaires | null;
}

export function AddApporteurDialog({ open, onOpenChange, apporteur }: Props) {
  const createApporteur = useCreateApporteur();
  const updateApporteur = useUpdateApporteur();
  const isEdit = !!apporteur;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      cni_number: "",
      commission_percentage: 5,
      notes: "",
      status: "actif",
    },
  });

  useEffect(() => {
    if (apporteur) {
      form.reset({
        name: apporteur.name,
        phone: apporteur.phone || "",
        email: apporteur.email || "",
        address: apporteur.address || "",
        cni_number: apporteur.cni_number || "",
        commission_percentage: apporteur.commission_percentage,
        notes: apporteur.notes || "",
        status: apporteur.status,
      });
    } else {
      form.reset({
        name: "", phone: "", email: "", address: "", cni_number: "",
        commission_percentage: 5, notes: "", status: "actif",
      });
    }
  }, [apporteur, form]);

  const onSubmit = async (values: FormValues) => {
    const input = {
      name: values.name,
      phone: values.phone || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
      cni_number: values.cni_number || undefined,
      commission_percentage: values.commission_percentage,
      notes: values.notes || undefined,
      status: values.status,
    };

    if (isEdit && apporteur) {
      await updateApporteur.mutateAsync({ id: apporteur.id, ...input });
    } else {
      await createApporteur.mutateAsync(input);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'apporteur" : "Ajouter un apporteur"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom complet *</FormLabel>
                <FormControl><Input placeholder="Ex: Jean Kouassi" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                   <FormControl><Input placeholder="Ex: 07 00 00 00 00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="Ex: jean@email.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Adresse</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="cni_number" render={({ field }) => (
              <FormItem>
                <FormLabel>N° CNI</FormLabel>
                <FormControl><Input {...field} /></FormControl>
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
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={createApporteur.isPending || updateApporteur.isPending}>
                {isEdit ? "Modifier" : "Ajouter"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
