import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePlatformSettings, useUpdatePlatformSetting, useUpsertPlatformSetting } from "@/hooks/usePlatformSettings";
import { Settings, Save, Loader2, MessageCircle, Percent, CreditCard, Wallet, Smartphone } from "lucide-react";
import { toast } from "sonner";

export function PlatformSettingsCard() {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const upsertSetting = useUpsertPlatformSetting();
  
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [yearlyDiscount, setYearlyDiscount] = useState("20");
  const [onlineRentPaymentEnabled, setOnlineRentPaymentEnabled] = useState(true);
  const [onlineRentAccountEnabled, setOnlineRentAccountEnabled] = useState(true);
  const [onlineRentConfigEnabled, setOnlineRentConfigEnabled] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      const demoSetting = settings.find(s => s.key === "whatsapp_demo_number");
      if (demoSetting?.value) {
        setWhatsappNumber(demoSetting.value);
      }
      const discountSetting = settings.find(s => s.key === "yearly_discount_percentage");
      if (discountSetting?.value) {
        setYearlyDiscount(discountSetting.value);
      }
      const onlinePaymentSetting = settings.find(s => s.key === "online_rent_payment_enabled");
      if (onlinePaymentSetting?.value !== undefined) {
        setOnlineRentPaymentEnabled(onlinePaymentSetting.value === "true");
      }
      const onlineAccountSetting = settings.find(s => s.key === "online_rent_account_enabled");
      if (onlineAccountSetting?.value !== undefined) {
        setOnlineRentAccountEnabled(onlineAccountSetting.value === "true");
      }
      const onlineConfigSetting = settings.find(s => s.key === "online_rent_config_enabled");
      if (onlineConfigSetting?.value !== undefined) {
        setOnlineRentConfigEnabled(onlineConfigSetting.value === "true");
      }
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({
          key: "whatsapp_demo_number",
          value: whatsappNumber,
        }),
        upsertSetting.mutateAsync({
          key: "yearly_discount_percentage",
          value: yearlyDiscount,
          description: "Pourcentage de réduction affiché pour les abonnements annuels",
        }),
        upsertSetting.mutateAsync({
          key: "online_rent_payment_enabled",
          value: String(onlineRentPaymentEnabled),
          description: "Activer ou désactiver le paiement de loyers en ligne pour tous les locataires",
        }),
        upsertSetting.mutateAsync({
          key: "online_rent_account_enabled",
          value: String(onlineRentAccountEnabled),
          description: "Activer ou désactiver l'onglet Compte pour le suivi des fonds en ligne",
        }),
        upsertSetting.mutateAsync({
          key: "online_rent_config_enabled",
          value: String(onlineRentConfigEnabled),
          description: "Activer ou désactiver la configuration de paiement en ligne dans les paramètres agence",
        }),
      ]);
      setHasChanges(false);
      toast.success("Paramètres enregistrés");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleWhatsappChange = (value: string) => {
    setWhatsappNumber(value);
    setHasChanges(true);
  };

  const handleDiscountChange = (value: string) => {
    // Only allow numbers between 0 and 100
    const numValue = parseInt(value, 10);
    if (value === "" || (!isNaN(numValue) && numValue >= 0 && numValue <= 100)) {
      setYearlyDiscount(value);
      setHasChanges(true);
    }
  };

  const handleOnlinePaymentToggle = (checked: boolean) => {
    setOnlineRentPaymentEnabled(checked);
    setHasChanges(true);
  };

  const handleOnlineAccountToggle = (checked: boolean) => {
    setOnlineRentAccountEnabled(checked);
    setHasChanges(true);
  };

  const handleOnlineConfigToggle = (checked: boolean) => {
    setOnlineRentConfigEnabled(checked);
    setHasChanges(true);
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
          <Settings className="h-5 w-5" />
          Paramètres de la plateforme
        </CardTitle>
        <CardDescription>
          Configuration générale de la plateforme visible par tous les utilisateurs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-demo" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" />
              Numéro WhatsApp pour les demandes de démo
            </Label>
            <Input
              id="whatsapp-demo"
              type="tel"
              placeholder="+225 07 00 00 00 00"
              value={whatsappNumber}
              onChange={(e) => handleWhatsappChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ce numéro sera utilisé pour le bouton "Demandez votre démo gratuite" sur les pages publiques
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearly-discount" className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Réduction abonnement annuel
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="yearly-discount"
                type="number"
                min="0"
                max="100"
                placeholder="20"
                value={yearlyDiscount}
                onChange={(e) => handleDiscountChange(e.target.value)}
                className="w-24"
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pourcentage affiché sur la page des tarifs pour les abonnements annuels (ex: "Économisez jusqu'à 20%")
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="online-rent-payment" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Paiement de loyers en ligne
              </Label>
              <p className="text-xs text-muted-foreground">
                Permettre aux locataires de payer leur loyer en ligne via le portail locataire
              </p>
            </div>
            <Switch
              id="online-rent-payment"
              checked={onlineRentPaymentEnabled}
              onCheckedChange={handleOnlinePaymentToggle}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="online-rent-account" className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Onglet Compte (fonds en ligne)
              </Label>
              <p className="text-xs text-muted-foreground">
                Afficher l'onglet Compte pour le suivi des fonds encaissés en ligne et les demandes de reversement
              </p>
            </div>
            <Switch
              id="online-rent-account"
              checked={onlineRentAccountEnabled}
              onCheckedChange={handleOnlineAccountToggle}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="online-rent-config" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                Configuration paiement en ligne (agences)
              </Label>
              <p className="text-xs text-muted-foreground">
                Afficher la section de configuration du paiement en ligne dans les paramètres des agences
              </p>
            </div>
            <Switch
              id="online-rent-config"
              checked={onlineRentConfigEnabled}
              onCheckedChange={handleOnlineConfigToggle}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateSetting.isPending || upsertSetting.isPending || !hasChanges}
          >
            {(updateSetting.isPending || upsertSetting.isPending) ? (
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
