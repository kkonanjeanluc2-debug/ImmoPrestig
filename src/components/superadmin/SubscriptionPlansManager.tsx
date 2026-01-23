import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Check, Star, Users, Building2, Crown } from "lucide-react";
import { toast } from "sonner";
import {
  useSubscriptionPlans,
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
  useDeleteSubscriptionPlan,
  SubscriptionPlan,
} from "@/hooks/useSubscriptionPlans";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-CI", {
    style: "decimal",
    minimumFractionDigits: 0,
  }).format(price);
};

interface PlanFormData {
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_properties: number | null;
  max_tenants: number | null;
  max_users: number | null;
  features: string;
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
}

const defaultFormData: PlanFormData = {
  name: "",
  description: "",
  price_monthly: 0,
  price_yearly: 0,
  max_properties: null,
  max_tenants: null,
  max_users: 1,
  features: "",
  is_active: true,
  is_popular: false,
  display_order: 0,
};

export function SubscriptionPlansManager() {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const createPlan = useCreateSubscriptionPlan();
  const updatePlan = useUpdateSubscriptionPlan();
  const deletePlan = useDeleteSubscriptionPlan();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);

  const openCreateDialog = () => {
    setEditingPlan(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      max_properties: plan.max_properties,
      max_tenants: plan.max_tenants,
      max_users: plan.max_users,
      features: Array.isArray(plan.features) ? plan.features.join("\n") : "",
      is_active: plan.is_active,
      is_popular: plan.is_popular,
      display_order: plan.display_order,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Le nom du forfait est requis");
      return;
    }

    const featuresArray = formData.features
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const planData = {
      name: formData.name,
      description: formData.description || null,
      price_monthly: formData.price_monthly,
      price_yearly: formData.price_yearly,
      currency: "XOF",
      max_properties: formData.max_properties,
      max_tenants: formData.max_tenants,
      max_users: formData.max_users,
      features: featuresArray,
      is_active: formData.is_active,
      is_popular: formData.is_popular,
      display_order: formData.display_order,
    };

    try {
      if (editingPlan) {
        await updatePlan.mutateAsync({ id: editingPlan.id, updates: planData });
        toast.success("Forfait mis à jour avec succès");
      } else {
        await createPlan.mutateAsync(planData);
        toast.success("Forfait créé avec succès");
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Une erreur est survenue");
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;

    try {
      await deletePlan.mutateAsync(planToDelete.id);
      toast.success("Forfait supprimé avec succès");
      setIsDeleteDialogOpen(false);
      setPlanToDelete(null);
    } catch (error) {
      toast.error("Impossible de supprimer ce forfait (il est peut-être utilisé)");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Forfaits d'abonnement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Forfaits d'abonnement
            </CardTitle>
            <CardDescription>
              Gérez les forfaits et tarifs adaptés au marché ivoirien (en FCFA)
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau forfait
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forfait</TableHead>
                  <TableHead className="text-right">Prix mensuel</TableHead>
                  <TableHead className="text-right">Prix annuel</TableHead>
                  <TableHead className="text-center">Limites</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans?.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.name}</span>
                        {plan.is_popular && (
                          <Badge variant="default" className="bg-amber-500">
                            <Star className="h-3 w-3 mr-1" />
                            Populaire
                          </Badge>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground">
                          {plan.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(plan.price_monthly)} FCFA
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(plan.price_yearly)} FCFA
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {plan.max_properties ?? "∞"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {plan.max_tenants ?? "∞"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={plan.is_active ? "default" : "secondary"}>
                        {plan.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(plan)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setPlanToDelete(plan);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Modifier le forfait" : "Nouveau forfait"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? "Modifiez les détails du forfait d'abonnement"
                : "Créez un nouveau forfait d'abonnement"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du forfait *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Pro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Ordre d'affichage</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Ex: Pour les agences en croissance"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_monthly">Prix mensuel (FCFA)</Label>
                <Input
                  id="price_monthly"
                  type="number"
                  value={formData.price_monthly}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_monthly: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_yearly">Prix annuel (FCFA)</Label>
                <Input
                  id="price_yearly"
                  type="number"
                  value={formData.price_yearly}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_yearly: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_properties">
                  Max biens (vide = illimité)
                </Label>
                <Input
                  id="max_properties"
                  type="number"
                  value={formData.max_properties ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_properties: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  placeholder="∞"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_tenants">
                  Max locataires (vide = illimité)
                </Label>
                <Input
                  id="max_tenants"
                  type="number"
                  value={formData.max_tenants ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_tenants: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  placeholder="∞"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_users">
                  Max utilisateurs (vide = illimité)
                </Label>
                <Input
                  id="max_users"
                  type="number"
                  value={formData.max_users ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_users: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  placeholder="∞"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">
                Fonctionnalités (une par ligne)
              </Label>
              <Textarea
                id="features"
                value={formData.features}
                onChange={(e) =>
                  setFormData({ ...formData, features: e.target.value })
                }
                placeholder="Gestion de 50 biens&#10;100 locataires max&#10;Rappels automatiques"
                rows={5}
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Forfait actif</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_popular"
                  checked={formData.is_popular}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_popular: checked })
                  }
                />
                <Label htmlFor="is_popular">Marquer comme populaire</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createPlan.isPending || updatePlan.isPending}
            >
              {createPlan.isPending || updatePlan.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {editingPlan ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le forfait</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le forfait "{planToDelete?.name}"
              ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
