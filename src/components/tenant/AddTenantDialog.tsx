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
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useCreateTenant } from "@/hooks/useTenants";
import { useCreateContract } from "@/hooks/useContracts";
import { useProperties, useUpdateProperty } from "@/hooks/useProperties";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { SubscriptionLimitAlert } from "@/components/subscription/SubscriptionLimitAlert";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z.string().trim().max(20).optional(),
  property_id: z.string().uuid("Veuillez sélectionner un bien"),
  start_date: z.string().min(1, "La date de début est requise"),
  end_date: z.string().min(1, "La date de fin est requise"),
  rent_amount: z.string().min(1, "Le montant du loyer est requis"),
  deposit: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddTenantDialogProps {
  onSuccess?: () => void;
}

export function AddTenantDialog({ onSuccess }: AddTenantDialogProps) {
  const [open, setOpen] = useState(false);
  const createTenant = useCreateTenant();
  const createContract = useCreateContract();
  const updateProperty = useUpdateProperty();
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const limits = useSubscriptionLimits();

  const availableProperties = properties?.filter(p => p.status === 'disponible') || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      property_id: "",
      start_date: "",
      end_date: "",
      rent_amount: "",
      deposit: "",
    },
  });

  const isSubmitting = createTenant.isPending || createContract.isPending || updateProperty.isPending;

  const onSubmit = async (values: FormValues) => {
    try {
      // Create tenant
      const tenant = await createTenant.mutateAsync({
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        property_id: values.property_id,
      });

      // Create associated contract
      await createContract.mutateAsync({
        tenant_id: tenant.id,
        property_id: values.property_id,
        start_date: values.start_date,
        end_date: values.end_date,
        rent_amount: parseFloat(values.rent_amount),
        deposit: values.deposit ? parseFloat(values.deposit) : null,
        status: 'active',
      });

      // Update property status to 'occupé'
      await updateProperty.mutateAsync({
        id: values.property_id,
        status: 'occupé',
      });

      toast.success("Locataire et contrat créés avec succès");
      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating tenant:", error);
      // Check for duplicate error
      if (error?.message?.includes("duplicate") || error?.code === "23505") {
        if (error?.message?.includes("email")) {
          toast.error("Un locataire avec cet email existe déjà");
        } else if (error?.message?.includes("phone")) {
          toast.error("Un locataire avec ce numéro de téléphone existe déjà");
        } else {
          toast.error("Ce locataire existe déjà");
        }
      } else {
        toast.error("Erreur lors de la création du locataire");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="bg-emerald hover:bg-emerald/90 w-full sm:w-auto"
          disabled={!limits.canCreateTenant}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un locataire
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un locataire</DialogTitle>
        </DialogHeader>
        {!limits.canCreateTenant && limits.maxTenants !== null && (
          <SubscriptionLimitAlert
            type="tenant"
            planName={limits.planName}
            current={limits.currentTenants}
            max={limits.maxTenants}
          />
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tenant Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Informations du locataire</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet *</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean Dupont" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="jean@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input placeholder="+225 00 00 00 00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Property Selection */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground">Bien à louer</h3>
              
              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sélectionner un bien *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={propertiesLoading ? "Chargement..." : "Choisir un bien"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border z-50">
                        {availableProperties.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Aucun bien disponible
                          </div>
                        ) : (
                          availableProperties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              <div className="flex flex-col">
                                <span>{property.title}</span>
                                <span className="text-xs text-muted-foreground">{property.address}</span>
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
            </div>

            {/* Contract Details */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground">Détails du contrat</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de début *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de fin *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rent_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loyer mensuel (F CFA) *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="150000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caution (F CFA)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="300000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
                disabled={isSubmitting}
                className="flex-1 bg-emerald hover:bg-emerald/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer le locataire"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
