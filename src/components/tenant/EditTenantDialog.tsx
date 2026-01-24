import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useUpdateTenant, TenantWithDetails } from "@/hooks/useTenants";
import { toast } from "sonner";
import { AssignUserSelect } from "@/components/assignment/AssignUserSelect";
import { useIsAgencyOwner } from "@/hooks/useAssignableUsers";

const formSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface EditTenantDialogProps {
  tenant: TenantWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditTenantDialog({ tenant, open, onOpenChange, onSuccess }: EditTenantDialogProps) {
  const updateTenant = useUpdateTenant();
  const { isOwner: isAgencyOwner } = useIsAgencyOwner();
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  // Reset form when tenant changes
  useEffect(() => {
    if (tenant) {
      form.reset({
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone || "",
      });
      setAssignedTo((tenant as any).assigned_to || null);
    }
  }, [tenant, form]);

  const onSubmit = async (values: FormValues) => {
    if (!tenant) return;

    try {
      await updateTenant.mutateAsync({
        id: tenant.id,
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        assigned_to: assignedTo,
      });

      toast.success("Locataire modifié avec succès");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating tenant:", error);
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
        toast.error("Erreur lors de la modification du locataire");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le locataire</DialogTitle>
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

            {/* Assignment Selector - Only visible to agency owner/admin */}
            {isAgencyOwner && (
              <div className="space-y-2">
                <Label>Gestionnaire assigné</Label>
                <AssignUserSelect
                  value={assignedTo}
                  onValueChange={setAssignedTo}
                />
                <p className="text-xs text-muted-foreground">
                  Si assigné, seul ce gestionnaire pourra voir ce locataire
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={updateTenant.isPending}
                className="flex-1 bg-emerald hover:bg-emerald/90"
              >
                {updateTenant.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Modification...
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
