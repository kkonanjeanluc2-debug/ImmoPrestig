import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DateSelect } from "@/components/ui/date-select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, Plus, Loader2, Phone, Mail, Building2, ChevronDown, MapPin, User, CreditCard, Pencil, Trash2 } from "lucide-react";
import { useVendeurs, useCreateVendeur, useDeleteVendeur, Vendeur } from "@/hooks/useVendeurs";
import { useBiensAchat } from "@/hooks/useBiensAchat";
import { usePermissions } from "@/hooks/usePermissions";
import { VendeurEditDialog } from "./VendeurEditDialog";

const STATUS_LABELS: Record<string, string> = {
  prospection: "Prospection",
  en_negociation: "En négociation",
  offre_faite: "Offre faite",
  sous_compromis: "Sous compromis",
  achete: "Acheté",
  abandonne: "Abandonné",
};

const vendeurSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100, "Le nom doit contenir moins de 100 caractères"),
  phone: z.string().trim().max(20, "Le téléphone doit contenir moins de 20 caractères").optional().or(z.literal("")),
  email: z.string().trim().max(255, "L'email doit contenir moins de 255 caractères").optional().or(z.literal("")).refine((val) => !val || z.string().email().safeParse(val).success, "Email invalide"),
  address: z.string().trim().max(500, "L'adresse doit contenir moins de 500 caractères").optional().or(z.literal("")),
  birth_date: z.date().optional(),
  birth_place: z.string().trim().max(100).optional().or(z.literal("")),
  profession: z.string().trim().max(100).optional().or(z.literal("")),
  cni_number: z.string().trim().max(50).optional().or(z.literal("")),
});

type VendeurFormData = z.infer<typeof vendeurSchema>;

export function VendeursList() {
  const { data: vendeurs, isLoading } = useVendeurs();
  const { data: biens = [] } = useBiensAchat();
  const createMutation = useCreateVendeur();
  const deleteMutation = useDeleteVendeur();
  const { hasPermission } = usePermissions();
  const [open, setOpen] = useState(false);
  const [editVendeur, setEditVendeur] = useState<Vendeur | null>(null);
  const [deleteVendeur, setDeleteVendeur] = useState<Vendeur | null>(null);

  const canCreate = hasPermission("can_create_achats");
  const canEdit = hasPermission("can_edit_achats");
  const canDelete = hasPermission("can_delete_achats");

  const form = useForm<VendeurFormData>({
    resolver: zodResolver(vendeurSchema),
    defaultValues: {
      name: "", phone: "", email: "", address: "",
      birth_date: undefined, birth_place: "", profession: "", cni_number: "",
    },
  });

  const onSubmit = async (data: VendeurFormData) => {
    await createMutation.mutateAsync({
      name: data.name,
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      birth_date: data.birth_date ? format(data.birth_date, "yyyy-MM-dd") : undefined,
      birth_place: data.birth_place || undefined,
      profession: data.profession || undefined,
      cni_number: data.cni_number || undefined,
    });
    setOpen(false);
    form.reset();
  };

  const getBiensForVendeur = (vendeurId: string) =>
    biens.filter((b) => b.vendeur_id === vendeurId);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Vendeurs</h2>
        {canCreate && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter un vendeur</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouveau vendeur</DialogTitle>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="jean@exemple.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Ajouter
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!vendeurs?.length ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun vendeur enregistré</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendeurs.map((v) => {
            const vendeurBiens = getBiensForVendeur(v.id);
            return (
              <Card key={v.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{v.name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditVendeur(v)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteVendeur(v)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {v.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />{v.phone}
                      </p>
                    )}
                    {v.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />{v.email}
                      </p>
                    )}
                    {v.profession && (
                      <p className="text-xs text-muted-foreground mt-1">{v.profession}</p>
                    )}
                  </div>
                </div>

                {vendeurBiens.length > 0 && (
                  <Collapsible className="mt-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {vendeurBiens.length} bien{vendeurBiens.length > 1 ? "s" : ""} associé{vendeurBiens.length > 1 ? "s" : ""}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {vendeurBiens.map((bien) => (
                        <div key={bien.id} className="rounded-md border p-2 text-sm">
                          <p className="font-medium truncate">{bien.title}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{bien.address}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs font-semibold text-primary">
                              {Number(bien.price).toLocaleString("fr-FR")} FCFA
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {STATUS_LABELS[bien.status] || bien.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {vendeurBiens.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-3 italic">Aucun bien associé</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {editVendeur && (
        <VendeurEditDialog
          vendeur={editVendeur}
          open={!!editVendeur}
          onOpenChange={(o) => { if (!o) setEditVendeur(null); }}
        />
      )}

      <AlertDialog open={!!deleteVendeur} onOpenChange={(o) => { if (!o) setDeleteVendeur(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le vendeur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteVendeur?.name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteVendeur) {
                  deleteMutation.mutate(deleteVendeur.id);
                  setDeleteVendeur(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
