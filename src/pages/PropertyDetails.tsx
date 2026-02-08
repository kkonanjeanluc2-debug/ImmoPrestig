import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProperty, useDeleteProperty } from "@/hooks/useProperties";
import { useOwners } from "@/hooks/useOwners";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  Calendar, 
  Pencil, 
  Trash2,
  Home,
  Building,
  Map,
  Loader2,
  User,
  Share2
} from "lucide-react";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { useWhatsAppPropertyMessage } from "@/hooks/useWhatsAppPropertyMessage";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { EditPropertyDialog } from "@/components/property/EditPropertyDialog";
import { PropertyImageGallery } from "@/components/property/PropertyImageGallery";
import { PropertyUnitsManager } from "@/components/property/PropertyUnitsManager";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
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

const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: property, isLoading, error } = useProperty(id || "");
  const { data: owners = [] } = useOwners();
  const deleteProperty = useDeleteProperty();
  const { canEdit, canDelete } = usePermissions();
  const { generateMessage } = useWhatsAppPropertyMessage();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const owner = property?.owner_id ? owners.find(o => o.id === property.owner_id) : null;

  const handleDelete = async () => {
    if (!property) return;
    try {
      await deleteProperty.mutateAsync({ id: property.id, title: property.title });
      toast.success("Bien supprimé avec succès");
      navigate("/properties");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !property) {
    return (
      <DashboardLayout>
        <div className="text-center py-24">
          <p className="text-destructive mb-4">Bien introuvable ou erreur de chargement.</p>
          <Button variant="outline" onClick={() => navigate("/properties")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux biens
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusClasses: Record<string, string> = {
    disponible: "bg-emerald/10 text-emerald border-emerald/20",
    loué: "bg-navy/10 text-navy border-navy/20",
    vendu: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "en attente": "bg-sand text-navy border-sand-dark/20",
  };

  const typeLabels: Record<string, string> = {
    maison: "Maison",
    appartement: "Appartement",
    terrain: "Terrain",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    maison: <Home className="h-5 w-5" />,
    appartement: <Building className="h-5 w-5" />,
    terrain: <Map className="h-5 w-5" />,
  };

  const defaultImage = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate("/properties")} className="shrink-0 mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground truncate">
                {property.title}
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 truncate">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{property.address}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <WhatsAppButton
              message={generateMessage(property)}
              variant="outline"
              size="sm"
              className="bg-emerald/10 border-emerald/30 hover:bg-emerald hover:text-white"
            >
              <Share2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Partager</span>
            </WhatsAppButton>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Modifier</span>
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Supprimer</span>
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image Gallery Section */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Photos</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1.5">
                      {typeIcons[property.property_type]}
                      {typeLabels[property.property_type] || property.property_type}
                    </Badge>
                    <Badge className={cn("border", statusClasses[property.status] || "")}>
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PropertyImageGallery
                  propertyId={property.id}
                  mainImage={property.image_url}
                  canEdit={canEdit}
                />
              </CardContent>
            </Card>

            {/* Description */}
            {property.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {property.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Property Units (Multi-door management) */}
            {property.type === "location" && (
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des portes</CardTitle>
                </CardHeader>
                <CardContent>
                  <PropertyUnitsManager propertyId={property.id} canEdit={canEdit} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info Sidebar */}
          <div className="space-y-4">
            {/* Price Card */}
            <Card className="bg-navy text-primary-foreground">
              <CardContent className="p-6">
                <p className="text-sm opacity-80 mb-1">
                  {property.type === "location" ? "Loyer mensuel" : "Prix de vente"}
                </p>
                <p className="text-3xl font-display font-bold">
                  {property.price.toLocaleString('fr-FR')} F CFA
                  {property.type === "location" && <span className="text-lg font-normal">/mois</span>}
                </p>
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Caractéristiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {property.bedrooms !== null && property.bedrooms !== undefined && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Bed className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Chambres</p>
                        <p className="font-semibold">{property.bedrooms}</p>
                      </div>
                    </div>
                  )}
                  {property.bathrooms !== null && property.bathrooms !== undefined && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Bath className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Salles de bain</p>
                        <p className="font-semibold">{property.bathrooms}</p>
                      </div>
                    </div>
                  )}
                  {property.area && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Maximize className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Surface</p>
                        <p className="font-semibold">{property.area} m²</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type de transaction</span>
                    <span className="font-medium capitalize">{property.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type de bien</span>
                    <span className="font-medium">{typeLabels[property.property_type] || property.property_type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Statut</span>
                    <Badge variant="outline" className={cn("text-xs", statusClasses[property.status])}>
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Owner Info */}
                {owner && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Propriétaire</p>
                      <div 
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => navigate("/owners")}
                      >
                        <div className="p-2 bg-primary/10 rounded-full">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{owner.name}</p>
                          {owner.email && (
                            <p className="text-xs text-muted-foreground">{owner.email}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Créé le {new Date(property.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {property.updated_at !== property.created_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Modifié le {new Date(property.updated_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditPropertyDialog
        property={property}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bien ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{property.title}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default PropertyDetails;
