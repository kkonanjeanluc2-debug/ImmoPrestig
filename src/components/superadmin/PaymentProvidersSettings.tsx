import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings, CheckCircle2, XCircle, Key, Webhook, CreditCard, Smartphone } from "lucide-react";
import { usePaymentProviders, useUpdatePaymentProvider } from "@/hooks/usePaymentProviders";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  fedapay: <CreditCard className="h-5 w-5" />,
  wave_ci: <Smartphone className="h-5 w-5" />,
};

const PROVIDER_COLORS: Record<string, string> = {
  fedapay: "bg-green-500",
  wave_ci: "bg-blue-500",
};

const METHOD_LABELS: Record<string, string> = {
  orange_money: "Orange Money",
  mtn_money: "MTN Money",
  wave: "Wave (via FedaPay)",
  moov: "Moov Money",
  card: "Carte bancaire",
  wave_direct: "Wave Direct",
};

export function PaymentProvidersSettings() {
  const { toast } = useToast();
  const { data: providers, isLoading } = usePaymentProviders();
  const updateProvider = useUpdatePaymentProvider();
  
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSandbox, setIsSandbox] = useState(true);

  const handleToggleEnabled = async (providerId: string, currentValue: boolean) => {
    try {
      await updateProvider.mutateAsync({
        id: providerId,
        updates: { is_enabled: !currentValue },
      });
      toast({
        title: currentValue ? "Fournisseur désactivé" : "Fournisseur activé",
        description: `Le fournisseur de paiement a été ${currentValue ? "désactivé" : "activé"}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de modifier le statut.",
      });
    }
  };

  const handleOpenConfig = (providerId: string) => {
    const provider = providers?.find(p => p.id === providerId);
    if (provider) {
      setSelectedProvider(providerId);
      setWebhookUrl(provider.webhook_url || "");
      setIsSandbox(provider.is_sandbox);
      setConfigDialogOpen(true);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedProvider) return;

    try {
      await updateProvider.mutateAsync({
        id: selectedProvider,
        updates: {
          webhook_url: webhookUrl || null,
          is_sandbox: isSandbox,
        },
      });
      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres du fournisseur ont été mis à jour.",
      });
      setConfigDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder la configuration.",
      });
    }
  };

  const getProviderInfo = (providerName: string) => {
    switch (providerName) {
      case "fedapay":
        return {
          secretName: "FEDAPAY_SECRET_KEY",
          description: "Configurez vos clés API FedaPay dans les secrets Supabase.",
          docsUrl: "https://docs.fedapay.com/",
        };
      case "wave_ci":
        return {
          secretName: "WAVE_API_KEY",
          description: "Configurez votre clé API Wave CI dans les secrets Supabase.",
          docsUrl: "https://docs.wave.com/",
        };
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedProviderData = providers?.find(p => p.id === selectedProvider);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Fournisseurs de paiement</h3>
        <p className="text-sm text-muted-foreground">
          Configurez les fournisseurs de paiement disponibles pour les abonnements.
        </p>
      </div>

      <div className="grid gap-4">
        {providers?.map((provider) => {
          const info = getProviderInfo(provider.provider_name);
          
          return (
            <Card key={provider.id} className={provider.is_enabled ? "border-primary/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${PROVIDER_COLORS[provider.provider_name] || "bg-gray-500"}`}>
                      {PROVIDER_ICONS[provider.provider_name] || <CreditCard className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {provider.display_name}
                        {provider.is_enabled ? (
                          <Badge variant="default" className="bg-green-500">Actif</Badge>
                        ) : (
                          <Badge variant="secondary">Inactif</Badge>
                        )}
                        {provider.is_sandbox && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            Sandbox
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {(provider.settings as any)?.description || "Fournisseur de paiement"}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={provider.is_enabled}
                    onCheckedChange={() => handleToggleEnabled(provider.id, provider.is_enabled)}
                    disabled={updateProvider.isPending}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Supported Methods */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Méthodes supportées</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {provider.supported_methods.map((method) => (
                        <Badge key={method} variant="outline" className="text-xs">
                          {METHOD_LABELS[method] || method}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* API Key Status */}
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clé API:</span>
                    {provider.api_key_configured ? (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Configurée
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-orange-600">
                        <XCircle className="h-4 w-4" />
                        Non configurée
                      </span>
                    )}
                    {info && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Secret: {info.secretName})
                      </span>
                    )}
                  </div>

                  {/* Webhook URL */}
                  {provider.webhook_url && (
                    <div className="flex items-center gap-2">
                      <Webhook className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Webhook:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                        {provider.webhook_url}
                      </code>
                    </div>
                  )}

                  {/* Configure Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenConfig(provider.id)}
                    className="w-full sm:w-auto"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurer
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Key className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium">Configuration des clés API</h4>
              <p className="text-sm text-muted-foreground">
                Les clés API doivent être configurées dans les <strong>secrets</strong> du backend. 
                Accédez à la configuration du backend pour ajouter les secrets suivants :
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><code className="bg-background px-1 rounded">FEDAPAY_SECRET_KEY</code> - Clé secrète FedaPay</li>
                <li><code className="bg-background px-1 rounded">FEDAPAY_PUBLIC_KEY</code> - Clé publique FedaPay</li>
                <li><code className="bg-background px-1 rounded">WAVE_API_KEY</code> - Clé API Wave CI</li>
                <li><code className="bg-background px-1 rounded">WAVE_WEBHOOK_SECRET</code> - Secret webhook Wave CI</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configurer {selectedProviderData?.display_name}
            </DialogTitle>
            <DialogDescription>
              Modifiez les paramètres de ce fournisseur de paiement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Environment */}
            <div className="space-y-2">
              <Label>Environnement</Label>
              <Select
                value={isSandbox ? "sandbox" : "production"}
                onValueChange={(v) => setIsSandbox(v === "sandbox")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Sandbox
                      </Badge>
                      Mode test
                    </div>
                  </SelectItem>
                  <SelectItem value="production">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">
                        Production
                      </Badge>
                      Mode réel
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {isSandbox
                  ? "Les paiements seront simulés (aucun argent réel)."
                  : "⚠️ Les paiements seront réels ! Assurez-vous que tout est configuré correctement."}
              </p>
            </div>

            {/* Webhook URL */}
            <div className="space-y-2">
              <Label htmlFor="webhook">URL du Webhook (optionnel)</Label>
              <Input
                id="webhook"
                placeholder="https://..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                URL où les notifications de paiement seront envoyées.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveConfig} disabled={updateProvider.isPending}>
              {updateProvider.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
