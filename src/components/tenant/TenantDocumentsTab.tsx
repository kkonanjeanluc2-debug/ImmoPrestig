import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink } from "lucide-react";
import { TenantWithDetails } from "@/hooks/useTenants";

interface TenantDocumentsTabProps {
  tenant: TenantWithDetails;
}

export function TenantDocumentsTab({ tenant }: TenantDocumentsTabProps) {
  const cniUrl = (tenant as any).cni_document_url;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents d'identité
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cniUrl ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">CNI / Passeport</p>
                  <p className="text-xs text-muted-foreground">Document d'identité du locataire</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(cniUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Voir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={cniUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1" />
                    Télécharger
                  </a>
                </Button>
              </div>
            </div>

            {/* Preview for images */}
            {cniUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={cniUrl}
                  alt="CNI / Passeport"
                  className="w-full max-h-96 object-contain bg-muted"
                />
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
