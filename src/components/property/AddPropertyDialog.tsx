import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Home, Building, Loader2, User, ArrowRight, ArrowLeft, DoorOpen, Pencil, Trash2, Copy, Layers } from "lucide-react";
import { toast } from "sonner";
import { GpsPositionInput } from "@/components/shared/GpsPositionInput";
import { supabase } from "@/integrations/supabase/client";
import { useCreateProperty } from "@/hooks/useProperties";
import { useCreatePropertyUnit } from "@/hooks/usePropertyUnits";
import { useOwners } from "@/hooks/useOwners";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { SubscriptionLimitAlert } from "@/components/subscription/SubscriptionLimitAlert";
import { cn } from "@/lib/utils";

type PropertyCategory = "unique" | "immeuble" | null;

interface LocalUnit {
  id: string;
  unit_number: string;
  rooms_count: number;
  rent_amount: number;
  area: number | null;
  status: string;
}

interface AddPropertyDialogProps {
  onSuccess?: () => void;
}

export const AddPropertyDialog = ({ onSuccess }: AddPropertyDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"category" | "form" | "units">("category");
  const [category, setCategory] = useState<PropertyCategory>(null);
  const [formData, setFormData] = useState({
    title: "",
    address: "",
    price: "",
    type: "location",
    property_type: "appartement",
    rent_type: "mensuel",
    daily_rent_days: "",
    daily_rent_discount: "",
    bedrooms: "",
    bathrooms: "",
    area: "",
    description: "",
    image_url: "",
    owner_id: "",
    latitude: "",
    longitude: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [localUnits, setLocalUnits] = useState<LocalUnit[]>([]);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitForm, setUnitForm] = useState({ unit_number: "", rooms_count: 1, rent_amount: 0, area: "" });
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkSourceUnit, setBulkSourceUnit] = useState<LocalUnit | null>(null);
  const createProperty = useCreateProperty();
  const createUnit = useCreatePropertyUnit();
  const { data: owners = [] } = useOwners();
  const limits = useSubscriptionLimits();
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setFormData({
      title: "",
      address: "",
      price: "",
      type: "location",
      property_type: "appartement",
      rent_type: "mensuel",
      daily_rent_days: "",
      daily_rent_discount: "",
      bedrooms: "",
      bathrooms: "",
      area: "",
      description: "",
      image_url: "",
      owner_id: "",
      latitude: "",
      longitude: "",
    });
    setImagePreview(null);
    setStep("category");
    setCategory(null);
    setLocalUnits([]);
    setShowUnitForm(false);
    setEditingUnitId(null);
  };

  const handleCategorySelect = (cat: PropertyCategory) => {
    setCategory(cat);
    if (cat === "unique") {
      setFormData(prev => ({ ...prev, property_type: "appartement" }));
    } else {
      setFormData(prev => ({ ...prev, property_type: "immeuble" }));
    }
    setStep("form");
  };

  const handleFormNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.address) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (category === "immeuble") {
      setStep("units");
    } else {
      handleSubmitFinal();
    }
  };

  const handleSubmitFinal = async () => {
    const isPriceRequired = category !== "immeuble" && formData.property_type !== "maison";
    if (!formData.title || !formData.address || (isPriceRequired && !formData.price)) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      setIsCreating(true);
      const result = await createProperty.mutateAsync({
        title: formData.title,
        address: formData.address,
        price: formData.price ? Number(formData.price) : 0,
        type: formData.type,
        property_type: formData.property_type,
        rent_type: "mensuel",
        daily_rent_days: null,
        daily_rent_discount: 0,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
        area: formData.area ? Number(formData.area) : null,
        description: formData.description || null,
        image_url: formData.image_url || null,
        owner_id: formData.owner_id || null,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
      });

      // Create units if immeuble
      if (category === "immeuble" && result?.id && localUnits.length > 0) {
        for (const unit of localUnits) {
          await createUnit.mutateAsync({
            property_id: result.id,
            unit_number: unit.unit_number,
            rooms_count: unit.rooms_count,
            rent_amount: unit.rent_amount,
            area: unit.area,
            status: unit.status,
          });
        }
      }

      toast.success("Bien ajouté avec succès !");
      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'ajout du bien");
    } finally {
      setIsCreating(false);
    }
  };

  // Local unit management
  const resetUnitForm = () => {
    setUnitForm({ unit_number: "", rooms_count: 1, rent_amount: 0, area: "" });
    setShowUnitForm(false);
    setEditingUnitId(null);
  };

  const addLocalUnit = () => {
    if (!unitForm.unit_number.trim()) {
      toast.error("Le numéro de porte est requis");
      return;
    }
    if (unitForm.rent_amount <= 0) {
      toast.error("Le loyer doit être supérieur à 0");
      return;
    }
    const isDuplicate = localUnits.some(u => u.unit_number.toLowerCase() === unitForm.unit_number.trim().toLowerCase() && u.id !== editingUnitId);
    if (isDuplicate) {
      toast.error("Ce numéro de porte existe déjà");
      return;
    }

    if (editingUnitId) {
      setLocalUnits(prev => prev.map(u => u.id === editingUnitId ? {
        ...u,
        unit_number: unitForm.unit_number.trim(),
        rooms_count: unitForm.rooms_count,
        rent_amount: unitForm.rent_amount,
        area: unitForm.area ? Number(unitForm.area) : null,
      } : u));
    } else {
      setLocalUnits(prev => [...prev, {
        id: crypto.randomUUID(),
        unit_number: unitForm.unit_number.trim(),
        rooms_count: unitForm.rooms_count,
        rent_amount: unitForm.rent_amount,
        area: unitForm.area ? Number(unitForm.area) : null,
        status: "disponible",
      }]);
    }
    resetUnitForm();
  };

  const editLocalUnit = (unit: LocalUnit) => {
    setUnitForm({
      unit_number: unit.unit_number,
      rooms_count: unit.rooms_count,
      rent_amount: unit.rent_amount,
      area: unit.area?.toString() || "",
    });
    setEditingUnitId(unit.id);
    setShowUnitForm(true);
  };

  const deleteLocalUnit = (id: string) => {
    setLocalUnits(prev => prev.filter(u => u.id !== id));
  };

  const addTemplate = (label: string, rooms: number) => {
    const existingCount = localUnits.filter(u => u.unit_number.toLowerCase().includes(label.toLowerCase())).length;
    const unitNumber = `${label} ${existingCount + 1}`;
    const newUnit: LocalUnit = {
      id: crypto.randomUUID(),
      unit_number: unitNumber,
      rooms_count: rooms,
      rent_amount: 0,
      area: null,
      status: "disponible",
    };
    setLocalUnits(prev => [...prev, newUnit]);
    // Open bulk dialog with this unit as source
    setBulkSourceUnit(newUnit);
    setBulkCount(5);
    setShowBulkDialog(true);
  };

  const duplicateUnit = (unit: LocalUnit) => {
    setBulkSourceUnit(unit);
    setBulkCount(5);
    setShowBulkDialog(true);
  };

  const addBulkUnits = () => {
    if (!bulkSourceUnit || bulkCount <= 0) return;
    // Extract base name and current number
    const match = bulkSourceUnit.unit_number.match(/^(.+?)(\d+)$/);
    const baseName = match ? match[1] : bulkSourceUnit.unit_number + " ";
    const startNum = match ? parseInt(match[2]) : 1;

    const newUnits: LocalUnit[] = [];
    for (let i = 1; i <= bulkCount; i++) {
      const num = startNum + i;
      const unitNumber = `${baseName}${num}`;
      // Skip if duplicate
      if (localUnits.some(u => u.unit_number.toLowerCase() === unitNumber.toLowerCase())) continue;
      newUnits.push({
        id: crypto.randomUUID(),
        unit_number: unitNumber,
        rooms_count: bulkSourceUnit.rooms_count,
        rent_amount: bulkSourceUnit.rent_amount,
        area: bulkSourceUnit.area,
        status: "disponible",
      });
    }
    setLocalUnits(prev => [...prev, ...newUnits]);
    setShowBulkDialog(false);
    setBulkSourceUnit(null);
    toast.success(`${newUnits.length} unité${newUnits.length > 1 ? "s" : ""} ajoutée${newUnits.length > 1 ? "s" : ""}`);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("fr-FR").format(amount) + " F CFA";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button 
          className="bg-emerald hover:bg-emerald-dark text-primary-foreground gap-2 w-full sm:w-auto text-sm" 
          size="sm"
          disabled={!limits.canCreateProperty}
        >
          <Plus className="h-4 w-4" />
          <span className="whitespace-nowrap">Ajouter un bien</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {step === "category" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display text-center">Nouveau Bien</DialogTitle>
            </DialogHeader>
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Quel type de bien souhaitez-vous ajouter ?</h3>
              <p className="text-sm text-muted-foreground mt-1">Choisissez le type qui correspond à votre situation</p>
            </div>
            {!limits.canCreateProperty && limits.maxProperties !== null && (
              <SubscriptionLimitAlert
                type="property"
                planName={limits.planName}
                current={limits.currentProperties}
                max={limits.maxProperties}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleCategorySelect("unique")}
                disabled={!limits.canCreateProperty}
                className={cn(
                  "flex flex-col items-center text-center p-6 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Home className="h-7 w-7 text-primary" />
                </div>
                <h4 className="font-semibold text-base mb-1">Bien Unique</h4>
                <p className="text-xs text-muted-foreground mb-3">Villa, bureau, boutique, studio individuel</p>
                <ul className="text-xs text-muted-foreground text-left space-y-1">
                  <li>• Un seul bien à ajouter</li>
                  <li>• Formulaire simple et rapide</li>
                </ul>
              </button>
              <button
                type="button"
                onClick={() => handleCategorySelect("immeuble")}
                disabled={!limits.canCreateProperty}
                className={cn(
                  "flex flex-col items-center text-center p-6 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Building className="h-7 w-7 text-primary" />
                </div>
                <h4 className="font-semibold text-base mb-1">Immeuble</h4>
                <p className="text-xs text-muted-foreground mb-3">Résidence avec plusieurs appartements</p>
                <ul className="text-xs text-muted-foreground text-left space-y-1">
                  <li>• Plusieurs unités à gérer</li>
                  <li>• Duplication et templates rapides</li>
                </ul>
              </button>
            </div>
          </>
        ) : step === "form" ? (
        <>
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Ajouter un nouveau bien</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormNext} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="propertyType">Type de bien *</Label>
            <Select
              value={formData.property_type}
              onValueChange={(value) => setFormData({ ...formData, property_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {category === "unique" ? (
                  <>
                    <SelectItem value="appartement">
                      <div className="flex items-center gap-2"><Building className="h-4 w-4" />Appartement</div>
                    </SelectItem>
                    <SelectItem value="villa">
                      <div className="flex items-center gap-2"><Home className="h-4 w-4" />Villa</div>
                    </SelectItem>
                    <SelectItem value="bureau">
                      <div className="flex items-center gap-2"><Building className="h-4 w-4" />Bureau</div>
                    </SelectItem>
                    <SelectItem value="commerce">
                      <div className="flex items-center gap-2"><Building className="h-4 w-4" />Commerce</div>
                    </SelectItem>
                    <SelectItem value="meuble">
                      <div className="flex items-center gap-2"><Building className="h-4 w-4" />Location meublée</div>
                    </SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="immeuble">
                      <div className="flex items-center gap-2"><Building className="h-4 w-4" />Immeuble</div>
                    </SelectItem>
                    <SelectItem value="maison">
                      <div className="flex items-center gap-2"><Home className="h-4 w-4" />Maison à porte multiple</div>
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Owner Selector */}
          <div className="space-y-2">
            <Label htmlFor="owner">Propriétaire</Label>
            <Select
              value={formData.owner_id}
              onValueChange={(value) => setFormData({ ...formData, owner_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un propriétaire (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Aucun propriétaire</span>
                </SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {owner.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre du bien *</Label>
            <Input
              id="title"
              placeholder="Ex: Villa Les Palmiers"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              placeholder="Ex: Cocody Riviera 3, Abidjan"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {category !== "immeuble" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Loyer mensuel (F CFA) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Ex: 150000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Surface (m²)</Label>
                <Input
                  id="area"
                  type="number"
                  placeholder="Ex: 120"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                />
              </div>
            </div>
          )}

          {category !== "immeuble" && formData.property_type !== "terrain" && formData.property_type !== "maison" && formData.property_type !== "immeuble" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Chambres</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  placeholder="Ex: 3"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Salles de bain</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  placeholder="Ex: 2"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                />
              </div>
            </div>
          )}

          <GpsPositionInput
            latitude={formData.latitude}
            longitude={formData.longitude}
            onChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
          />

          {category !== "immeuble" && (
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Décrivez le bien..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setStep("category")}>
              Retour
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            {category === "immeuble" ? (
              <Button 
                type="submit" 
                className="bg-emerald hover:bg-emerald-dark gap-2" 
              >
                <ArrowRight className="h-4 w-4" />
                Suivant
              </Button>
            ) : (
              <Button 
                type="submit" 
                className="bg-emerald hover:bg-emerald-dark" 
                disabled={createProperty.isPending}
              >
                {createProperty.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Ajouter le bien
              </Button>
            )}
          </div>
        </form>
        </>
        ) : (
        /* Step: Units management */
        <>
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Gestion des Unités</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {/* Property summary */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep("form")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h4 className="font-semibold">{formData.title}</h4>
                <p className="text-sm text-muted-foreground">{formData.address}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">{localUnits.length} unité{localUnits.length > 1 ? "s" : ""}</Badge>
          </div>

          {/* Templates */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Templates:</span>
            <Button type="button" variant="outline" size="sm" onClick={() => addTemplate("Studio", 1)}>+ Studio</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addTemplate("2 pièces", 2)}>+ 2 pièces</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addTemplate("3 pièces", 3)}>+ 3 pièces</Button>
          </div>

          {/* Units list */}
          {localUnits.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {localUnits.map((unit) => (
                <Card key={unit.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <DoorOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{unit.unit_number}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{unit.rooms_count} pièce{unit.rooms_count > 1 ? "s" : ""}</Badge>
                            {unit.area && <span className="text-xs text-muted-foreground">{unit.area}m²</span>}
                          </div>
                          <p className="text-sm font-medium text-primary">{formatCurrency(unit.rent_amount)}/mois</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => editLocalUnit(unit)} title="Modifier">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateUnit(unit)} title="Dupliquer en masse">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteLocalUnit(unit.id)} title="Supprimer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add unit + Add bulk buttons */}
          <div className="flex gap-2">
            {!showUnitForm && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2 border-dashed"
                onClick={() => { resetUnitForm(); setShowUnitForm(true); }}
              >
                <Plus className="h-4 w-4" />
                Ajouter une unité
              </Button>
            )}
            {localUnits.length > 0 && !showUnitForm && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => duplicateUnit(localUnits[localUnits.length - 1])}
              >
                <Layers className="h-4 w-4" />
                Ajouter en masse
              </Button>
            )}
          </div>

          {/* Bulk add dialog */}
          {showBulkDialog && bulkSourceUnit && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-sm">Ajouter plusieurs unités</h4>
                <p className="text-xs text-muted-foreground">
                  Cette action va dupliquer la dernière unité ({bulkSourceUnit.unit_number}) avec les mêmes caractéristiques. Les numéros seront incrémentés automatiquement.
                </p>
                <div className="flex items-center gap-3">
                  <Label className="text-sm whitespace-nowrap">Nombre d'unités à ajouter:</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={bulkCount}
                    onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowBulkDialog(false); setBulkSourceUnit(null); }}>
                    Annuler
                  </Button>
                  <Button type="button" size="sm" className="bg-primary" onClick={addBulkUnits}>
                    Ajouter {bulkCount} unité{bulkCount > 1 ? "s" : ""}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Total */}
          {localUnits.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-medium text-foreground">{formatCurrency(localUnits.reduce((sum, u) => sum + u.rent_amount, 0))}/mois</span>
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {localUnits.length === 0 ? "Ajoutez au moins une unité pour continuer" : `${localUnits.length} unité${localUnits.length > 1 ? "s" : ""} configurée${localUnits.length > 1 ? "s" : ""}`}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("form")}>
                Retour
              </Button>
              <Button
                type="button"
                className="bg-emerald hover:bg-emerald-dark"
                disabled={localUnits.length === 0 || isCreating}
                onClick={handleSubmitFinal}
              >
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer l'immeuble ({localUnits.length} unité{localUnits.length > 1 ? "s" : ""})
              </Button>
            </div>
          </div>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
};
