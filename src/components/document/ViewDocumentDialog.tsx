import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText, MessageCircle } from "lucide-react";
import { generateDocumentMessage, openWhatsApp } from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";

interface ViewDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    name: string;
    file_url: string | null;
    type: string;
  };
  tenantName?: string;
  tenantPhone?: string | null;
}

export function ViewDocumentDialog({
  open,
  onOpenChange,
  document,
  tenantName,
  tenantPhone,
}: ViewDocumentDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const isImage = document.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = document.file_url?.match(/\.pdf$/i);

  const handleDownload = () => {
    if (document.file_url) {
      const link = window.document.createElement("a");
      link.href = document.file_url;
      link.download = document.name;
      link.target = "_blank";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  const handleOpenExternal = () => {
    if (document.file_url) {
      window.open(document.file_url, "_blank");
    }
  };

  const handleSendWhatsApp = () => {
    if (!tenantPhone || !tenantName) {
      toast({
        title: "Erreur",
        description: "Aucun numéro de téléphone disponible pour ce locataire.",
        variant: "destructive",
      });
      return;
    }

    const message = generateDocumentMessage({
      tenantName,
      documentName: document.name,
      documentUrl: document.file_url || undefined,
    });

    openWhatsApp(tenantPhone, message);

    toast({
      title: "WhatsApp ouvert",
      description: "Le message a été pré-rempli avec le lien du document.",
    });
  };

  const canSendWhatsApp = !!tenantPhone && !!tenantName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="truncate">{document.name}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenExternal}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Ouvrir
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Télécharger
              </Button>
              {canSendWhatsApp && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSendWhatsApp}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 rounded-lg min-h-[400px]">
          {!document.file_url ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun fichier disponible</p>
            </div>
          ) : isImage ? (
            <div className="flex items-center justify-center p-4 h-full">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
              <img
                src={document.file_url}
                alt={document.name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={document.file_url}
              className="w-full h-[60vh] rounded-lg"
              title={document.name}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Aperçu non disponible pour ce type de fichier
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleOpenExternal}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir dans un nouvel onglet
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
