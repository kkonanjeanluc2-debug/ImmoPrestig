import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, CalendarDays } from "lucide-react";
import { StatutProgrammeBadge } from "./StatutBadge";
import { TYPE_PROGRAMME_LABELS, type ProgrammeWithStats } from "@/hooks/usePromotionsImmobilieres";

const fmt = (n: number) => n.toLocaleString("fr-FR");

interface Props {
  programme: ProgrammeWithStats;
}

export function ProgrammeCard({ programme }: Props) {
  return (
    <Link to={`/promotions/${programme.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
        {programme.image_principale_url && (
          <img
            src={programme.image_principale_url}
            alt={programme.nom}
            className="w-full h-40 object-cover rounded-t-lg"
          />
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight line-clamp-2">{programme.nom}</CardTitle>
            <StatutProgrammeBadge statut={programme.statut} />
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {programme.commune} · {programme.ville}
          </div>
          <p className="text-xs text-muted-foreground">{TYPE_PROGRAMME_LABELS[programme.type_programme]}</p>
        </CardHeader>

        <CardContent className="space-y-3 flex-1 flex flex-col justify-end">
          {/* Barre de commercialisation */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Commercialisation</span>
              <span className="font-medium">{programme.taux_commercialisation}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${programme.taux_commercialisation}%` }}
              />
            </div>
          </div>

          {/* Stats lots */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-sm font-semibold text-gray-700">{programme.nombre_lots_disponibles}</div>
              <div className="text-xs text-muted-foreground">Dispos</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="text-sm font-semibold text-blue-700">{programme.nombre_lots_reserves}</div>
              <div className="text-xs text-muted-foreground">Réservés</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2">
              <div className="text-sm font-semibold text-emerald-700">{programme.nombre_lots_vendus}</div>
              <div className="text-xs text-muted-foreground">Vendus</div>
            </div>
          </div>

          {/* Prix */}
          {programme.prix_min_fcfa && (
            <p className="text-xs text-muted-foreground">
              À partir de{" "}
              <span className="font-semibold text-foreground">{fmt(programme.prix_min_fcfa)} F CFA</span>
            </p>
          )}

          {/* Date livraison */}
          {programme.date_livraison_prevue && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              Livraison prévue : {new Date(programme.date_livraison_prevue).toLocaleDateString("fr-FR")}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
