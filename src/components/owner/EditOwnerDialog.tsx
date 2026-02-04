import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { DateSelect } from "@/components/ui/date-select";
import { Loader2, Percent, User, CreditCard, FileText } from "lucide-react";
import { useUpdateOwner, OwnerWithManagementType } from "@/hooks/useOwners";
import { useManagementTypes } from "@/hooks/useManagementTypes";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { toast } from "sonner";

const ownerSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(["actif", "inactif"]),
  management_type_id: z.string().optional().or(z.literal("")),
  default_contract_template_id: z.string().optional().or(z.literal("")),
  birth_date: z.date().optional(),
  birth_place: z.string().trim().max(100).optional().or(z.literal("")),
  profession: z.string().trim().max(100).optional().or(z.literal("")),
  cni_number: z.string().trim().max(50).optional().or(z.literal("")),
});

type OwnerFormData = z.infer<typeof ownerSchema>;

interface EditOwnerDialogProps {
  owner: OwnerWithManagementType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditOwnerDialog({ owner, open, onOpenChange, onSuccess }: EditOwnerDialogProps) {
  const updateOwner = useUpdateOwner();
  const { data: managementTypes = [] } = useManagementTypes();
  const { data: contractTemplates = [] } = useContractTemplates();

  const form = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      status: "actif",
      management_type_id: "",
      default_contract_template_id: "",
      birth_date: undefined,
      birth_place: "",
      profession: "",
      cni_number: "",
    },
  });

  // Reset form when owner changes
  useEffect(() => {
    if (owner) {
      form.reset({
        name: owner.name,
        email: owner.email,
        phone: owner.phone || "",
        address: owner.address || "",
        status: owner.status as "actif" | "inactif",
        management_type_id: owner.management_type_id || "",
        default_contract_template_id: (owner as any).default_contract_template_id || "",
        birth_date: (owner as any).birth_date ? new Date((owner as any).birth_date) : undefined,
        birth_place: (owner as any).birth_place || "",
        profession: (owner as any).profession || "",
        cni_number: (owner as any).cni_number || "",
      });
    }
  }, [owner, form]);

  const onSubmit = async (data: OwnerFormData) => {
    if (!owner) return;

    try {
      await updateOwner.mutateAsync({
        id: owner.id,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        status: data.status,
        management_type_id: data.management_type_id || null,
        default_contract_template_id: data.default_contract_template_id || null,
        birth_date: data.birth_date ? format(data.birth_date, "yyyy-MM-dd") : null,
        birth_place: data.birth_place || null,
        profession: data.profession || null,
        cni_number: data.cni_number || null,
      });

      toast.success("Propriétaire modifié avec succès");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating owner:", error);
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
        toast.error(error.message || "Erreur lors de la modification du propriétaire");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le propriétaire</DialogTitle>
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

            {/* Informations complémentaires */}
            <div className="border-t pt-4 mt-2">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Informations complémentaires
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col sm:col-span-2">
                      <FormLabel>Date de naissance</FormLabel>
                      <FormControl>
                        <DateSelect
                          value={field.value}
                          onChange={field.onChange}
                          maxYear={new Date().getFullYear()}
                          minYear={1900}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birth_place"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieu de naissance</FormLabel>
                      <FormControl>
                        <Input placeholder="Abidjan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profession</FormLabel>
                      <FormControl>
                        <Input placeholder="Entrepreneur" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cni_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Numéro CNI
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="CI00000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
                      onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
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

            {contractTemplates.length > 0 && (
              <FormField
                control={form.control}
                name="default_contract_template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Modèle de contrat par défaut
                    </FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un modèle de contrat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aucun (utiliser le modèle par défaut)</SelectItem>
                        {contractTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                            {template.is_default && " (par défaut)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Ce modèle sera utilisé pour générer les contrats des locataires de ce propriétaire
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
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-emerald hover:bg-emerald-dark"
                disabled={updateOwner.isPending}
              >
                {updateOwner.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
