import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, PackagePlus } from "lucide-react";
import { usePlatformSetting, useUpsertPlatformSetting } from "@/hooks/usePlatformSettings";
import { toast } from "sonner";

export function ModulesSettings() {
  const { data: acquisitionsSetting, isLoading } = usePlatformSetting("module_acquisitions_enabled");
  const upsertMutation = useUpsertPlatformSetting();

  const isEnabled = acquisitionsSetting?.value === "true";

  const handleToggle = (checked: boolean) => {
    upsertMutation.mutate(
      {
        key: "module_acquisitions_enabled",
        value: String(checked),
        description: "Active ou désactive le module Acquisitions de biens",
      },
      {
        onSuccess: () => toast.success(checked ? "Module Acquisitions activé" : "Module Acquisitions désactivé"),
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modules de la plateforme</CardTitle>
        <CardDescription>
          Activez ou désactivez les modules disponibles pour tous les utilisateurs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <PackagePlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="module-acquisitions" className="text-sm font-medium cursor-pointer">
                Acquisitions de biens
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Donation, héritage, apport en société, échange
              </p>
            </div>
          </div>
          <Switch
            id="module-acquisitions"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={upsertMutation.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}
