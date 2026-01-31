import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlatformSettings, useUpdatePlatformSetting, useUpsertPlatformSetting } from "@/hooks/usePlatformSettings";
import { Settings, Save, Loader2, MessageCircle, Percent } from "lucide-react";
import { toast } from "sonner";

export function PlatformSettingsCard() {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const upsertSetting = useUpsertPlatformSetting();
  
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [yearlyDiscount, setYearlyDiscount] = useState("20");
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
