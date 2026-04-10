import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);

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

  // Rendement mensuel total du bien (somme de toutes les unités ou loyer du bien)
  const rentAmount = useMemo(() => {
    if (!selectedPropertyId) return 0;
    if (units.length > 0) {
      // Immeuble / maison à portes multiples : somme de tous les loyers
      return units.reduce((sum, u) => sum + (u.rent_amount || 0), 0);
    }
    // Bien unique : prix/loyer du bien
    return properties.find(p => p.id === selectedPropertyId)?.price || 0;
  }, [selectedPropertyId, units, properties]);

  useEffect(() => {
    if (rentAmount > 0 && commissionPct > 0) {
      form.setValue("commission_amount", Math.round((rentAmount * commissionPct) / 100));
    }
  }, [rentAmount, commissionPct, form]);

  // Reset unit when property changes (kept for data model)
  useEffect(() => {
    form.setValue("unit_id", "");
  }, [selectedPropertyId, form]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const selectedUnit = units.find(u => u.id === selectedUnitId);

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

            {/* Searchable property selector */}
            <FormField control={form.control} name="property_id" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Bien concerné</FormLabel>
                <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}
                      >
                        {selectedProperty
                          ? `${selectedProperty.title} — ${selectedProperty.price?.toLocaleString()} F`
                          : "Rechercher un bien..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 pointer-events-auto" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher un bien..." />
                      <CommandList>
                        <CommandEmpty>Aucun bien trouvé</CommandEmpty>
                        <CommandGroup>
                          {properties.map(p => (
                            <CommandItem
                              key={p.id}
                              value={`${p.title} ${p.address || ""}`}
                              onSelect={() => {
                                field.onChange(p.id);
                                setPropertyOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", field.value === p.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span>{p.title}</span>
                                <span className="text-xs text-muted-foreground">{p.price?.toLocaleString()} F — {p.address}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />

            {rentAmount > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Rendement mensuel du bien :</span>{" "}
                  <span className="font-semibold">{rentAmount.toLocaleString()} FCFA</span>
                </div>
                {units.length > 1 && (
                  <div className="text-xs text-muted-foreground">
                    ({units.length} unités — somme des loyers)
                  </div>
                )}
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
