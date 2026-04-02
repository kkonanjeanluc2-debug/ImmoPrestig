import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateApport, type ApporteurAffaires } from "@/hooks/useApporteursAffaires";
import { useProperties } from "@/hooks/useProperties";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  property_id: z.string().optional().or(z.literal("")),
  unit_id: z.string().optional().or(z.literal("")),
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
  const { data: properties = [] } = useProperties();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      property_id: "",
      unit_id: "",
      commission_percentage: apporteur.commission_percentage,
      commission_amount: 0,
      description: "",
      apport_date: new Date().toISOString().split("T")[0],
    },
  });

  const selectedPropertyId = useWatch({ control: form.control, name: "property_id" });
  const selectedUnitId = useWatch({ control: form.control, name: "unit_id" });
  const commissionPct = useWatch({ control: form.control, name: "commission_percentage" });

  // Fetch units for selected property
  const { data: units = [] } = useQuery({
    queryKey: ["property-units", selectedPropertyId],
    queryFn: async () => {
      if (!selectedPropertyId) return [];
      const { data, error } = await supabase
        .from("property_units")
        .select("id, unit_number, rent_amount, status")
        .eq("property_id", selectedPropertyId)
        .order("unit_number");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPropertyId,
  });

  // Get rent amount based on selection
  const rentAmount = useMemo(() => {
    if (selectedUnitId && units.length) {
      const unit = units.find(u => u.id === selectedUnitId);
      return unit?.rent_amount || 0;
    }
    if (selectedPropertyId && !units.length) {
      const prop = properties.find(p => p.id === selectedPropertyId);
      return prop?.price || 0;
    }
    if (selectedPropertyId && units.length) {
      // If property has units but none selected, don't auto-calc
      return 0;
    }
    return 0;
  }, [selectedPropertyId, selectedUnitId, units, properties]);

  // Auto-calculate commission
  useEffect(() => {
    if (rentAmount > 0 && commissionPct > 0) {
      const amount = Math.round((rentAmount * commissionPct) / 100);
      form.setValue("commission_amount", amount);
    }
  }, [rentAmount, commissionPct, form]);

  // Reset unit when property changes
  useEffect(() => {
    form.setValue("unit_id", "");
  }, [selectedPropertyId, form]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const onSubmit = async (values: FormValues) => {
    await createApport.mutateAsync({
      apporteur_id: apporteur.id,
      property_id: values.property_id || undefined,
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

            {/* Property selection */}
            <FormField control={form.control} name="property_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Bien concerné</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un bien" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} — {p.price?.toLocaleString()} F
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Unit selection if property has units */}
            {selectedPropertyId && units.length > 0 && (
              <FormField control={form.control} name="unit_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unité / Appartement</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une unité" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {units.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.unit_number} — {u.rent_amount?.toLocaleString()} F/mois
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Rent info */}
            {rentAmount > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <span className="text-muted-foreground">Loyer mensuel :</span>{" "}
                <span className="font-semibold">{rentAmount.toLocaleString()} FCFA</span>
              </div>
            )}

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
