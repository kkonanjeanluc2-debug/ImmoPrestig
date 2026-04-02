import { useState, useEffect, useRef } from "react";
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
import { Loader2, Upload, X, FileText } from "lucide-react";
import { useUpdateTenant, TenantWithDetails } from "@/hooks/useTenants";
import { toast } from "sonner";
import { AssignUserSelect } from "@/components/assignment/AssignUserSelect";
import { useIsAgencyOwner } from "@/hooks/useAssignableUsers";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().max(255).optional().or(z.literal("")).refine((val) => !val || z.string().email().safeParse(val).success, "Email invalide"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  profession: z.string().trim().max(100).optional().or(z.literal("")),
  emergency_contact_name: z.string().trim().max(100).optional().or(z.literal("")),
  emergency_contact_phone: z.string().trim().max(20).optional().or(z.literal("")),
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
  const [cniFile, setCniFile] = useState<File | null>(null);
  const [existingCniUrl, setExistingCniUrl] = useState<string | null>(null);
  const cniInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      profession: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
    },
  });

  // Reset form when tenant changes
  useEffect(() => {
    if (tenant) {
      form.reset({
        name: tenant.name,
        email: tenant.email || "",
        phone: tenant.phone || "",
        profession: (tenant as any).profession || "",
        emergency_contact_name: (tenant as any).emergency_contact_name || "",
        emergency_contact_phone: (tenant as any).emergency_contact_phone || "",
      });
      setAssignedTo((tenant as any).assigned_to || null);
      setExistingCniUrl((tenant as any).cni_document_url || null);
      setCniFile(null);
    }
  }, [tenant, form]);

  const onSubmit = async (values: FormValues) => {
    if (!tenant) return;

    try {
      // Upload new CNI if provided
      let cniDocumentUrl = existingCniUrl;
      if (cniFile) {
        const fileExt = cniFile.name.split('.').pop();
        const filePath = `cni-documents/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("documents-achats")
          .upload(filePath, cniFile);
        if (uploadError) throw new Error("Erreur lors de l'upload du document CNI");
        const { data: urlData } = supabase.storage.from("documents-achats").getPublicUrl(filePath);
        cniDocumentUrl = urlData.publicUrl;
      }

      await updateTenant.mutateAsync({
        id: tenant.id,
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        profession: values.profession || null,
        cni_document_url: cniDocumentUrl,
        emergency_contact_name: values.emergency_contact_name || null,
        emergency_contact_phone: values.emergency_contact_phone || null,
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
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Modifier le locataire</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden gap-4">
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              <div className="space-y-4 pb-2">
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
                      <FormLabel>Email</FormLabel>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="profession"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profession</FormLabel>
                        <FormControl>
                          <Input placeholder="Ingénieur, Commerçant..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label>CNI / Passeport</Label>
                    <input
                      ref={cniInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setCniFile(file);
                      }}
                    />
                    {cniFile ? (
                      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{cniFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setCniFile(null);
                            if (cniInputRef.current) cniInputRef.current.value = "";
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : existingCniUrl ? (
                      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate flex-1">Document existant</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => cniInputRef.current?.click()}
                        >
                          <Upload className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => cniInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        Importer un fichier
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-dashed">
                  <h4 className="text-sm font-medium text-muted-foreground">Contact d'urgence</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emergency_contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom du contact</FormLabel>
                          <FormControl>
                            <Input placeholder="Nom de la personne" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergency_contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone du contact</FormLabel>
                          <FormControl>
                            <Input placeholder="+225 00 00 00 00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

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
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t">
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
