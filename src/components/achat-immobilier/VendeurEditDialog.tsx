import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DateSelect } from "@/components/ui/date-select";
import { Loader2, User, CreditCard } from "lucide-react";
import { Vendeur, useUpdateVendeur } from "@/hooks/useVendeurs";
import { useEffect } from "react";

const vendeurSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().max(255).optional().or(z.literal("")).refine((val) => !val || z.string().email().safeParse(val).success, "Email invalide"),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  birth_date: z.date().optional(),
  birth_place: z.string().trim().max(100).optional().or(z.literal("")),
  profession: z.string().trim().max(100).optional().or(z.literal("")),
  cni_number: z.string().trim().max(50).optional().or(z.literal("")),
});

type VendeurFormData = z.infer<typeof vendeurSchema>;

interface Props {
  vendeur: Vendeur;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendeurEditDialog({ vendeur, open, onOpenChange }: Props) {
  const updateMutation = useUpdateVendeur();

  const form = useForm<VendeurFormData>({
    resolver: zodResolver(vendeurSchema),
    defaultValues: {
      name: vendeur.name,
      phone: vendeur.phone || "",
      email: vendeur.email || "",
      address: vendeur.address || "",
      birth_date: vendeur.birth_date ? parseISO(vendeur.birth_date) : undefined,
      birth_place: vendeur.birth_place || "",
      profession: vendeur.profession || "",
      cni_number: vendeur.cni_number || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: vendeur.name,
        phone: vendeur.phone || "",
        email: vendeur.email || "",
        address: vendeur.address || "",
        birth_date: vendeur.birth_date ? parseISO(vendeur.birth_date) : undefined,
        birth_place: vendeur.birth_place || "",
        profession: vendeur.profession || "",
        cni_number: vendeur.cni_number || "",
      });
    }
  }, [open, vendeur]);

  const onSubmit = async (data: VendeurFormData) => {
    await updateMutation.mutateAsync({
      id: vendeur.id,
      name: data.name,
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      birth_date: data.birth_date ? format(data.birth_date, "yyyy-MM-dd") : undefined,
      birth_place: data.birth_place || undefined,
      profession: data.profession || undefined,
      cni_number: data.cni_number || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le vendeur</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom complet *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
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

            <div className="border-t pt-4 mt-2">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <User className="h-4 w-4" /> Informations complémentaires
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="birth_date" render={({ field }) => (
                  <FormItem className="flex flex-col sm:col-span-2">
                    <FormLabel>Date de naissance</FormLabel>
                    <FormControl>
                      <DateSelect value={field.value} onChange={field.onChange} maxYear={new Date().getFullYear()} minYear={1900} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="birth_place" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu de naissance</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <FormField control={form.control} name="profession" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profession</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cni_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Numéro CNI
                    </FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
