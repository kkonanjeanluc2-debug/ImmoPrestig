import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useCreateEtatDesLieux, RoomInspection, KeyItem } from "@/hooks/useEtatsDesLieux";
import { TenantWithDetails } from "@/hooks/useTenants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoomInspectionForm } from "./RoomInspectionForm";
import { KeysForm } from "./KeysForm";
import { MetersForm } from "./MetersForm";

const formSchema = z.object({
  type: z.enum(["entree", "sortie"]),
  inspection_date: z.string().min(1, "La date est requise"),
  general_condition: z.enum(["excellent", "bon", "moyen", "mauvais"]).optional(),
  general_comments: z.string().optional(),
  electricity_meter: z.coerce.number().optional(),
  water_meter: z.coerce.number().optional(),
  gas_meter: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddEtatDesLieuxDialogProps {
  tenant: TenantWithDetails;
  existingEntryEtat?: boolean;
  trigger?: React.ReactNode;
}

const defaultRooms: RoomInspection[] = [
  { name: "Entrée", condition: "bon", walls: "", floor: "", ceiling: "", windows: "", doors: "", electricity: "", plumbing: "", comments: "" },
  { name: "Salon", condition: "bon", walls: "", floor: "", ceiling: "", windows: "", doors: "", electricity: "", plumbing: "", comments: "" },
  { name: "Cuisine", condition: "bon", walls: "", floor: "", ceiling: "", windows: "", doors: "", electricity: "", plumbing: "", comments: "" },
  { name: "Chambre 1", condition: "bon", walls: "", floor: "", ceiling: "", windows: "", doors: "", electricity: "", plumbing: "", comments: "" },
  { name: "Salle de bain", condition: "bon", walls: "", floor: "", ceiling: "", windows: "", doors: "", electricity: "", plumbing: "", comments: "" },
  { name: "WC", condition: "bon", walls: "", floor: "", ceiling: "", windows: "", doors: "", electricity: "", plumbing: "", comments: "" },
];

const defaultKeys: KeyItem[] = [
  { type: "Porte d'entrée", quantity: 2, description: "" },
];

export function AddEtatDesLieuxDialog({ tenant, existingEntryEtat, trigger }: AddEtatDesLieuxDialogProps) {
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<RoomInspection[]>(defaultRooms);
  const [keys, setKeys] = useState<KeyItem[]>(defaultKeys);
  
  const createEtatDesLieux = useCreateEtatDesLieux();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: existingEntryEtat ? "sortie" : "entree",
      inspection_date: new Date().toISOString().split("T")[0],
      general_condition: "bon",
      general_comments: "",
      electricity_meter: undefined,
      water_meter: undefined,
      gas_meter: undefined,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const activeContract = tenant.contracts?.find(c => c.status === "actif");
    
    await createEtatDesLieux.mutateAsync({
      tenant_id: tenant.id,
      contract_id: activeContract?.id || null,
      property_id: tenant.property?.id || null,
      unit_id: tenant.unit?.id || null,
      type: values.type,
      inspection_date: values.inspection_date,
      general_condition: values.general_condition || null,
      general_comments: values.general_comments || null,
      rooms,
      keys_delivered: keys,
      electricity_meter: values.electricity_meter || null,
      water_meter: values.water_meter || null,
      gas_meter: values.gas_meter || null,
      status: "draft",
    });

    form.reset();
    setRooms(defaultRooms);
    setKeys(defaultKeys);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-emerald hover:bg-emerald/90">
            <Plus className="h-4 w-4 mr-2" />
            Nouvel état des lieux
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nouvel état des lieux - {tenant.name}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="rooms">Pièces</TabsTrigger>
                <TabsTrigger value="meters">Compteurs</TabsTrigger>
                <TabsTrigger value="keys">Clés</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type d'état des lieux *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="entree">État des lieux d'entrée</SelectItem>
                            <SelectItem value="sortie">État des lieux de sortie</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="inspection_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="general_condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>État général</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner l'état" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="bon">Bon</SelectItem>
                          <SelectItem value="moyen">Moyen</SelectItem>
                          <SelectItem value="mauvais">Mauvais</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="general_comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commentaires généraux</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observations générales sur le logement..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Bien:</strong> {tenant.property?.title || "Non assigné"}
                  </p>
                  {tenant.unit && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Unité:</strong> {tenant.unit.unit_number}
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="rooms" className="mt-4">
                <RoomInspectionForm rooms={rooms} onChange={setRooms} />
              </TabsContent>

              <TabsContent value="meters" className="mt-4">
                <MetersForm form={form} />
              </TabsContent>

              <TabsContent value="keys" className="mt-4">
                <KeysForm keys={keys} onChange={setKeys} />
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 pt-4 border-t">
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
                disabled={createEtatDesLieux.isPending}
                className="flex-1 bg-emerald hover:bg-emerald/90"
              >
                {createEtatDesLieux.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer l'état des lieux"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
