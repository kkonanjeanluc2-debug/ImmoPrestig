import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, Loader2 } from "lucide-react";
import { TenantWithDetails } from "@/hooks/useTenants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TenantDocumentsTabProps {
  tenant: TenantWithDetails;
}

export function TenantDocumentsTab({ tenant }: TenantDocumentsTabProps) {
  const cniPath = (tenant as any).cni_document_url as string | null;
  const [loading, setLoading] = useState(false);

  const getSignedUrl = async () => {
    if (!cniPath) return null;
    if (cniPath.startsWith("http")) return cniPath;

    const { data, error } = await supabase.storage
      .from("documents-achats")
      .createSignedUrl(cniPath, 300);

    if (error || !data?.signedUrl) {
      toast.error("Impossible d'accéder au document");
      return null;
    }

    return data.signedUrl;
  };

  const handleOpen = async () => {
    setLoading(true);
    const signedUrl = await getSignedUrl();
    setLoading(false);
    if (signedUrl) {
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    const signedUrl = await getSignedUrl();
    setLoading(false);
    if (signedUrl) {
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    }
  };

  const isImage = !!cniPath && /\.(jpg|jpeg|png|gif|webp)$/i.test(cniPath);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents du locataire
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cniPath ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">Documents du locataire</p>
                  <p className="text-xs text-muted-foreground truncate">CNI, Attestation de travail, bulletins de salaire, quittances</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleOpen} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1" />}
                  Voir
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading}>
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
              </div>
            </div>

            {isImage && (
              <div className="border rounded-lg overflow-hidden p-6 bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground">
                  Aperçu disponible via le bouton Voir
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Aucun document d'identité importé
          </p>
        )}
      </CardContent>
    </Card>
  );
}
