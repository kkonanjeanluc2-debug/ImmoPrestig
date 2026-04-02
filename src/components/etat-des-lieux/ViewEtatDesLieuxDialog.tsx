import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EtatDesLieux } from "@/hooks/useEtatsDesLieux";
import { RoomInspectionForm } from "./RoomInspectionForm";
import { KeysForm } from "./KeysForm";
import { PhotosForm } from "./PhotosForm";
import { Zap, Droplets, Flame, Key, Home, Calendar, User, Download, Loader2, Camera } from "lucide-react";
import { generateEtatDesLieuxPDF } from "@/lib/generateEtatDesLieuxPDF";
import { toast } from "sonner";
import { useAgency } from "@/hooks/useAgency";

interface ViewEtatDesLieuxDialogProps {
  etat: EtatDesLieux;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName?: string;
  propertyTitle?: string;
  unitNumber?: string;
}

const typeLabels: Record<string, string> = {
  entree: "État des lieux d'entrée",
  sortie: "État des lieux de sortie",
};

const conditionLabels: Record<string, string> = {
  excellent: "Excellent",
  bon: "Bon",
  moyen: "Moyen",
  mauvais: "Mauvais",
};

const conditionColors: Record<string, string> = {
  excellent: "bg-green-500",
  bon: "bg-blue-500",
  moyen: "bg-yellow-500",
  mauvais: "bg-red-500",
};

export function ViewEtatDesLieuxDialog({ etat, open, onOpenChange, tenantName, propertyTitle, unitNumber }: ViewEtatDesLieuxDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: agency } = useAgency();

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const agencyInfo = agency ? { name: agency.name, email: agency.email, phone: agency.phone || undefined, address: agency.address || undefined, city: agency.city || undefined, country: agency.country || undefined, logo_url: agency.logo_url, siret: agency.siret || undefined } : null;
      await generateEtatDesLieuxPDF({
        etat,
        tenantName: tenantName || "Locataire",
        propertyTitle,
        unitNumber,
        agency: agencyInfo,
      });
      toast.success("PDF généré avec succès");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Home className="h-5 w-5" />
              {typeLabels[etat.type]}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Télécharger PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(etat.inspection_date), "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">État général</p>
              {etat.general_condition ? (
                <Badge className={`${conditionColors[etat.general_condition]} text-white mt-1`}>
                  {conditionLabels[etat.general_condition]}
                </Badge>
              ) : (
                <p className="text-muted-foreground">-</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pièces inspectées</p>
              <p className="font-medium">{etat.rooms.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clés remises</p>
              <p className="font-medium">
                {etat.keys_delivered.reduce((sum, k) => sum + k.quantity, 0)}
              </p>
            </div>
          </div>

          {etat.general_comments && (
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium mb-2">Commentaires généraux</p>
              <p className="text-sm text-muted-foreground">{etat.general_comments}</p>
            </div>
          )}

          <Tabs defaultValue="rooms" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="rooms">Pièces ({etat.rooms.length})</TabsTrigger>
              <TabsTrigger value="meters">Compteurs</TabsTrigger>
              <TabsTrigger value="keys">Clés ({etat.keys_delivered.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="rooms" className="mt-4">
              <RoomInspectionForm rooms={etat.rooms} onChange={() => {}} readOnly />
            </TabsContent>

            <TabsContent value="meters" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Zap className="h-5 w-5" />
                    <span className="font-medium">Électricité</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {etat.electricity_meter ? `${etat.electricity_meter} kWh` : "-"}
                  </p>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Droplets className="h-5 w-5" />
                    <span className="font-medium">Eau</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {etat.water_meter ? `${etat.water_meter} m³` : "-"}
                  </p>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Flame className="h-5 w-5" />
                    <span className="font-medium">Gaz</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {etat.gas_meter ? `${etat.gas_meter} m³` : "-"}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="keys" className="mt-4">
              <KeysForm keys={etat.keys_delivered} onChange={() => {}} readOnly />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
