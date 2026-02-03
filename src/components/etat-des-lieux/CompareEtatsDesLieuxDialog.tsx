import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EtatDesLieux, RoomInspection } from "@/hooks/useEtatsDesLieux";
import { Zap, Droplets, Flame, ArrowRight, AlertTriangle, CheckCircle, Key } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompareEtatsDesLieuxDialogProps {
  entryEtat: EtatDesLieux;
  exitEtat: EtatDesLieux;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const conditionLabels: Record<string, string> = {
  excellent: "Excellent",
  bon: "Bon",
  moyen: "Moyen",
  mauvais: "Mauvais",
};

const conditionValues: Record<string, number> = {
  excellent: 4,
  bon: 3,
  moyen: 2,
  mauvais: 1,
};

const conditionColors: Record<string, string> = {
  excellent: "text-green-600 bg-green-50",
  bon: "text-blue-600 bg-blue-50",
  moyen: "text-yellow-600 bg-yellow-50",
  mauvais: "text-red-600 bg-red-50",
};

export function CompareEtatsDesLieuxDialog({
  entryEtat,
  exitEtat,
  open,
  onOpenChange,
}: CompareEtatsDesLieuxDialogProps) {
  // Calculate meter consumption
  const electricityConsumption = 
    entryEtat.electricity_meter && exitEtat.electricity_meter
      ? exitEtat.electricity_meter - entryEtat.electricity_meter
      : null;
  
  const waterConsumption = 
    entryEtat.water_meter && exitEtat.water_meter
      ? exitEtat.water_meter - entryEtat.water_meter
      : null;
  
  const gasConsumption = 
    entryEtat.gas_meter && exitEtat.gas_meter
      ? exitEtat.gas_meter - entryEtat.gas_meter
      : null;

  // Map rooms by name for comparison
  const entryRoomsMap = new Map(entryEtat.rooms.map(r => [r.name, r]));
  const exitRoomsMap = new Map(exitEtat.rooms.map(r => [r.name, r]));
  const allRoomNames = new Set([...entryRoomsMap.keys(), ...exitRoomsMap.keys()]);

  // Calculate degradations
  const roomComparisons = Array.from(allRoomNames).map(name => {
    const entry = entryRoomsMap.get(name);
    const exit = exitRoomsMap.get(name);
    
    const entryValue = entry ? conditionValues[entry.condition] : 0;
    const exitValue = exit ? conditionValues[exit.condition] : 0;
    const degradation = entryValue - exitValue;

    return {
      name,
      entry,
      exit,
      degradation,
      hasDegradation: degradation > 0,
    };
  });

  const totalDegradations = roomComparisons.filter(r => r.hasDegradation).length;

  // Compare keys
  const entryKeysCount = entryEtat.keys_delivered.reduce((sum, k) => sum + k.quantity, 0);
  const exitKeysCount = exitEtat.keys_delivered.reduce((sum, k) => sum + k.quantity, 0);
  const keysDifference = entryKeysCount - exitKeysCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Comparaison états des lieux
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-500 text-white">Entrée</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {format(new Date(entryEtat.inspection_date), "dd MMMM yyyy", { locale: fr })}
              </p>
              {entryEtat.general_condition && (
                <p className="font-medium mt-1">
                  État général: {conditionLabels[entryEtat.general_condition]}
                </p>
              )}
            </div>
            <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-orange-500 text-white">Sortie</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {format(new Date(exitEtat.inspection_date), "dd MMMM yyyy", { locale: fr })}
              </p>
              {exitEtat.general_condition && (
                <p className="font-medium mt-1">
                  État général: {conditionLabels[exitEtat.general_condition]}
                </p>
              )}
            </div>
          </div>

          {/* Alerts */}
          {(totalDegradations > 0 || keysDifference > 0) && (
            <div className="p-4 border border-yellow-300 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Points d'attention</span>
              </div>
              <ul className="text-sm space-y-1 text-yellow-600 dark:text-yellow-400">
                {totalDegradations > 0 && (
                  <li>• {totalDegradations} pièce(s) avec dégradation constatée</li>
                )}
                {keysDifference > 0 && (
                  <li>• {keysDifference} clé(s) non restituée(s)</li>
                )}
              </ul>
            </div>
          )}

          {totalDegradations === 0 && keysDifference <= 0 && (
            <div className="p-4 border border-green-300 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  Aucune dégradation majeure constatée
                </span>
              </div>
            </div>
          )}

          <Tabs defaultValue="rooms" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="rooms">
                Pièces
                {totalDegradations > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 justify-center">
                    {totalDegradations}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="meters">Compteurs</TabsTrigger>
              <TabsTrigger value="keys">
                Clés
                {keysDifference > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 justify-center">
                    !
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rooms" className="mt-4 space-y-4">
              {roomComparisons.map(({ name, entry, exit, hasDegradation }) => (
                <div
                  key={name}
                  className={cn(
                    "p-4 border rounded-lg",
                    hasDegradation && "border-red-300 bg-red-50 dark:bg-red-950"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      {name}
                      {hasDegradation && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 items-center">
                    {/* Entry */}
                    <div className={cn("p-3 rounded-lg text-center", entry ? conditionColors[entry.condition] : "bg-gray-100")}>
                      <p className="text-xs mb-1">Entrée</p>
                      <p className="font-medium">
                        {entry ? conditionLabels[entry.condition] : "N/A"}
                      </p>
                    </div>
                    
                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                    
                    {/* Exit */}
                    <div className={cn("p-3 rounded-lg text-center", exit ? conditionColors[exit.condition] : "bg-gray-100")}>
                      <p className="text-xs mb-1">Sortie</p>
                      <p className="font-medium">
                        {exit ? conditionLabels[exit.condition] : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Details comparison */}
                  {entry && exit && (
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {(['walls', 'floor', 'ceiling', 'windows', 'doors', 'electricity', 'plumbing'] as const).map(field => {
                        const entryVal = entry[field];
                        const exitVal = exit[field];
                        if (!entryVal && !exitVal) return null;
                        
                        const labels: Record<string, string> = {
                          walls: "Murs",
                          floor: "Sol",
                          ceiling: "Plafond",
                          windows: "Fenêtres",
                          doors: "Portes",
                          electricity: "Électricité",
                          plumbing: "Plomberie",
                        };
                        
                        const hasChange = entryVal !== exitVal;
                        
                        return (
                          <div key={field} className={cn("flex justify-between", hasChange && "text-orange-600")}>
                            <span className="text-muted-foreground">{labels[field]}:</span>
                            <span>
                              {entryVal || "-"} → {exitVal || "-"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="meters" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Electricity */}
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Zap className="h-5 w-5" />
                    <span className="font-medium">Électricité</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
                      <p className="text-xs text-muted-foreground">Entrée</p>
                      <p className="font-medium">{entryEtat.electricity_meter || "-"}</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950 p-2 rounded">
                      <p className="text-xs text-muted-foreground">Sortie</p>
                      <p className="font-medium">{exitEtat.electricity_meter || "-"}</p>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      <p className="text-xs text-muted-foreground">Conso.</p>
                      <p className="font-medium">
                        {electricityConsumption !== null ? `${electricityConsumption} kWh` : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Water */}
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Droplets className="h-5 w-5" />
                    <span className="font-medium">Eau</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
                      <p className="text-xs text-muted-foreground">Entrée</p>
                      <p className="font-medium">{entryEtat.water_meter || "-"}</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950 p-2 rounded">
                      <p className="text-xs text-muted-foreground">Sortie</p>
                      <p className="font-medium">{exitEtat.water_meter || "-"}</p>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      <p className="text-xs text-muted-foreground">Conso.</p>
                      <p className="font-medium">
                        {waterConsumption !== null ? `${waterConsumption} m³` : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gas */}
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Flame className="h-5 w-5" />
                    <span className="font-medium">Gaz</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
                      <p className="text-xs text-muted-foreground">Entrée</p>
                      <p className="font-medium">{entryEtat.gas_meter || "-"}</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950 p-2 rounded">
                      <p className="text-xs text-muted-foreground">Sortie</p>
                      <p className="font-medium">{exitEtat.gas_meter || "-"}</p>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      <p className="text-xs text-muted-foreground">Conso.</p>
                      <p className="font-medium">
                        {gasConsumption !== null ? `${gasConsumption} m³` : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="keys" className="mt-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Entry keys */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-blue-500 text-white">Entrée</Badge>
                    <span className="text-sm text-muted-foreground">
                      {entryKeysCount} clé(s) remise(s)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {entryEtat.keys_delivered.map((key, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span>{key.type}</span>
                        <Badge variant="outline">{key.quantity}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exit keys */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-orange-500 text-white">Sortie</Badge>
                    <span className="text-sm text-muted-foreground">
                      {exitKeysCount} clé(s) restituée(s)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {exitEtat.keys_delivered.map((key, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span>{key.type}</span>
                        <Badge variant="outline">{key.quantity}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {keysDifference !== 0 && (
                <div className={cn(
                  "mt-4 p-4 border rounded-lg",
                  keysDifference > 0 
                    ? "border-red-300 bg-red-50 dark:bg-red-950" 
                    : "border-green-300 bg-green-50 dark:bg-green-950"
                )}>
                  <p className={cn(
                    "font-medium",
                    keysDifference > 0 ? "text-red-700" : "text-green-700"
                  )}>
                    {keysDifference > 0 
                      ? `⚠️ ${keysDifference} clé(s) non restituée(s)`
                      : `✓ ${Math.abs(keysDifference)} clé(s) supplémentaire(s) restituée(s)`
                    }
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
