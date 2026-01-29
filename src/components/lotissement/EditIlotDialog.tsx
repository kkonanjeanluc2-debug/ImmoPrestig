import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateIlot, Ilot } from "@/hooks/useIlots";
import { toast } from "sonner";
import { useEffect } from "react";

const ilotSchema = z.object({
  name: z.string().min(1, "Le nom de l'îlot est requis").max(50, "Le nom doit faire moins de 50 caractères"),
  description: z.string().optional(),
  total_area: z.number().optional().nullable(),
  plots_count: z.number().optional().nullable(),
});

type IlotFormData = z.infer<typeof ilotSchema>;

interface EditIlotDialogProps {
  ilot: Ilot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditIlotDialog({ ilot, open, onOpenChange }: EditIlotDialogProps) {
  const updateIlot = useUpdateIlot();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IlotFormData>({
    resolver: zodResolver(ilotSchema),
    defaultValues: {
      name: ilot.name,
      description: ilot.description || "",
      total_area: ilot.total_area,
      plots_count: ilot.plots_count,
    },
  });

  useEffect(() => {
    reset({
      name: ilot.name,
      description: ilot.description || "",
      total_area: ilot.total_area,
      plots_count: ilot.plots_count,
    });
  }, [ilot, reset]);

  const onSubmit = async (data: IlotFormData) => {
    try {
      await updateIlot.mutateAsync({
        id: ilot.id,
        name: data.name,
        description: data.description || null,
        total_area: data.total_area || null,
        plots_count: data.plots_count || null,
      });

      toast.success("Îlot modifié avec succès");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de la modification de l'îlot");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier l'îlot</DialogTitle>
          <DialogDescription>
            Modifiez les informations de l'îlot
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'îlot *</Label>
            <Input
              id="name"
              placeholder="Ex: Îlot A, Zone Nord..."
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plots_count">Nombre de lots</Label>
            <Input
              id="plots_count"
              type="number"
              placeholder="Ex: 10"
              {...register("plots_count", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_area">Superficie totale (m²)</Label>
            <Input
              id="total_area"
              type="number"
              placeholder="Ex: 5000"
              {...register("total_area", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description ou notes sur cet îlot..."
              {...register("description")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateIlot.isPending}>
              {updateIlot.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
