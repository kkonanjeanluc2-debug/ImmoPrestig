import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Percent } from "lucide-react";
import { useCreateOwner } from "@/hooks/useOwners";
import { useManagementTypes } from "@/hooks/useManagementTypes";
import { toast } from "sonner";

const ownerSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100, "Le nom doit contenir moins de 100 caractères"),
  email: z.string().trim().email("Email invalide").max(255, "L'email doit contenir moins de 255 caractères"),
  phone: z.string().trim().max(20, "Le téléphone doit contenir moins de 20 caractères").optional().or(z.literal("")),
  address: z.string().trim().max(500, "L'adresse doit contenir moins de 500 caractères").optional().or(z.literal("")),
  status: z.enum(["actif", "inactif"]),
  management_type_id: z.string().optional().or(z.literal("")),
});

type OwnerFormData = z.infer<typeof ownerSchema>;

export function AddOwnerDialog() {
  const [open, setOpen] = useState(false);
  const createOwner = useCreateOwner();
  const { data: managementTypes = [] } = useManagementTypes();

  // Get default management type
  const defaultManagementType = managementTypes.find((t) => t.is_default);

  const form = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      status: "actif",
      management_type_id: "",
    },
  });

  // Set default management type when it's loaded
  useEffect(() => {
    if (defaultManagementType && !form.getValues("management_type_id")) {
      form.setValue("management_type_id", defaultManagementType.id);
    }
  }, [defaultManagementType, form]);

  const onSubmit = async (data: OwnerFormData) => {
    try {
      await createOwner.mutateAsync({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        status: data.status,
        management_type_id: data.management_type_id || null,
      });
      toast.success("Propriétaire ajouté avec succès");
      form.reset();
      setOpen(false);
    } catch (error: any) {
      console.error("Error creating owner:", error);
      // Check for duplicate error
      if (error?.message?.includes("duplicate") || error?.code === "23505") {
        if (error?.message?.includes("email")) {
          toast.error("Un propriétaire avec cet email existe déjà");
        } else if (error?.message?.includes("phone")) {
          toast.error("Un propriétaire avec ce numéro de téléphone existe déjà");
        } else {
          toast.error("Ce propriétaire existe déjà");
        }
      } else {
        toast.error(error.message || "Erreur lors de l'ajout du propriétaire");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald hover:bg-emerald-dark text-primary-foreground gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Ajouter un propriétaire
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter un propriétaire</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jean@exemple.com" {...field} />
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
                    <Input placeholder="+225 07 00 00 00 00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input placeholder="Abidjan, Cocody" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un statut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {managementTypes.length > 0 && (
              <FormField
                control={form.control}
                name="management_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Type de gestion
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type de gestion" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {managementTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center justify-between gap-4">
                              <span>{type.name}</span>
                              <span className="text-muted-foreground">({type.percentage}%)</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Pourcentage de commission applicable pour ce propriétaire
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-emerald hover:bg-emerald-dark"
                disabled={createOwner.isPending}
              >
                {createOwner.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Ajouter
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
