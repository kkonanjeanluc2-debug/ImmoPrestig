import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Home, ArrowRight, DoorOpen, Download, FileText, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCreateTenant, useUpdateTenant } from "@/hooks/useTenants";
import { useCreateContract } from "@/hooks/useContracts";
import { useProperties, useUpdateProperty } from "@/hooks/useProperties";
import { usePropertyUnits, useUpdatePropertyUnit } from "@/hooks/usePropertyUnits";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { useAgency } from "@/hooks/useAgency";
import { useOwners } from "@/hooks/useOwners";
import { useDefaultContractTemplate } from "@/hooks/useContractTemplates";
import { SubscriptionLimitAlert } from "@/components/subscription/SubscriptionLimitAlert";
import { downloadContractPDF, DEFAULT_CONTRACT_TEMPLATE } from "@/lib/generateContract";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().email("Email invalide").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional(),
  property_id: z.string().uuid("Veuillez sélectionner un bien"),
  unit_id: z.string().optional(),
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
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdContractData, setCreatedContractData] = useState<{
    tenantName: string;
    tenantEmail?: string;
    tenantPhone?: string;
    propertyTitle: string;
    propertyAddress?: string;
    unitNumber?: string;
    rentAmount: number;
    deposit?: number;
    startDate: string;
    endDate: string;
    ownerName?: string;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const createContract = useCreateContract();
  const updateProperty = useUpdateProperty();
  const updatePropertyUnit = useUpdatePropertyUnit();
  const { data: properties, isLoading: propertiesLoading, refetch: refetchProperties } = useProperties();
  const { data: propertyUnits = [] } = usePropertyUnits(selectedPropertyId || undefined);
  const { data: owners } = useOwners();
  const { data: agency } = useAgency();
  const { data: defaultTemplate } = useDefaultContractTemplate();
  const limits = useSubscriptionLimits();

  // Filter only available properties and refetch when dialog opens
  const availableProperties = properties?.filter(p => p.status === 'disponible' || p.type === 'location') || [];
  
  // Filter available units (only those with status 'disponible')
  const availableUnits = propertyUnits.filter(u => u.status === 'disponible');
  
  // Check if property has units
  const selectedProperty = properties?.find(p => p.id === selectedPropertyId);
  const hasUnits = propertyUnits.length > 0;

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      refetchProperties();
      setSelectedPropertyId("");
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      property_id: "",
      unit_id: "",
      start_date: "",
      end_date: "",
      rent_amount: "",
      deposit: "",
    },
  });

  // Watch property_id to load units
  const watchedPropertyId = form.watch("property_id");
  
  useEffect(() => {
    if (watchedPropertyId && watchedPropertyId !== selectedPropertyId) {
      setSelectedPropertyId(watchedPropertyId);
      form.setValue("unit_id", "");
    }
  }, [watchedPropertyId, selectedPropertyId, form]);

  const isSubmitting = createTenant.isPending || createContract.isPending || updateProperty.isPending || updatePropertyUnit.isPending;

  const onSubmit = async (values: FormValues) => {
    try {
      const unitId = values.unit_id && values.unit_id !== "none" ? values.unit_id : null;
      const selectedProp = properties?.find(p => p.id === values.property_id);
      const selectedUnit = unitId ? propertyUnits.find(u => u.id === unitId) : null;
      
      // Create tenant with unit_id if applicable
      const tenant = await createTenant.mutateAsync({
        name: values.name,
        email: values.email || "",
        phone: values.phone || null,
        property_id: values.property_id,
      });

      // Update tenant with unit_id if needed
      if (unitId) {
        await updateTenant.mutateAsync({
          id: tenant.id,
          unit_id: unitId,
        });
      }

      // Create associated contract with unit_id
      await createContract.mutateAsync({
        tenant_id: tenant.id,
        property_id: values.property_id,
        unit_id: unitId,
        start_date: values.start_date,
        end_date: values.end_date,
        rent_amount: parseFloat(values.rent_amount),
        deposit: values.deposit ? parseFloat(values.deposit) : null,
        status: 'active',
      });

      // Update unit status to 'loué' if a unit was selected
      if (unitId) {
        await updatePropertyUnit.mutateAsync({
          id: unitId,
          status: 'loué',
        });
        
        // Check if all units are now occupied
        const remainingAvailableUnits = availableUnits.filter(u => u.id !== unitId);
        if (remainingAvailableUnits.length === 0) {
          // All units occupied, mark property as rented
          await updateProperty.mutateAsync({
            id: values.property_id,
            status: 'loué',
          });
        }
      } else {
        // No units, update property status to 'loué'
        await updateProperty.mutateAsync({
          id: values.property_id,
          status: 'loué',
        });
      }

      // Get owner name if property has an owner
      let ownerName: string | undefined;
      if (selectedProp?.owner_id) {
        const owner = owners?.find(o => o.id === selectedProp.owner_id);
        ownerName = owner?.name;
      }

      // Store contract data for PDF generation
      setCreatedContractData({
        tenantName: values.name,
        tenantEmail: values.email || undefined,
        tenantPhone: values.phone || undefined,
        propertyTitle: selectedProp?.title || "",
        propertyAddress: selectedProp?.address,
        unitNumber: selectedUnit?.unit_number,
        rentAmount: parseFloat(values.rent_amount),
        deposit: values.deposit ? parseFloat(values.deposit) : undefined,
        startDate: values.start_date,
        endDate: values.end_date,
        ownerName,
      });

      toast.success("Locataire et contrat créés avec succès");
      form.reset();
      setSelectedPropertyId("");
      setOpen(false);
      setShowSuccessDialog(true);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating tenant:", error);
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

  const handleDownloadContract = async () => {
    if (!createdContractData) return;
    
    setIsDownloading(true);
    try {
      const templateContent = defaultTemplate?.content || DEFAULT_CONTRACT_TEMPLATE;
      await downloadContractPDF(templateContent, {
        ...createdContractData,
        agency: agency ? {
          name: agency.name,
          email: agency.email,
          phone: agency.phone || undefined,
          address: agency.address || undefined,
          city: agency.city || undefined,
          country: agency.country || undefined,
          logo_url: agency.logo_url,
        } : null,
      });
      toast.success("Contrat téléchargé avec succès");
    } catch (error) {
      console.error("Error downloading contract:", error);
      toast.error("Erreur lors du téléchargement du contrat");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    setCreatedContractData(null);
  };

  // Determine if we can add a tenant
  const getAvailableCount = () => {
    let count = 0;
    for (const property of availableProperties) {
      // Check if property has units
      if (property.type === 'location') {
        // For simplicity, count properties that are available or have available units
        if (property.status === 'disponible') {
          count++;
        }
      }
    }
    return count || availableProperties.filter(p => p.status === 'disponible').length;
  };

  const noPropertiesAvailable = availableProperties.filter(p => p.status === 'disponible').length === 0;
  const isButtonDisabled = !limits.canCreateTenant || noPropertiesAvailable;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="w-full sm:w-auto">
              <DialogTrigger asChild>
                <Button 
                  className="bg-emerald hover:bg-emerald/90 w-full sm:w-auto"
                  disabled={isButtonDisabled}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un locataire
                  {availableProperties.filter(p => p.status === 'disponible').length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-white/20 rounded-full">
                      {availableProperties.filter(p => p.status === 'disponible').length} bien{availableProperties.filter(p => p.status === 'disponible').length > 1 ? 's' : ''}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
            </span>
          </TooltipTrigger>
          {noPropertiesAvailable && (
            <TooltipContent className="flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span>Aucun bien disponible</span>
              </div>
              <Link 
                to="/properties" 
                className="flex items-center gap-1 text-xs text-emerald hover:underline"
              >
                Ajouter un bien
                <ArrowRight className="h-3 w-3" />
              </Link>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
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
                      <Input placeholder="Kouamé Yao" {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="kouame.yao@email.com" {...field} />
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
                        <Input placeholder="+225 07 12 34 56 78" {...field} />
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
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedPropertyId(value);
                        form.setValue("unit_id", "");
                        // Don't auto-fill rent if property has units
                        const selectedProp = availableProperties.find(p => p.id === value);
                        if (selectedProp && !hasUnits) {
                          form.setValue('rent_amount', selectedProp.price.toString());
                        }
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={propertiesLoading ? "Chargement..." : "Choisir un bien"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border z-50">
                        {availableProperties.filter(p => p.status === 'disponible' || p.type === 'location').length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Aucun bien disponible
                          </div>
                        ) : (
                          availableProperties.filter(p => p.status === 'disponible' || p.type === 'location').map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              <div className="flex flex-col">
                                <div className="flex items-center justify-between gap-2">
                                  <span>{property.title}</span>
                                  <span className="text-xs font-medium text-emerald">{property.price.toLocaleString('fr-FR')} F</span>
                                </div>
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

              {/* Unit Selection - Only show if property has units */}
              {selectedPropertyId && hasUnits && (
                <FormField
                  control={form.control}
                  name="unit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DoorOpen className="h-4 w-4" />
                        Sélectionner une porte *
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Auto-fill rent from unit
                          const selectedUnit = propertyUnits.find(u => u.id === value);
                          if (selectedUnit) {
                            form.setValue('rent_amount', selectedUnit.rent_amount.toString());
                          }
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir une porte" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border z-50">
                          {availableUnits.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              Aucune porte disponible
                            </div>
                          ) : (
                            availableUnits.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                <div className="flex items-center justify-between gap-4 w-full">
                                  <div className="flex items-center gap-2">
                                    <DoorOpen className="h-4 w-4 text-primary" />
                                    <span>{unit.unit_number}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {unit.rooms_count} pièce{unit.rooms_count > 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                  <span className="text-xs font-medium text-emerald">
                                    {unit.rent_amount.toLocaleString('fr-FR')} F/mois
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {availableUnits.length === 0 && propertyUnits.length > 0 && (
                        <p className="text-xs text-amber-600">
                          Toutes les portes de ce bien sont occupées.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Info about multi-unit property */}
              {selectedPropertyId && hasUnits && (
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    Ce bien comporte <strong>{propertyUnits.length}</strong> porte{propertyUnits.length > 1 ? 's' : ''}, 
                    dont <strong>{availableUnits.length}</strong> disponible{availableUnits.length > 1 ? 's' : ''}.
                  </p>
                </div>
              )}
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
                disabled={isSubmitting || (hasUnits && availableUnits.length === 0)}
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

      {/* Success Dialog with Download Option */}
      <Dialog open={showSuccessDialog} onOpenChange={handleCloseSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald/10">
                <CheckCircle2 className="h-6 w-6 text-emerald" />
              </div>
              <div>
                <DialogTitle>Locataire créé avec succès !</DialogTitle>
                <DialogDescription>
                  Le contrat a été généré automatiquement.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {createdContractData && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4 text-primary" />
                Résumé du contrat
              </div>
              <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                <span>Locataire :</span>
                <span className="font-medium text-foreground">{createdContractData.tenantName}</span>
                <span>Bien :</span>
                <span className="font-medium text-foreground">{createdContractData.propertyTitle}</span>
                {createdContractData.unitNumber && (
                  <>
                    <span>Unité :</span>
                    <span className="font-medium text-foreground">{createdContractData.unitNumber}</span>
                  </>
                )}
                <span>Loyer :</span>
                <span className="font-medium text-foreground">{createdContractData.rentAmount.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseSuccessDialog}>
              Fermer
            </Button>
            <Button 
              onClick={handleDownloadContract} 
              disabled={isDownloading}
              className="bg-emerald hover:bg-emerald/90"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger le contrat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
