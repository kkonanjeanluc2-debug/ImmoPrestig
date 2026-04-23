import { useState, useRef } from "react";
import { usePlatformSetting } from "@/hooks/usePlatformSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAgency, AccountType, MobileMoneyProvider, PAYMENT_OPERATORS } from "@/hooks/useAgency";
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
  Smartphone,
  Key,
  Eye,
  EyeOff,
  CalendarDays
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { buildAgencyLoginUrl, createAgencySlug, createDefaultAgencySlug } from "@/lib/agencyBranding";

const HIDDEN_PLANS_FOR_SALE_FIELDS = ["Starter", "Prestige Max"];

export function AgencySettings() {
  const { user } = useAuth();
  const { data: agency, isLoading } = useAgency();
  const { planName } = useFeatureAccess();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loginImageInputRef = useRef<HTMLInputElement>(null);
  const { data: onlineRentConfigSetting } = usePlatformSetting("online_rent_config_enabled");
  const { data: kkiapayGlobalSetting } = usePlatformSetting("kkiapay_enabled");
  const isOnlineRentConfigEnabled = onlineRentConfigSetting?.value !== "false";
  const isKkiapayGloballyEnabled = kkiapayGlobalSetting?.value !== "false";

  const shouldShowSaleFields = !HIDDEN_PLANS_FOR_SALE_FIELDS.includes(planName);

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
    rent_due_day: "10",
    sale_commission_percentage: "5",
    mobile_money_number: "",
    mobile_money_provider: "" as MobileMoneyProvider | "",
    kkiapay_public_key: "",
    kkiapay_private_key: "",
    kkiapay_secret: "",
    kkiapay_sandbox: false,
    geniuspay_public_key: "",
    geniuspay_secret_key: "",
    geniuspay_sandbox: false,
        wave_api_key: "",
    wave_webhook_secret: "",
    wave_sandbox: true,
    notification_email: "",
    notification_whatsapp: "",
    slug: "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loginImageUrl, setLoginImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingLoginImage, setIsUploadingLoginImage] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showGeniusPaySecret, setShowGeniusPaySecret] = useState(false);
  const [showWaveApiKey, setShowWaveApiKey] = useState(false);
  const [showWaveWebhookSecret, setShowWaveWebhookSecret] = useState(false);
  const [onlineRentToggle, setOnlineRentToggle] = useState(false);

  // Load encrypted secrets from Vault for the current agency (only owner/admin can read them)
  const loadVaultSecrets = async (agencyId: string) => {
    const fields = [
      "kkiapay_secret",
      "kkiapay_private_key",
      "wave_api_key",
      "wave_webhook_secret",
      "geniuspay_secret_key",
    ] as const;

    const results = await Promise.all(
      fields.map((field) =>
        supabase.rpc("get_agency_payment_secret", { _agency_id: agencyId, _field: field })
      )
    );

    const secrets: Record<string, string> = {};
    fields.forEach((field, idx) => {
      const { data, error } = results[idx];
      // Silently ignore — non-admin members get a permission error and that's expected.
      if (!error && data) secrets[field] = data as string;
    });
    return secrets;
  };

  const buildFormFromAgency = (agency: any, secrets: Record<string, string> = {}) => ({
    account_type: agency.account_type,
    name: agency.name,
    email: agency.email,
    phone: agency.phone || "",
    address: agency.address || "",
    city: agency.city || "",
    country: agency.country || "Côte d'Ivoire",
    siret: agency.siret || "",
    reservation_deposit_percentage: (agency.reservation_deposit_percentage ?? 30).toString(),
    rent_due_day: ((agency as any).rent_due_day ?? 10).toString(),
    sale_commission_percentage: ((agency as any).sale_commission_percentage ?? 5).toString(),
    mobile_money_number: agency.mobile_money_number || "",
    mobile_money_provider: agency.mobile_money_provider || "",
    kkiapay_public_key: (agency as any).kkiapay_public_key || "",
    kkiapay_private_key: secrets.kkiapay_private_key || "",
    kkiapay_secret: secrets.kkiapay_secret || "",
    kkiapay_sandbox: (agency as any).kkiapay_sandbox || false,
    geniuspay_public_key: (agency as any).geniuspay_public_key || "",
    geniuspay_secret_key: secrets.geniuspay_secret_key || "",
    geniuspay_sandbox: (agency as any).geniuspay_sandbox ?? true,
    wave_api_key: secrets.wave_api_key || "",
    wave_webhook_secret: secrets.wave_webhook_secret || "",
    wave_sandbox: (agency as any).wave_sandbox ?? true,
    notification_email: (agency as any).notification_email || "",
    notification_whatsapp: (agency as any).notification_whatsapp || "",
    slug: agency.slug || "",
  });

  // Initialize form when agency data loads
  useState(() => {
    if (agency) {
      loadVaultSecrets(agency.id).then((secrets) => {
        setFormData(buildFormFromAgency(agency, secrets));
        setLogoUrl(agency.logo_url);
        setLoginImageUrl((agency as any).login_image_url || null);
        setOnlineRentToggle(!!(agency as any).online_rent_enabled);
      });
    }
  });

  // Update form when agency data changes
  if (agency && !hasChanges) {
    if (formData.name !== agency.name || formData.email !== agency.email) {
      loadVaultSecrets(agency.id).then((secrets) => {
        setFormData(buildFormFromAgency(agency, secrets));
        setLogoUrl(agency.logo_url);
        setLoginImageUrl((agency as any).login_image_url || null);
        setOnlineRentToggle(!!(agency as any).online_rent_enabled);
      });
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSlugChange = (value: string) => {
    handleChange("slug", createAgencySlug(value));
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
      // Common, non-sensitive fields stored on `agencies`. Sensitive secrets
      // (kkiapay_secret/private_key, wave_api_key/webhook_secret, geniuspay_secret_key)
      // are persisted separately into the encrypted Vault via RPC.
      const baseFields = {
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
        rent_due_day: parseInt(formData.rent_due_day) || 10,
        sale_commission_percentage: parseFloat(formData.sale_commission_percentage) || 5,
        mobile_money_number: formData.mobile_money_number || null,
        mobile_money_provider: formData.mobile_money_provider || null,
        kkiapay_public_key: formData.kkiapay_public_key || null,
        kkiapay_sandbox: formData.kkiapay_sandbox,
        geniuspay_public_key: formData.geniuspay_public_key || null,
        geniuspay_sandbox: formData.geniuspay_sandbox,
        wave_sandbox: formData.wave_sandbox,
        online_rent_enabled: onlineRentToggle,
        notification_email: formData.notification_email || null,
        notification_whatsapp: formData.notification_whatsapp || null,
      };

      let agencyId: string | null = agency?.id ?? null;

      if (agency) {
        const { error } = await supabase
          .from('agencies')
          .update(baseFields)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from('agencies')
          .insert([{ user_id: user.id, ...baseFields }])
          .select('id')
          .single();
        if (error) throw error;
        agencyId = created?.id ?? null;
      }

      // Persist sensitive secrets through the encrypted Vault.
      // Authorisation is enforced inside the RPC: only owner/admin can set them.
      if (agencyId) {
        const secretFields: Array<{ field: string; value: string }> = [
          { field: "kkiapay_secret", value: formData.kkiapay_secret },
          { field: "kkiapay_private_key", value: formData.kkiapay_private_key },
          { field: "wave_api_key", value: formData.wave_api_key },
          { field: "wave_webhook_secret", value: formData.wave_webhook_secret },
          { field: "geniuspay_secret_key", value: formData.geniuspay_secret_key },
        ];

        for (const { field, value } of secretFields) {
          const { error: rpcError } = await supabase.rpc("set_agency_payment_secret", {
            _agency_id: agencyId,
            _field: field,
            _value: value || "",
          });
          // Silently ignore permission errors (non-admin saving non-sensitive form).
          if (rpcError && !/Not authorised/i.test(rpcError.message)) {
            throw rpcError;
          }
        }
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

        {/* Reservation Deposit Percentage - Hidden for Starter and Prestige Max */}
        {shouldShowSaleFields && (
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
        )}

        {/* Rent Due Day */}
        <div className="space-y-2">
          <Label htmlFor="rent-due-day">Jour d'échéance du loyer</Label>
          <p className="text-xs text-muted-foreground">
            Jour du mois où le loyer est dû (ex: 5 = le 5 de chaque mois)
          </p>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="rent-due-day"
              type="number"
              min="1"
              max="28"
              step="1"
              value={formData.rent_due_day}
              onChange={(e) => handleChange("rent_due_day", e.target.value)}
              placeholder="10"
              className="pl-10"
            />
          </div>
        </div>

        {/* Sale Commission Percentage - Hidden for Starter and Prestige Max */}
        {shouldShowSaleFields && (
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
        )}

        {/* Online Rent Payment Settings */}
        {isOnlineRentConfigEnabled && (
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Paiement des loyers en ligne</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Configurez le mode de paiement et le numéro sur lequel vous recevrez les loyers payés en ligne par vos locataires via KKiaPay.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mobile-money-provider">Moyen de paiement préféré</Label>
              <Select
                value={formData.mobile_money_provider}
                onValueChange={(value) => handleChange("mobile_money_provider", value)}
              >
                <SelectTrigger id="mobile-money-provider">
                  <SelectValue placeholder="Sélectionner l'opérateur" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPERATORS.map((operator) => (
                    <SelectItem key={operator.value} value={operator.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${operator.color}`} />
                        <span>{operator.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tous les paiements sont traités via KKiaPay.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile-money-number">
                Numéro de réception
              </Label>
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
              <p className="text-xs text-muted-foreground">
                Ce numéro recevra les loyers payés en ligne.
              </p>
            </div>
          </div>

          {!formData.mobile_money_provider && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
              <strong className="text-foreground">Note :</strong> Configurez un moyen de paiement pour permettre à vos locataires de payer leurs loyers en ligne.
            </div>
          )}
        </div>
        )}


        {/* Online Rent Toggle + KKiaPay API Configuration */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-medium">Paiement de loyers en ligne</h3>
                <p className="text-sm text-muted-foreground">
                  Permettre aux locataires de payer leur loyer en ligne
                </p>
              </div>
            </div>
            <Switch
              id="online-rent-toggle"
              checked={onlineRentToggle}
              onCheckedChange={(checked) => {
                setOnlineRentToggle(checked);
                setHasChanges(true);
              }}
            />
          </div>

          {onlineRentToggle && isKkiapayGloballyEnabled && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Configuration KKiaPay</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Entrez vos clés API KKiaPay pour activer le paiement des loyers en ligne. Vous pouvez obtenir vos clés sur <a href="https://app.kkiapay.me" target="_blank" rel="noopener noreferrer" className="text-primary underline">app.kkiapay.me</a>.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kkiapay-public-key">Clé publique</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="kkiapay-public-key"
                      value={formData.kkiapay_public_key}
                      onChange={(e) => handleChange("kkiapay_public_key", e.target.value)}
                      placeholder="pk_xxxxxxxxxxxxxxx"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kkiapay-private-key">Clé privée</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="kkiapay-private-key"
                      type={showPrivateKey ? "text" : "password"}
                      value={formData.kkiapay_private_key}
                      onChange={(e) => handleChange("kkiapay_private_key", e.target.value)}
                      placeholder="prk_xxxxxxxxxxxxxxx"
                      className="pl-10 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                    >
                      {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kkiapay-secret">Secret</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="kkiapay-secret"
                      type={showSecret ? "text" : "password"}
                      value={formData.kkiapay_secret}
                      onChange={(e) => handleChange("kkiapay_secret", e.target.value)}
                      placeholder="sk_xxxxxxxxxxxxxxx"
                      className="pl-10 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="kkiapay-sandbox"
                    checked={formData.kkiapay_sandbox}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({ ...prev, kkiapay_sandbox: checked }));
                      setHasChanges(true);
                    }}
                  />
                  <Label htmlFor="kkiapay-sandbox" className="cursor-pointer">
                    Mode Sandbox (test)
                  </Label>
                </div>

                {!formData.kkiapay_public_key && (
                  <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                    <strong className="text-foreground">Note :</strong> Configurez vos clés KKiaPay pour que vos locataires puissent payer leurs loyers en ligne directement depuis leur portail.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* GeniusPay Configuration */}
        {onlineRentToggle && (
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-emerald-600" />
              <h3 className="font-medium">Configuration GeniusPay</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Entrez vos clés API GeniusPay pour activer les paiements via Wave, Orange Money, MTN et Carte. Obtenez vos clés sur <a href="https://pay.genius.ci" target="_blank" rel="noopener noreferrer" className="text-primary underline">pay.genius.ci</a>.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="geniuspay-public-key">Clé publique</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="geniuspay-public-key"
                    value={formData.geniuspay_public_key}
                    onChange={(e) => handleChange("geniuspay_public_key", e.target.value)}
                    placeholder="pk_live_xxxxxxxxxxxxxxx"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="geniuspay-secret-key">Clé secrète</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="geniuspay-secret-key"
                    type={showGeniusPaySecret ? "text" : "password"}
                    value={formData.geniuspay_secret_key}
                    onChange={(e) => handleChange("geniuspay_secret_key", e.target.value)}
                    placeholder="sk_live_xxxxxxxxxxxxxxx"
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowGeniusPaySecret(!showGeniusPaySecret)}
                  >
                    {showGeniusPaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="geniuspay-sandbox"
                  checked={formData.geniuspay_sandbox}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({ ...prev, geniuspay_sandbox: checked }));
                    setHasChanges(true);
                  }}
                />
                <Label htmlFor="geniuspay-sandbox" className="cursor-pointer">
                  Mode Sandbox (test)
                </Label>
              </div>

              {!formData.geniuspay_public_key && (
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                  <strong className="text-foreground">Note :</strong> Configurez vos clés GeniusPay pour offrir Wave, Orange Money, MTN et les paiements par carte à vos locataires.
                </div>
              )}
            </div>
          </div>
        )}


        {/* Notifications Requêtes Locataires */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Notifications des requêtes locataires</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Configurez les coordonnées pour recevoir automatiquement les requêtes soumises par vos locataires.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notification-email">Email de notification</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="notification-email"
                  type="email"
                  value={formData.notification_email}
                  onChange={(e) => handleChange("notification_email", e.target.value)}
                  placeholder="notifications@monagence.com"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Recevez un email à chaque nouvelle requête locataire.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-whatsapp">WhatsApp de notification</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="notification-whatsapp"
                  type="text"
                  value={formData.notification_whatsapp}
                  onChange={(e) => handleChange("notification_whatsapp", e.target.value)}
                  placeholder="+225 07 XX XX XX XX ou 0788645270"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Un lien WhatsApp sera ouvert pour notifier de la requête.
              </p>
            </div>
          </div>
        </div>

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
