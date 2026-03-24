import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgency } from "@/hooks/useAgency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  PieChart, 
  Shuffle, 
  Save, 
  Loader2, 
  User, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  RotateCcw 
} from "lucide-react";
import { Parcelle, useUpdateParcelle } from "@/hooks/useParcelles";
import { Lotissement } from "@/hooks/useLotissements";
import { useUpdateLotissement } from "@/hooks/useLotissements";
import { toast } from "sonner";

interface LotRepartitionTabProps {
  lotissement: Lotissement;
  parcelles: Parcelle[];
}

export function LotRepartitionTab({ lotissement, parcelles }: LotRepartitionTabProps) {
  const { data: agency } = useAgency();
  const updateLotissement = useUpdateLotissement();
  const updateParcelle = useUpdateParcelle();

  const [proprietairePercent, setProprietairePercent] = useState(
    lotissement.repartition_proprietaire ?? 30
  );
  const [proprietaireName, setProprietaireName] = useState(
    lotissement.proprietaire_name ?? ""
  );
  const [lotisseurName, setLotisseurName] = useState(
    lotissement.lotisseur_name ?? ""
  );
  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-fill names if empty
  useEffect(() => {
    if (!proprietaireName && lotissement.proprietaire_name) {
      setProprietaireName(lotissement.proprietaire_name);
    }
    if (!lotisseurName && agency?.name) {
      setLotisseurName(agency.name);
    }
  }, [agency?.name, lotissement.proprietaire_name]);

  const lotisseurPercent = 100 - proprietairePercent;

  // Current attribution stats
  const stats = useMemo(() => {
    const proprietaire = parcelles.filter(p => p.attribution === "proprietaire").length;
    const lotisseur = parcelles.filter(p => p.attribution === "lotisseur").length;
    const nonAttribue = parcelles.filter(p => !p.attribution).length;
    return { proprietaire, lotisseur, nonAttribue, total: parcelles.length };
  }, [parcelles]);

  // Expected counts based on percentages
  const expected = useMemo(() => {
    const total = parcelles.length;
    const proprietaireCount = Math.round((proprietairePercent / 100) * total);
    const lotisseurCount = total - proprietaireCount;
    return { proprietaire: proprietaireCount, lotisseur: lotisseurCount };
  }, [parcelles.length, proprietairePercent]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await updateLotissement.mutateAsync({
        id: lotissement.id,
        repartition_proprietaire: proprietairePercent,
        repartition_lotisseur: lotisseurPercent,
        proprietaire_name: proprietaireName || null,
        lotisseur_name: lotisseurName || null,
      } as any);
      toast.success("Configuration de répartition sauvegardée");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyRepartition = async () => {
    if (parcelles.length === 0) {
      toast.error("Aucune parcelle à répartir");
      return;
    }

    setIsApplying(true);
    try {
      // Save config first
      await updateLotissement.mutateAsync({
        id: lotissement.id,
        repartition_proprietaire: proprietairePercent,
        repartition_lotisseur: lotisseurPercent,
        proprietaire_name: proprietaireName || null,
        lotisseur_name: lotisseurName || null,
      } as any);

      // Sort parcelles by plot_number for consistent distribution
      const sorted = [...parcelles].sort((a, b) => 
        a.plot_number.localeCompare(b.plot_number, undefined, { numeric: true })
      );

      const proprietaireCount = expected.proprietaire;
      let success = 0;
      let errors = 0;

      for (let i = 0; i < sorted.length; i++) {
        const attribution = i < proprietaireCount ? "proprietaire" : "lotisseur";
        try {
          await updateParcelle.mutateAsync({
            id: sorted[i].id,
            attribution,
          } as any);
          success++;
        } catch {
          errors++;
        }
      }

      if (errors > 0) {
        toast.warning(`${success} lots répartis, ${errors} erreurs`);
      } else {
        toast.success(`${success} lots répartis avec succès`);
      }
    } catch (error) {
      toast.error("Erreur lors de la répartition");
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetRepartition = async () => {
    setIsApplying(true);
    try {
      let success = 0;
      for (const p of parcelles) {
        if (p.attribution) {
          try {
            await updateParcelle.mutateAsync({
              id: p.id,
              attribution: null,
            } as any);
            success++;
          } catch { /* ignore */ }
        }
      }
      toast.success(`${success} attributions réinitialisées`);
    } catch {
      toast.error("Erreur lors de la réinitialisation");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Répartition des lots (Convention)
          </CardTitle>
          <CardDescription>
            Définissez les pourcentages de répartition entre le propriétaire et le lotisseur selon la convention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nom du Propriétaire
              </Label>
              <Input
                placeholder="Nom du propriétaire du terrain"
                value={proprietaireName}
                onChange={(e) => setProprietaireName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Nom du Lotisseur
              </Label>
              <Input
                placeholder="Nom du lotisseur / société"
                value={lotisseurName}
                onChange={(e) => setLotisseurName(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Percentage slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Répartition</span>
              <span className="text-sm text-muted-foreground">
                Total : {parcelles.length} lots
              </span>
            </div>

            <Slider
              value={[proprietairePercent]}
              onValueChange={([val]) => setProprietairePercent(val)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {proprietairePercent}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Propriétaire
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {expected.proprietaire} lots
                  </Badge>
                </CardContent>
              </Card>
              <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {lotisseurPercent}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Lotisseur
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {expected.lotisseur} lots
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSaveConfig} disabled={isSaving} variant="outline">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Sauvegarder
            </Button>
            <Button onClick={handleApplyRepartition} disabled={isApplying}>
              {isApplying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shuffle className="h-4 w-4 mr-2" />}
              Appliquer la répartition
            </Button>
            <Button onClick={handleResetRepartition} disabled={isApplying} variant="destructive" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current state */}
      <Card>
        <CardHeader>
          <CardTitle>État actuel de la répartition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.proprietaire}</p>
              <p className="text-xs text-muted-foreground">Propriétaire</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.lotisseur}</p>
              <p className="text-xs text-muted-foreground">Lotisseur</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold text-muted-foreground">{stats.nonAttribue}</p>
              <p className="text-xs text-muted-foreground">Non attribué</p>
            </div>
          </div>

          {/* Parcelle list with attributions */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {parcelles
                .sort((a, b) => a.plot_number.localeCompare(b.plot_number, undefined, { numeric: true }))
                .map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm w-20">Lot {p.plot_number}</span>
                      <span className="text-xs text-muted-foreground">{p.area} m²</span>
                    </div>
                    <div>
                      {p.attribution === "proprietaire" ? (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-100">
                          <User className="h-3 w-3 mr-1" />
                          Propriétaire
                        </Badge>
                      ) : p.attribution === "lotisseur" ? (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 hover:bg-amber-100">
                          <Building2 className="h-3 w-3 mr-1" />
                          Lotisseur
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Non attribué
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
