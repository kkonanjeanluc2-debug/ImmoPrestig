import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, PackagePlus, Calculator } from "lucide-react";
import { usePlatformSetting, useUpsertPlatformSetting } from "@/hooks/usePlatformSettings";
import { toast } from "sonner";

export function ModulesSettings() {
  const { data: acquisitionsSetting, isLoading: loadingAcq } = usePlatformSetting("module_acquisitions_enabled");
  const { data: comptaSetting, isLoading: loadingCompta } = usePlatformSetting("module_comptabilite_enabled");
  const upsertMutation = useUpsertPlatformSetting();

  const isAcqEnabled = acquisitionsSetting?.value === "true";
  const isComptaEnabled = comptaSetting?.value === "true";

  const handleToggle = (key: string, checked: boolean, label: string) => {
    upsertMutation.mutate(
      {
        key,
        value: String(checked),
        description: `Active ou désactive le module ${label}`,
      },
      {
        onSuccess: () => toast.success(checked ? `Module ${label} activé` : `Module ${label} désactivé`),
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  if (loadingAcq || loadingCompta) {
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
      <CardContent className="space-y-4">
        {/* Acquisitions */}
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
            checked={isAcqEnabled}
            onCheckedChange={(v) => handleToggle("module_acquisitions_enabled", v, "Acquisitions")}
            disabled={upsertMutation.isPending}
          />
        </div>

        {/* Comptabilité */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="module-comptabilite" className="text-sm font-medium cursor-pointer">
                Comptabilité
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Revenus, dépenses, bénéfice net et analyses financières
              </p>
            </div>
          </div>
          <Switch
            id="module-comptabilite"
            checked={isComptaEnabled}
            onCheckedChange={(v) => handleToggle("module_comptabilite_enabled", v, "Comptabilité")}
            disabled={upsertMutation.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}
