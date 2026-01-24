import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAutomationSchedules, DEFAULT_SCHEDULE, AutomationSchedule } from "@/hooks/useAutomationSchedules";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calendar, Bell, MessageSquare, FileText, Loader2, Save, Percent, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { AutomationHistory } from "./AutomationHistory";
import { supabase } from "@/integrations/supabase/client";

const WEEKDAYS = [
  { value: 0, label: "Dimanche" },
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
];

type ScheduleFormData = Omit<AutomationSchedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export function AutomationSettings() {
  const { schedule, isLoading, upsertSchedule, isUpdating } = useAutomationSchedules();
  const { toast } = useToast();
  const [formData, setFormData] = useState<ScheduleFormData>(DEFAULT_SCHEDULE);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSendingCommissionReports, setIsSendingCommissionReports] = useState(false);

  useEffect(() => {
    if (schedule) {
      setFormData({
        payment_reminder_enabled: schedule.payment_reminder_enabled,
        payment_reminder_time: schedule.payment_reminder_time,
        payment_reminder_days_before: schedule.payment_reminder_days_before,
        late_payment_enabled: schedule.late_payment_enabled,
        late_payment_time: schedule.late_payment_time,
        late_payment_days_after: schedule.late_payment_days_after,
        sms_reminder_enabled: schedule.sms_reminder_enabled,
        sms_reminder_time: schedule.sms_reminder_time,
        sms_reminder_weekdays: schedule.sms_reminder_weekdays,
        monthly_receipt_enabled: schedule.monthly_receipt_enabled,
        monthly_receipt_day: schedule.monthly_receipt_day,
        monthly_receipt_time: schedule.monthly_receipt_time,
      });
      setHasChanges(false);
    }
  }, [schedule]);

  const handleChange = <K extends keyof ScheduleFormData>(field: K, value: ScheduleFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleWeekdayToggle = (day: number, checked: boolean) => {
    const newWeekdays = checked
      ? [...formData.sms_reminder_weekdays, day].sort()
      : formData.sms_reminder_weekdays.filter(d => d !== day);
    handleChange('sms_reminder_weekdays', newWeekdays);
  };

  const formatTimeForInput = (time: string) => {
    // Convert "08:00:00" to "08:00"
    return time.substring(0, 5);
  };

  const formatTimeForDb = (time: string) => {
    // Convert "08:00" to "08:00:00"
    return time.length === 5 ? `${time}:00` : time;
  };

  const handleSave = () => {
    upsertSchedule(formData, {
      onSuccess: () => {
        toast({
          title: "Planification enregistrée",
          description: "Les horaires d'automatisation ont été mis à jour.",
        });
        setHasChanges(false);
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleSendCommissionReports = async () => {
    setIsSendingCommissionReports(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-commission-reports', {
        body: {}
      });
      
      if (error) throw error;
      
      toast({
        title: "Rapports envoyés",
        description: data.message || "Les rapports de commissions ont été envoyés aux propriétaires.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSendingCommissionReports(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Planification des automatisations
          </CardTitle>
          <CardDescription>
            Configurez les dates et heures d'exécution des tâches automatiques de votre agence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Rappels de paiement */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <Label className="text-base font-medium">Rappels de paiement</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications avant échéance des loyers
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.payment_reminder_enabled}
                onCheckedChange={(checked) => handleChange('payment_reminder_enabled', checked)}
              />
            </div>
            
            {formData.payment_reminder_enabled && (
              <div className="ml-8 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="payment-time">Heure d'envoi</Label>
                  <Input
                    id="payment-time"
                    type="time"
                    value={formatTimeForInput(formData.payment_reminder_time)}
                    onChange={(e) => handleChange('payment_reminder_time', formatTimeForDb(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-days">Jours avant échéance</Label>
                  <Select
                    value={formData.payment_reminder_days_before.toString()}
                    onValueChange={(value) => handleChange('payment_reminder_days_before', parseInt(value))}
                  >
                    <SelectTrigger id="payment-days">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 7, 10, 14].map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day} jour{day > 1 ? 's' : ''} avant
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Relances retards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-destructive" />
                <div>
                  <Label className="text-base font-medium">Relances de retard</Label>
                  <p className="text-sm text-muted-foreground">
                    Détection et notification des paiements en retard
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.late_payment_enabled}
                onCheckedChange={(checked) => handleChange('late_payment_enabled', checked)}
              />
            </div>
            
            {formData.late_payment_enabled && (
              <div className="ml-8 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="late-time">Heure de vérification</Label>
                  <Input
                    id="late-time"
                    type="time"
                    value={formatTimeForInput(formData.late_payment_time)}
                    onChange={(e) => handleChange('late_payment_time', formatTimeForDb(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="late-days">Jours après échéance</Label>
                  <Select
                    value={formData.late_payment_days_after.toString()}
                    onValueChange={(value) => handleChange('late_payment_days_after', parseInt(value))}
                  >
                    <SelectTrigger id="late-days">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 7].map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day} jour{day > 1 ? 's' : ''} après
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* SMS automatiques */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <div>
                  <Label className="text-base font-medium">SMS automatiques</Label>
                  <p className="text-sm text-muted-foreground">
                    Envoi des rappels SMS pour les retards
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.sms_reminder_enabled}
                onCheckedChange={(checked) => handleChange('sms_reminder_enabled', checked)}
              />
            </div>
            
            {formData.sms_reminder_enabled && (
              <div className="ml-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sms-time">Heure d'envoi</Label>
                  <Input
                    id="sms-time"
                    type="time"
                    value={formatTimeForInput(formData.sms_reminder_time)}
                    onChange={(e) => handleChange('sms_reminder_time', formatTimeForDb(e.target.value))}
                    className="max-w-[200px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jours d'envoi</Label>
                  <div className="flex flex-wrap gap-3">
                    {WEEKDAYS.map((day) => (
                      <div key={day.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={formData.sms_reminder_weekdays.includes(day.value)}
                          onCheckedChange={(checked) => handleWeekdayToggle(day.value, checked as boolean)}
                        />
                        <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                          {day.label.substring(0, 3)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Quittances mensuelles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-green-500" />
                <div>
                  <Label className="text-base font-medium">Quittances mensuelles</Label>
                  <p className="text-sm text-muted-foreground">
                    Génération et envoi automatique des quittances
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.monthly_receipt_enabled}
                onCheckedChange={(checked) => handleChange('monthly_receipt_enabled', checked)}
              />
            </div>
            
            {formData.monthly_receipt_enabled && (
              <div className="ml-8 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receipt-day">Jour du mois</Label>
                  <Select
                    value={formData.monthly_receipt_day.toString()}
                    onValueChange={(value) => handleChange('monthly_receipt_day', parseInt(value))}
                  >
                    <SelectTrigger id="receipt-day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Le {day}{day === 1 ? 'er' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt-time">Heure d'envoi</Label>
                  <Input
                    id="receipt-time"
                    type="time"
                    value={formatTimeForInput(formData.monthly_receipt_time)}
                    onChange={(e) => handleChange('monthly_receipt_time', formatTimeForDb(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Rapports de commissions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Percent className="h-5 w-5 text-primary" />
                <div>
                  <Label className="text-base font-medium">Rapports de commissions</Label>
                  <p className="text-sm text-muted-foreground">
                    Envoi automatique le 5 de chaque mois aux propriétaires
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendCommissionReports}
                disabled={isSendingCommissionReports}
                className="gap-2"
              >
                {isSendingCommissionReports ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Envoyer maintenant
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isUpdating}
              className="gap-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer les modifications
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historique des exécutions */}
      <AutomationHistory />
    </div>
  );
}
