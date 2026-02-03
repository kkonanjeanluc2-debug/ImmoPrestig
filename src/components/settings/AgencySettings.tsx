import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAgency, AccountType } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Building2, 
  Building, 
  Home, 
  Mail, 
  Phone, 
  MapPin, 
  Save, 
  Loader2, 
  Camera,
  FileText,
  Percent,
  Smartphone
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileMoneyProvider } from "@/hooks/useAgency";

export function AgencySettings() {
  const { user } = useAuth();
  const { data: agency, isLoading } = useAgency();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    account_type: "agence" as AccountType,
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Côte d'Ivoire",
    siret: "",
    reservation_deposit_percentage: "30",
    sale_commission_percentage: "5",
    mobile_money_number: "",
    mobile_money_provider: "" as MobileMoneyProvider | "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when agency data loads
  useState(() => {
    if (agency) {
      setFormData({
        account_type: agency.account_type,
        name: agency.name,
        email: agency.email,
        phone: agency.phone || "",
        address: agency.address || "",
        city: agency.city || "",
        country: agency.country || "Côte d'Ivoire",
        siret: agency.siret || "",
        reservation_deposit_percentage: (agency.reservation_deposit_percentage ?? 30).toString(),
        sale_commission_percentage: ((agency as any).sale_commission_percentage ?? 5).toString(),
        mobile_money_number: agency.mobile_money_number || "",
        mobile_money_provider: agency.mobile_money_provider || "",
      });
      setLogoUrl(agency.logo_url);
    }
  });

  // Update form when agency data changes
  if (agency && !hasChanges) {
    if (formData.name !== agency.name || formData.email !== agency.email) {
      setFormData({
        account_type: agency.account_type,
        name: agency.name,
        email: agency.email,
        phone: agency.phone || "",
        address: agency.address || "",
        city: agency.city || "",
        country: agency.country || "Côte d'Ivoire",
        siret: agency.siret || "",
        reservation_deposit_percentage: (agency.reservation_deposit_percentage ?? 30).toString(),
        sale_commission_percentage: ((agency as any).sale_commission_percentage ?? 5).toString(),
        mobile_money_number: agency.mobile_money_number || "",
        mobile_money_provider: agency.mobile_money_provider || "",
      });
      setLogoUrl(agency.logo_url);
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image valide");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/logo.${fileExt}`;

      // Delete old logo if exists
      if (logoUrl) {
        const oldPath = logoUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('agency-logos').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('agency-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('agency-logos')
        .getPublicUrl(filePath);

      setLogoUrl(urlData.publicUrl);
      setHasChanges(true);
      toast.success("Logo uploadé avec succès");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'upload du logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);

    try {
      if (agency) {
        // Update existing agency
        const { error } = await supabase
          .from('agencies')
          .update({
            account_type: formData.account_type,
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            address: formData.address || null,
            city: formData.city || null,
            country: formData.country,
            siret: formData.siret || null,
            logo_url: logoUrl,
            reservation_deposit_percentage: parseFloat(formData.reservation_deposit_percentage) || 30,
            sale_commission_percentage: parseFloat(formData.sale_commission_percentage) || 5,
            mobile_money_number: formData.mobile_money_number || null,
            mobile_money_provider: formData.mobile_money_provider || null,
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new agency
        const { error } = await supabase
          .from('agencies')
          .insert({
            user_id: user.id,
            account_type: formData.account_type,
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            address: formData.address || null,
            city: formData.city || null,
            country: formData.country,
            siret: formData.siret || null,
            logo_url: logoUrl,
            reservation_deposit_percentage: parseFloat(formData.reservation_deposit_percentage) || 30,
            sale_commission_percentage: parseFloat(formData.sale_commission_percentage) || 5,
            mobile_money_number: formData.mobile_money_number || null,
            mobile_money_provider: formData.mobile_money_provider || null,
          });

        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["agency"] });
      setHasChanges(false);
      toast.success("Informations enregistrées avec succès");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Profil de l'agence
        </CardTitle>
        <CardDescription>
          Gérez les informations de votre {formData.account_type === "agence" ? "agence" : "profil propriétaire"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage src={logoUrl || undefined} alt="Logo" />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {formData.name?.charAt(0)?.toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
          <div>
            <p className="font-medium">Logo</p>
            <p className="text-sm text-muted-foreground">
              JPG, PNG ou GIF. Max 2 Mo.
            </p>
          </div>
        </div>

        {/* Account Type - Read Only */}
        <div className="space-y-2">
          <Label>Type de compte</Label>
          <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary bg-primary/5 w-fit">
            {formData.account_type === "agence" ? (
              <>
                <Building className="h-6 w-6 text-primary" />
                <span className="font-medium">Agence immobilière</span>
              </>
            ) : (
              <>
                <Home className="h-6 w-6 text-primary" />
                <span className="font-medium">Propriétaire</span>
              </>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="agency-name">
            {formData.account_type === "agence" ? "Nom de l'agence *" : "Votre nom *"}
          </Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="agency-name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder={formData.account_type === "agence" ? "Mon Agence Immobilière" : "Jean Dupont"}
              className="pl-10"
            />
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="agency-email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="agency-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="contact@monagence.com"
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="agency-phone">Téléphone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="agency-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+225 07 12 34 56 78"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="agency-address">Adresse</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="agency-address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Cocody Riviera, Rue des Jardins"
              className="pl-10"
            />
          </div>
        </div>

        {/* City & Country */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="agency-city">Ville</Label>
            <Input
              id="agency-city"
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Abidjan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agency-country">Pays</Label>
            <Input
              id="agency-country"
              value={formData.country}
              onChange={(e) => handleChange("country", e.target.value)}
              placeholder="Côte d'Ivoire"
            />
          </div>
        </div>

        {/* SIRET/RC */}
        {formData.account_type === "agence" && (
          <div className="space-y-2">
            <Label htmlFor="agency-siret">N° RCCM / Registre de commerce</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="agency-siret"
                value={formData.siret}
                onChange={(e) => handleChange("siret", e.target.value)}
                placeholder="CI-ABJ-2024-B-12345"
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Reservation Deposit Percentage */}
        <div className="space-y-2">
          <Label htmlFor="reservation-deposit">Acompte de réservation (lotissements)</Label>
          <p className="text-xs text-muted-foreground">
            Pourcentage du prix requis pour réserver une parcelle
          </p>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="reservation-deposit"
              type="number"
              min="5"
              max="100"
              step="5"
              value={formData.reservation_deposit_percentage}
              onChange={(e) => handleChange("reservation_deposit_percentage", e.target.value)}
              placeholder="30"
              className="pl-10"
            />
          </div>
        </div>

        {/* Sale Commission Percentage */}
        <div className="space-y-2">
          <Label htmlFor="sale-commission">Commission sur ventes immobilières (%)</Label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="sale-commission"
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={formData.sale_commission_percentage}
              onChange={(e) => handleChange("sale_commission_percentage", e.target.value)}
              placeholder="5"
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Commission réglementée : 3% à 5% du prix de vente
          </p>
        </div>

        {/* Mobile Money Settings for Rent Collection */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Réception des loyers (Mobile Money)</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Configurez le numéro Mobile Money sur lequel vous recevrez les paiements de loyer des locataires.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mobile-money-provider">Opérateur Mobile Money</Label>
              <Select
                value={formData.mobile_money_provider}
                onValueChange={(value) => handleChange("mobile_money_provider", value)}
              >
                <SelectTrigger id="mobile-money-provider">
                  <SelectValue placeholder="Sélectionner l'opérateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="mtn_money">MTN Mobile Money</SelectItem>
                  <SelectItem value="wave">Wave</SelectItem>
                  <SelectItem value="moov">Moov Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile-money-number">Numéro Mobile Money</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobile-money-number"
                  type="tel"
                  value={formData.mobile_money_number}
                  onChange={(e) => handleChange("mobile_money_number", e.target.value)}
                  placeholder="07 XX XX XX XX"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.name || !formData.email}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
