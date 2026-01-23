import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAutomationLogs, TASK_TYPE_LABELS, TASK_TYPE_COLORS, TaskType, ExecutionStatus } from "@/hooks/useAutomationLogs";
import { Loader2, History, CheckCircle2, XCircle, AlertTriangle, Clock, Filter } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const STATUS_CONFIG: Record<ExecutionStatus, { label: string; icon: React.ElementType; className: string }> = {
  running: { label: "En cours", icon: Clock, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  success: { label: "Succès", icon: CheckCircle2, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  partial: { label: "Partiel", icon: AlertTriangle, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  failed: { label: "Échec", icon: XCircle, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

export function AutomationHistory() {
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType | "all">("all");
  const { data: logs, isLoading } = useAutomationLogs(
    100,
    selectedTaskType === "all" ? undefined : selectedTaskType
  );

  const formatDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return "—";
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const durationMs = end - start;
    
    if (durationMs < 1000) return `${durationMs}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
    return `${Math.round(durationMs / 60000)}min`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des exécutions
            </CardTitle>
            <CardDescription>
              Suivi des tâches automatiques exécutées par votre agence
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedTaskType}
              onValueChange={(value) => setSelectedTaskType(value as TaskType | "all")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les tâches</SelectItem>
                {Object.entries(TASK_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune exécution enregistrée</p>
            <p className="text-sm mt-1">
              L'historique apparaîtra ici lorsque les tâches automatiques seront exécutées.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => {
                const statusConfig = STATUS_CONFIG[log.status as ExecutionStatus];
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    {/* Status Icon */}
                    <div className={`p-2 rounded-full ${statusConfig.className}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="secondary" 
                          className={TASK_TYPE_COLORS[log.task_type as TaskType]}
                        >
                          {TASK_TYPE_LABELS[log.task_type as TaskType] || log.task_type}
                        </Badge>
                        <Badge variant="outline" className={statusConfig.className}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm text-muted-foreground truncate">
                              {format(new Date(log.started_at), "PPpp", { locale: fr })}
                              {" • "}
                              {formatDistanceToNow(new Date(log.started_at), { 
                                addSuffix: true, 
                                locale: fr 
                              })}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Début : {format(new Date(log.started_at), "PPpp", { locale: fr })}</p>
                            {log.completed_at && (
                              <p>Fin : {format(new Date(log.completed_at), "PPpp", { locale: fr })}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {log.error_message && (
                        <p className="text-sm text-destructive mt-1 truncate">
                          {log.error_message}
                        </p>
                      )}
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 text-sm">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-center">
                              <p className="font-semibold">{log.items_processed}</p>
                              <p className="text-xs text-muted-foreground">Traités</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{log.items_success} réussi(s)</p>
                            <p>{log.items_failed} échoué(s)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {log.items_success > 0 && (
                        <div className="text-center text-green-600 dark:text-green-400">
                          <p className="font-semibold">{log.items_success}</p>
                          <p className="text-xs">Réussis</p>
                        </div>
                      )}

                      {log.items_failed > 0 && (
                        <div className="text-center text-red-600 dark:text-red-400">
                          <p className="font-semibold">{log.items_failed}</p>
                          <p className="text-xs">Échoués</p>
                        </div>
                      )}

                      <div className="text-center text-muted-foreground">
                        <p className="font-semibold">
                          {formatDuration(log.started_at, log.completed_at)}
                        </p>
                        <p className="text-xs">Durée</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
