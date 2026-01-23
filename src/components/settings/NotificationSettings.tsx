import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare, Clock, Loader2, BellRing, Volume2, Play, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotificationSound, NotificationSoundType } from "@/hooks/useNotificationSound";
import { useDoNotDisturb, DNDSchedule } from "@/hooks/useDoNotDisturb";
import { Checkbox } from "@/components/ui/checkbox";

interface NotificationPrefs {
  emailEnabled: boolean;
  smsEnabled: boolean;
  paymentReminders: boolean;
  contractExpiry: boolean;
  reminderDaysBefore: number;
  soundsEnabled: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Dim" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
];

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
  const { testSound } = useNotificationSound();
  const { getSchedule, saveSchedule, isInDNDPeriod } = useDoNotDisturb();
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    emailEnabled: true,
    smsEnabled: true,
    paymentReminders: true,
    contractExpiry: true,
    reminderDaysBefore: 3,
    soundsEnabled: true,
  });
  const [dndSchedule, setDndSchedule] = useState<DNDSchedule>({
    enabled: false,
    startTime: "22:00",
    endTime: "07:00",
    days: [0, 1, 2, 3, 4, 5, 6],
  });

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem("notificationPrefs");
    if (saved) {
      setPrefs(JSON.parse(saved));
    }
    // Load DND schedule
    setDndSchedule(getSchedule());
  }, [getSchedule]);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate save delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    localStorage.setItem("notificationPrefs", JSON.stringify(prefs));
    localStorage.setItem("notificationSoundsEnabled", String(prefs.soundsEnabled));
    saveSchedule(dndSchedule);
    
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

  const updateDND = <K extends keyof DNDSchedule>(
    key: K,
    value: DNDSchedule[K]
  ) => {
    setDndSchedule((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDNDDay = (day: number) => {
    setDndSchedule((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day].sort(),
    }));
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

        {/* Sound Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Sons de notification
          </h3>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Volume2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <Label htmlFor="sounds-enabled" className="text-base font-medium">
                  Activer les sons
                </Label>
                <p className="text-sm text-muted-foreground">
                  Jouer un son lors des nouvelles notifications
                </p>
              </div>
            </div>
            <Switch
              id="sounds-enabled"
              checked={prefs.soundsEnabled}
              onCheckedChange={(checked) => updatePref("soundsEnabled", checked)}
            />
          </div>

          {prefs.soundsEnabled && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
              <p className="col-span-full text-sm text-muted-foreground mb-2">
                Tester les sons :
              </p>
              {([
                { type: "payment" as NotificationSoundType, label: "Paiement", color: "bg-emerald-500" },
                { type: "contract" as NotificationSoundType, label: "Contrat", color: "bg-blue-500" },
                { type: "warning" as NotificationSoundType, label: "Alerte", color: "bg-amber-500" },
                { type: "error" as NotificationSoundType, label: "Erreur", color: "bg-red-500" },
                { type: "success" as NotificationSoundType, label: "Succès", color: "bg-green-500" },
                { type: "info" as NotificationSoundType, label: "Info", color: "bg-sky-500" },
              ]).map(({ type, label, color }) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2"
                  onClick={() => testSound(type)}
                >
                  <div className={`h-2 w-2 rounded-full ${color}`} />
                  <Play className="h-3 w-3" />
                  {label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Do Not Disturb Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Ne pas déranger
          </h3>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Moon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <Label htmlFor="dnd-enabled" className="text-base font-medium">
                  Mode Ne pas déranger
                </Label>
                <p className="text-sm text-muted-foreground">
                  {dndSchedule.enabled && isInDNDPeriod() 
                    ? "Actuellement actif - Sons désactivés"
                    : "Désactiver les sons pendant les heures configurées"}
                </p>
              </div>
            </div>
            <Switch
              id="dnd-enabled"
              checked={dndSchedule.enabled}
              onCheckedChange={(checked) => updateDND("enabled", checked)}
            />
          </div>

          {dndSchedule.enabled && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              {/* Time Range */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="dnd-start" className="text-sm whitespace-nowrap">
                    De
                  </Label>
                  <Input
                    id="dnd-start"
                    type="time"
                    value={dndSchedule.startTime}
                    onChange={(e) => updateDND("startTime", e.target.value)}
                    className="w-28"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="dnd-end" className="text-sm whitespace-nowrap">
                    À
                  </Label>
                  <Input
                    id="dnd-end"
                    type="time"
                    value={dndSchedule.endTime}
                    onChange={(e) => updateDND("endTime", e.target.value)}
                    className="w-28"
                  />
                </div>
              </div>

              {/* Days Selection */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Jours actifs</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(({ value, label }) => (
                    <div key={value} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`dnd-day-${value}`}
                        checked={dndSchedule.days.includes(value)}
                        onCheckedChange={() => toggleDNDDay(value)}
                      />
                      <Label 
                        htmlFor={`dnd-day-${value}`}
                        className="text-sm cursor-pointer"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Les sons de notification seront désactivés pendant cette période. 
                Les notifications in-app resteront visibles.
              </p>
            </div>
          )}
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
