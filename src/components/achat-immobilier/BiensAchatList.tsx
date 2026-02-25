import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus, MapPin, Loader2 } from "lucide-react";
import { useBiensAchat } from "@/hooks/useBiensAchat";
import { AddBienAchatDialog } from "./AddBienAchatDialog";

const STATUS_COLORS: Record<string, string> = {
  prospection: "bg-blue-100 text-blue-800",
  en_negociation: "bg-amber-100 text-amber-800",
  offre_faite: "bg-purple-100 text-purple-800",
  sous_compromis: "bg-orange-100 text-orange-800",
  achete: "bg-emerald-100 text-emerald-800",
  abandonne: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  prospection: "Prospection",
  en_negociation: "En négociation",
  offre_faite: "Offre faite",
  sous_compromis: "Sous compromis",
  achete: "Acheté",
  abandonne: "Abandonné",
};

export function BiensAchatList() {
  const { data: biens, isLoading } = useBiensAchat();

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Biens à acheter</h2>
        <AddBienAchatDialog>
          <Button size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter un bien</Button>
        </AddBienAchatDialog>
      </div>

      {!biens?.length ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun bien prospecté</p>
            <p className="text-sm text-muted-foreground mt-1">Commencez par ajouter un bien à acheter</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {biens.map((bien) => (
            <Card key={bien.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold truncate flex-1">{bien.title}</h3>
                  <Badge className={STATUS_COLORS[bien.status] || ""}>{STATUS_LABELS[bien.status] || bien.status}</Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{bien.address}{bien.city ? `, ${bien.city}` : ""}</span>
                </div>
                <p className="text-lg font-bold text-primary">
                  {Number(bien.price).toLocaleString("fr-FR")} FCFA
                </p>
                {bien.vendeurs && (
                  <p className="text-sm text-muted-foreground mt-1">Vendeur: {bien.vendeurs.name}</p>
                )}
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  {bien.area && <span>{bien.area} m²</span>}
                  {bien.bedrooms && <span>{bien.bedrooms} ch.</span>}
                  {bien.bathrooms && <span>{bien.bathrooms} sdb</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
