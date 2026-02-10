import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlatformSettings, useUpdatePlatformSetting, useUpsertPlatformSetting } from "@/hooks/usePlatformSettings";
import { Settings, Save, Loader2, MessageCircle, Percent, CreditCard, Wallet, Smartphone, Mail } from "lucide-react";
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
  const [resendEmailEnabled, setResendEmailEnabled] = useState(true);
  const [mailerooEmailEnabled, setMailerooEmailEnabled] = useState(true);
  const [emailProvider, setEmailProvider] = useState("resend");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      const demoSetting = settings.find(s => s.key === "whatsapp_demo_number");
      if (demoSetting?.value) setWhatsappNumber(demoSetting.value);
      
      const discountSetting = settings.find(s => s.key === "yearly_discount_percentage");
      if (discountSetting?.value) setYearlyDiscount(discountSetting.value);
      
      const onlinePaymentSetting = settings.find(s => s.key === "online_rent_payment_enabled");
      if (onlinePaymentSetting?.value !== undefined) setOnlineRentPaymentEnabled(onlinePaymentSetting.value === "true");
      
      const onlineAccountSetting = settings.find(s => s.key === "online_rent_account_enabled");
      if (onlineAccountSetting?.value !== undefined) setOnlineRentAccountEnabled(onlineAccountSetting.value === "true");
      
      const onlineConfigSetting = settings.find(s => s.key === "online_rent_config_enabled");
      if (onlineConfigSetting?.value !== undefined) setOnlineRentConfigEnabled(onlineConfigSetting.value === "true");
      
      const resendSetting = settings.find(s => s.key === "resend_email_enabled");
      if (resendSetting?.value !== undefined) setResendEmailEnabled(resendSetting.value === "true");

      const mailerooSetting = settings.find(s => s.key === "maileroo_email_enabled");
      if (mailerooSetting?.value !== undefined) setMailerooEmailEnabled(mailerooSetting.value === "true");

      const providerSetting = settings.find(s => s.key === "email_provider");
      if (providerSetting?.value) setEmailProvider(providerSetting.value);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "whatsapp_demo_number", value: whatsappNumber }),
        upsertSetting.mutateAsync({ key: "yearly_discount_percentage", value: yearlyDiscount, description: "Pourcentage de réduction affiché pour les abonnements annuels" }),
        upsertSetting.mutateAsync({ key: "online_rent_payment_enabled", value: String(onlineRentPaymentEnabled), description: "Activer ou désactiver le paiement de loyers en ligne pour tous les locataires" }),
        upsertSetting.mutateAsync({ key: "online_rent_account_enabled", value: String(onlineRentAccountEnabled), description: "Activer ou désactiver l'onglet Compte pour le suivi des fonds en ligne" }),
        upsertSetting.mutateAsync({ key: "online_rent_config_enabled", value: String(onlineRentConfigEnabled), description: "Activer ou désactiver la configuration de paiement en ligne dans les paramètres agence" }),
        upsertSetting.mutateAsync({ key: "resend_email_enabled", value: String(resendEmailEnabled), description: "Activer ou désactiver l'envoi d'emails via Resend" }),
        upsertSetting.mutateAsync({ key: "maileroo_email_enabled", value: String(mailerooEmailEnabled), description: "Activer ou désactiver l'envoi d'emails via Maileroo" }),
        upsertSetting.mutateAsync({ key: "email_provider", value: emailProvider, description: "Fournisseur d'emails actif: resend ou maileroo" }),
      ]);
      setHasChanges(false);
      toast.success("Paramètres enregistrés");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    }
  };

  const setChanged = () => setHasChanges(true);

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
          {/* WhatsApp */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp-demo" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" />
              Numéro WhatsApp pour les demandes de démo
            </Label>
            <Input id="whatsapp-demo" type="tel" placeholder="+225 07 00 00 00 00"
              value={whatsappNumber} onChange={(e) => { setWhatsappNumber(e.target.value); setChanged(); }} />
            <p className="text-xs text-muted-foreground">
              Ce numéro sera utilisé pour le bouton "Demandez votre démo gratuite" sur les pages publiques
            </p>
          </div>

          {/* Yearly discount */}
          <div className="space-y-2">
            <Label htmlFor="yearly-discount" className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Réduction abonnement annuel
            </Label>
            <div className="flex items-center gap-2">
              <Input id="yearly-discount" type="number" min="0" max="100" placeholder="20"
                value={yearlyDiscount} className="w-24"
                onChange={(e) => {
                  const numValue = parseInt(e.target.value, 10);
                  if (e.target.value === "" || (!isNaN(numValue) && numValue >= 0 && numValue <= 100)) {
                    setYearlyDiscount(e.target.value); setChanged();
                  }
                }} />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pourcentage affiché sur la page des tarifs pour les abonnements annuels
            </p>
          </div>

          {/* Online rent payment */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="online-rent-payment" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Paiement de loyers en ligne
              </Label>
              <p className="text-xs text-muted-foreground">Permettre aux locataires de payer leur loyer en ligne</p>
            </div>
            <Switch id="online-rent-payment" checked={onlineRentPaymentEnabled}
              onCheckedChange={(v) => { setOnlineRentPaymentEnabled(v); setChanged(); }} />
          </div>

          {/* Online rent account */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="online-rent-account" className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Onglet Compte (fonds en ligne)
              </Label>
              <p className="text-xs text-muted-foreground">Afficher l'onglet Compte pour le suivi des fonds encaissés en ligne</p>
            </div>
            <Switch id="online-rent-account" checked={onlineRentAccountEnabled}
              onCheckedChange={(v) => { setOnlineRentAccountEnabled(v); setChanged(); }} />
          </div>

          {/* Online rent config */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="online-rent-config" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                Configuration paiement en ligne (agences)
              </Label>
              <p className="text-xs text-muted-foreground">Afficher la section de configuration du paiement en ligne dans les paramètres des agences</p>
            </div>
            <Switch id="online-rent-config" checked={onlineRentConfigEnabled}
              onCheckedChange={(v) => { setOnlineRentConfigEnabled(v); setChanged(); }} />
          </div>

          {/* Email provider selector */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Mail className="h-5 w-5 text-primary" />
              Configuration des emails
            </Label>
            
            <div className="space-y-2">
              <Label htmlFor="email-provider">Fournisseur d'emails actif</Label>
              <Select value={emailProvider} onValueChange={(v) => { setEmailProvider(v); setChanged(); }}>
                <SelectTrigger id="email-provider" className="w-full">
                  <SelectValue placeholder="Choisir le fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="maileroo">Maileroo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Le fournisseur sélectionné sera utilisé pour tous les envois d'emails (quittances, rappels, rapports, etc.)
              </p>
            </div>

            {/* Resend toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
              <div className="space-y-0.5">
                <Label htmlFor="resend-email" className="text-sm">
                  Envoi d'emails via Resend
                </Label>
                <p className="text-xs text-muted-foreground">
                  {emailProvider === "resend" ? "⚡ Fournisseur actif" : "Inactif (Maileroo est sélectionné)"}
                </p>
              </div>
              <Switch id="resend-email" checked={resendEmailEnabled}
                onCheckedChange={(v) => { setResendEmailEnabled(v); setChanged(); }} />
            </div>

            {/* Maileroo toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
              <div className="space-y-0.5">
                <Label htmlFor="maileroo-email" className="text-sm">
                  Envoi d'emails via Maileroo
                </Label>
                <p className="text-xs text-muted-foreground">
                  {emailProvider === "maileroo" ? "⚡ Fournisseur actif" : "Inactif (Resend est sélectionné)"}
                </p>
              </div>
              <Switch id="maileroo-email" checked={mailerooEmailEnabled}
                onCheckedChange={(v) => { setMailerooEmailEnabled(v); setChanged(); }} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave}
            disabled={updateSetting.isPending || upsertSetting.isPending || !hasChanges}>
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
