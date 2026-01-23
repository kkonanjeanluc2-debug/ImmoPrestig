import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare, Clock, Loader2, BellRing } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationPrefs {
  emailEnabled: boolean;
  smsEnabled: boolean;
  paymentReminders: boolean;
  contractExpiry: boolean;
  reminderDaysBefore: number;
}

export function NotificationSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const { 
    isSupported: pushSupported, 
    isEnabled: pushEnabled, 
    isLoading: pushLoading,
    permission: pushPermission,
    togglePushNotifications 
  } = usePushNotifications();
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    emailEnabled: true,
    smsEnabled: true,
    paymentReminders: true,
    contractExpiry: true,
    reminderDaysBefore: 3,
  });

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem("notificationPrefs");
    if (saved) {
      setPrefs(JSON.parse(saved));
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate save delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    localStorage.setItem("notificationPrefs", JSON.stringify(prefs));
    
    toast({
      title: "Préférences enregistrées",
      description: "Vos préférences de notification ont été mises à jour.",
    });
    
    setIsSaving(false);
  };

  const updatePref = <K extends keyof NotificationPrefs>(
    key: K,
    value: NotificationPrefs[K]
  ) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
        <CardDescription>
          Configurez vos alertes email et SMS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Canaux de notification
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <Label htmlFor="email-notif" className="text-base font-medium">
                    Notifications par email
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des alertes par email
                  </p>
                </div>
              </div>
              <Switch
                id="email-notif"
                checked={prefs.emailEnabled}
                onCheckedChange={(checked) => updatePref("emailEnabled", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <Label htmlFor="sms-notif" className="text-base font-medium">
                    Notifications par SMS
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des alertes par SMS
                  </p>
                </div>
              </div>
              <Switch
                id="sms-notif"
                checked={prefs.smsEnabled}
                onCheckedChange={(checked) => updatePref("smsEnabled", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BellRing className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <Label htmlFor="push-notif" className="text-base font-medium">
                    Notifications push navigateur
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {!pushSupported 
                      ? "Non supporté par votre navigateur"
                      : pushPermission === "denied"
                      ? "Bloqué - Activez dans les paramètres du navigateur"
                      : "Recevoir des alertes même hors de l'application"}
                  </p>
                </div>
              </div>
              <Switch
                id="push-notif"
                checked={pushEnabled}
                disabled={!pushSupported || pushPermission === "denied" || pushLoading}
                onCheckedChange={togglePushNotifications}
              />
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Types de notifications
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="payment-reminder" className="text-base font-medium">
                  Rappels de paiement
                </Label>
                <p className="text-sm text-muted-foreground">
                  Alerte avant l'échéance des loyers
                </p>
              </div>
              <Switch
                id="payment-reminder"
                checked={prefs.paymentReminders}
                onCheckedChange={(checked) => updatePref("paymentReminders", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="contract-expiry" className="text-base font-medium">
                  Expiration de contrats
                </Label>
                <p className="text-sm text-muted-foreground">
                  Alerte avant la fin des contrats
                </p>
              </div>
              <Switch
                id="contract-expiry"
                checked={prefs.contractExpiry}
                onCheckedChange={(checked) => updatePref("contractExpiry", checked)}
              />
            </div>
          </div>
        </div>

        {/* Timing Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Délais de rappel
          </h3>

          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <Label htmlFor="reminder-days" className="text-base font-medium">
                Jours avant l'échéance
              </Label>
              <p className="text-sm text-muted-foreground">
                Envoyer le rappel X jours avant la date d'échéance
              </p>
            </div>
            <Input
              id="reminder-days"
              type="number"
              min={1}
              max={30}
              value={prefs.reminderDaysBefore}
              onChange={(e) =>
                updatePref("reminderDaysBefore", parseInt(e.target.value) || 3)
              }
              className="w-20"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            "Enregistrer les préférences"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
