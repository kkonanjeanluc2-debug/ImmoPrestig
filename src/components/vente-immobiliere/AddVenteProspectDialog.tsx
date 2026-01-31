import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateVenteProspect } from "@/hooks/useVenteProspects";
import { useBiensVente } from "@/hooks/useBiensVente";

const formSchema = z.object({
  bien_id: z.string().min(1, "Sélectionnez un bien"),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  interest_level: z.enum(["faible", "moyen", "eleve"]).default("moyen"),
  status: z.enum(["nouveau", "contacte", "interesse", "negociation", "perdu", "converti"]).default("nouveau"),
  source: z.string().optional(),
  budget_min: z.string().optional(),
  budget_max: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddVenteProspectDialogProps {
  children: React.ReactNode;
  defaultBienId?: string;
}

export function AddVenteProspectDialog({ children, defaultBienId }: AddVenteProspectDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: biens } = useBiensVente();
  const createProspect = useCreateVenteProspect();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bien_id: defaultBienId || "",
      name: "",
      phone: "",
      email: "",
      interest_level: "moyen",
      status: "nouveau",
      source: "",
      budget_min: "",
      budget_max: "",
      notes: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createProspect.mutateAsync({
        bien_id: data.bien_id,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        interest_level: data.interest_level,
        status: data.status,
        source: data.source || null,
        budget_min: data.budget_min ? parseFloat(data.budget_min) : null,
        budget_max: data.budget_max ? parseFloat(data.budget_max) : null,
        notes: data.notes || null,
        first_contact_date: new Date().toISOString().split('T')[0],
      });
      toast.success("Prospect ajouté avec succès");
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error("Erreur lors de l'ajout du prospect");
    }
  };

  const availableBiens = biens?.filter(b => b.status !== 'vendu') || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un prospect</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="bien_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bien concerné *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un bien" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableBiens.map((bien) => (
                        <SelectItem key={bien.id} value={bien.id}>
                          {bien.title} - {bien.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom du prospect" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="+225 XX XX XX XX" {...field} />
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
                      <Input type="email" placeholder="email@exemple.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="interest_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niveau d'intérêt</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="faible">Faible</SelectItem>
                        <SelectItem value="moyen">Moyen</SelectItem>
                        <SelectItem value="eleve">Élevé</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nouveau">Nouveau</SelectItem>
                        <SelectItem value="contacte">Contacté</SelectItem>
                        <SelectItem value="interesse">Intéressé</SelectItem>
                        <SelectItem value="negociation">En négociation</SelectItem>
                        <SelectItem value="perdu">Perdu</SelectItem>
                        <SelectItem value="converti">Converti</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Comment a-t-il connu le bien ?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="site_web">Site web</SelectItem>
                      <SelectItem value="reseaux_sociaux">Réseaux sociaux</SelectItem>
                      <SelectItem value="bouche_a_oreille">Bouche à oreille</SelectItem>
                      <SelectItem value="panneau">Panneau sur place</SelectItem>
                      <SelectItem value="agence">Agence</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget minimum (F CFA)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="10000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget maximum (F CFA)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Informations complémentaires..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createProspect.isPending}>
                {createProspect.isPending ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
