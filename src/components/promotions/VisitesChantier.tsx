import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, HardHat, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import {
  useVisitesChantier,
  useAddVisite,
  useDeleteVisite,
  TYPE_VISITE_LABELS,
  type TypeVisite,
} from "@/hooks/useDocumentsPromotion";
import type { ReservationWithDetails } from "@/hooks/useReservationsLots";

const TYPE_VISITE_COLORS: Record<TypeVisite, string> = {
  commerciale:    "bg-blue-100 text-blue-700",
  cloison:        "bg-amber-100 text-amber-700",
  pre_livraison:  "bg-purple-100 text-purple-700",
  livraison:      "bg-emerald-100 text-emerald-700",
  autre:          "bg-gray-100 text-gray-600",
};

interface Props {
  programmeId: string;
  reservations: ReservationWithDetails[];
}

export function VisitesChantier({ programmeId, reservations }: Props) {
  const { data: visites = [], isLoading } = useVisitesChantier(programmeId);
  const addVisite = useAddVisite();
  const deleteVisite = useDeleteVisite();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type_visite: "commerciale" as TypeVisite,
    date_visite: new Date().toISOString().slice(0, 16), // datetime-local format
    reservation_id: "",
    observations: "",
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addVisite.mutateAsync({
        programme_id: programmeId,
        type_visite: form.type_visite,
        date_visite: new Date(form.date_visite).toISOString(),
        reservation_id: form.reservation_id || null,
        observations: form.observations.trim() || null,
      });
      toast.success("Visite enregistrée");
      setShowForm(false);
      setForm({
        type_visite: "commerciale",
        date_visite: new Date().toISOString().slice(0, 16),
        reservation_id: "",
        observations: "",
      });
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette visite ?")) return;
    try {
      await deleteVisite.mutateAsync({ id, programmeId });
      toast.success("Visite supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Visites de chantier</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{visites.length} visite(s) enregistrée(s)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle visite
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type de visite *</Label>
              <Select value={form.type_visite} onValueChange={(v) => setForm({ ...form, type_visite: v as TypeVisite })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TYPE_VISITE_LABELS) as [TypeVisite, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date et heure *</Label>
              <Input
                type="datetime-local"
                className="h-9 text-sm"
                value={form.date_visite}
                onChange={(e) => setForm({ ...form, date_visite: e.target.value })}
              />
            </div>
          </div>

          {reservations.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Client concerné (optionnel)</Label>
              <Select
                value={form.reservation_id || "none"}
                onValueChange={(v) => setForm({ ...form, reservation_id: v === "none" ? "" : v })}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Aucun client spécifique" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun client spécifique</SelectItem>
                  {reservations.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.client?.nom} {r.client?.prenoms} — Lot {r.lot?.reference_lot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Observations</Label>
            <Textarea
              className="text-sm min-h-[70px]"
              placeholder="Avancement constaté, remarques, actions à prendre..."
              value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button type="submit" size="sm" disabled={addVisite.isPending}>
              {addVisite.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      )}

      {visites.length === 0 && !showForm && (
        <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
          <HardHat className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Aucune visite de chantier enregistrée.</p>
          <p className="text-xs mt-1">Cliquez sur "Nouvelle visite" pour commencer.</p>
        </div>
      )}

      <div className="space-y-3">
        {visites.map((visite) => {
          const res = reservations.find((r) => r.id === visite.reservation_id);
          return (
            <div key={visite.id} className="flex gap-3 rounded-lg border p-3.5 bg-background hover:bg-muted/20 transition-colors">
              <div className="shrink-0 mt-0.5">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <HardHat className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {visite.type_visite && (
                      <Badge className={`text-[11px] h-5 px-2 ${TYPE_VISITE_COLORS[visite.type_visite]}`}>
                        {TYPE_VISITE_LABELS[visite.type_visite]}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(visite.date_visite).toLocaleDateString("fr-FR", {
                        weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(visite.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {res && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <User className="h-3 w-3" />
                    {res.client?.nom} {res.client?.prenoms} — Lot {res.lot?.reference_lot}
                  </div>
                )}
                {visite.observations && (
                  <p className="text-sm text-foreground mt-1.5">{visite.observations}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
