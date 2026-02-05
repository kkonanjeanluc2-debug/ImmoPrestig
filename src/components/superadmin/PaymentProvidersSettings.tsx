import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings, CheckCircle2, XCircle, Key, Webhook, CreditCard, Smartphone, Eye, EyeOff, Save } from "lucide-react";
import { usePaymentProviders, useUpdatePaymentProvider } from "@/hooks/usePaymentProviders";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  fedapay: <CreditCard className="h-5 w-5" />,
  wave_ci: <Smartphone className="h-5 w-5" />,
  pawapay: <Smartphone className="h-5 w-5" />,
};

const PROVIDER_COLORS: Record<string, string> = {
  fedapay: "bg-green-500",
  wave_ci: "bg-blue-500",
  pawapay: "bg-purple-500",
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
  const { data: providers, isLoading, refetch } = usePaymentProviders();
  const updateProvider = useUpdatePaymentProvider();
  
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSandbox, setIsSandbox] = useState(true);
  
  // API Keys state
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isSavingKeys, setIsSavingKeys] = useState(false);

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
      setPublicKey("");
      setSecretKey("");
      setShowPublicKey(false);
      setShowSecretKey(false);
      setConfigDialogOpen(true);
    }
  };

  const handleSaveKeys = async () => {
    if (!selectedProvider) return;
    
    const provider = providers?.find(p => p.id === selectedProvider);
    if (!provider) return;

    if (!publicKey && !secretKey) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez entrer au moins une clé.",
      });
      return;
    }

    setIsSavingKeys(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const response = await supabase.functions.invoke("update-provider-keys", {
        body: {
          provider_name: provider.provider_name,
          public_key: publicKey || undefined,
          secret_key: secretKey || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erreur lors de la mise à jour");
      }

      toast({
        title: "Clés mises à jour",
        description: response.data?.note || "Les clés API ont été configurées avec succès.",
      });

      // Refresh providers data
      refetch();
      
      // Clear the fields
      setPublicKey("");
      setSecretKey("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder les clés.",
      });
    } finally {
      setIsSavingKeys(false);
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
          publicKeyName: "FEDAPAY_PUBLIC_KEY",
          publicKeyLabel: "Clé Publique",
          secretKeyLabel: "Clé Secrète (API + Webhook)",
          description: "Configurez vos clés API FedaPay.",
          docsUrl: "https://docs.fedapay.com/",
          webhookInfo: "Cette clé secrète est également utilisée pour vérifier les signatures des webhooks de paiement.",
        };
      case "wave_ci":
        return {
          secretName: "WAVE_WEBHOOK_SECRET",
          publicKeyName: "WAVE_API_KEY",
          publicKeyLabel: "Clé API",
          secretKeyLabel: "Secret Webhook",
          description: "Configurez vos clés API Wave CI.",
          docsUrl: "https://docs.wave.com/",
          webhookInfo: "Ce secret est utilisé pour vérifier l'authenticité des notifications webhook.",
        };
      case "pawapay":
        return {
          secretName: "PAWAPAY_WEBHOOK_SECRET",
          publicKeyName: "PAWAPAY_API_TOKEN",
          publicKeyLabel: "API Token",
          secretKeyLabel: "Secret Webhook",
          description: "Configurez vos clés API PawaPay.",
          docsUrl: "https://docs.pawapay.io/",
          webhookInfo: "Ce secret est utilisé pour vérifier les signatures des webhooks PawaPay.",
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
                <li><code className="bg-background px-1 rounded">PAWAPAY_API_TOKEN</code> - Token API PawaPay</li>
                <li><code className="bg-background px-1 rounded">PAWAPAY_WEBHOOK_SECRET</code> - Secret webhook PawaPay</li>
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

          <Tabs defaultValue="general" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="keys">Clés API</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 py-4">
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
            </TabsContent>

            <TabsContent value="keys" className="space-y-4 py-4">
              {(() => {
                const info = selectedProviderData ? getProviderInfo(selectedProviderData.provider_name) : null;
                const settings = selectedProviderData?.settings as Record<string, any> | undefined;
                
                return (
                  <>
                    {/* Current status */}
                    <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Statut actuel:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          {settings?.public_key_configured ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-orange-600" />
                          )}
                          <span>{info?.publicKeyLabel || "Clé publique"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {settings?.secret_key_configured ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-orange-600" />
                          )}
                          <span>{info?.secretKeyLabel || "Clé secrète"}</span>
                        </div>
                      </div>
                      {settings?.keys_updated_at && (
                        <p className="text-xs text-muted-foreground">
                          Dernière mise à jour: {new Date(settings.keys_updated_at).toLocaleString("fr-FR")}
                        </p>
                      )}
                    </div>

                    {/* Public Key */}
                    <div className="space-y-2">
                      <Label htmlFor="public-key">{info?.publicKeyLabel || "Clé Publique"}</Label>
                      <div className="relative">
                        <Input
                          id="public-key"
                          type={showPublicKey ? "text" : "password"}
                          placeholder={`Entrez votre ${info?.publicKeyLabel?.toLowerCase() || "clé publique"}...`}
                          value={publicKey}
                          onChange={(e) => setPublicKey(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPublicKey(!showPublicKey)}
                        >
                          {showPublicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {info && (
                        <p className="text-xs text-muted-foreground">
                          Sera stockée comme: <code className="bg-muted px-1 rounded">{info.publicKeyName}</code>
                        </p>
                      )}
                    </div>

                    {/* Secret Key */}
                    <div className="space-y-2">
                      <Label htmlFor="secret-key">{info?.secretKeyLabel || "Clé Secrète"}</Label>
                      <div className="relative">
                        <Input
                          id="secret-key"
                          type={showSecretKey ? "text" : "password"}
                          placeholder={`Entrez votre ${info?.secretKeyLabel?.toLowerCase() || "clé secrète"}...`}
                          value={secretKey}
                          onChange={(e) => setSecretKey(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                        >
                          {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {info && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Sera stockée comme: <code className="bg-muted px-1 rounded">{info.secretName}</code>
                          </p>
                          {info.webhookInfo && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Webhook className="h-3 w-3" />
                              {info.webhookInfo}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Save Keys Button */}
                    <Button 
                      onClick={handleSaveKeys} 
                      disabled={isSavingKeys || (!publicKey && !secretKey)}
                      className="w-full"
                    >
                      {isSavingKeys ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Enregistrer les clés API
                    </Button>

                    {/* Warning */}
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        ⚠️ <strong>Important:</strong> Les clés sont enregistrées de manière sécurisée. 
                        Pour des raisons de sécurité, les valeurs ne sont jamais affichées après l'enregistrement.
                        Pour les modifier, entrez simplement de nouvelles valeurs.
                      </p>
                    </div>
                  </>
                );
              })()}
            </TabsContent>
          </Tabs>

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
