import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Building2, Users, Crown, Infinity } from "lucide-react";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface QuotaItemProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  max: number | null;
  colorClass: string;
}

function QuotaItem({ icon, label, current, max, colorClass }: QuotaItemProps) {
  const isUnlimited = max === null;
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= max;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className={isAtLimit ? "text-destructive font-semibold" : "text-foreground"}>
            {current}
          </span>
          <span className="text-muted-foreground">/</span>
          {isUnlimited ? (
            <Infinity className="h-4 w-4 text-muted-foreground" />
          ) : (
            <span className="text-muted-foreground">{max}</span>
          )}
        </div>
      </div>
      {!isUnlimited && (
        <Progress 
          value={percentage} 
          className={`h-2 ${isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-amber-500" : `[&>div]:${colorClass}`}`}
        />
      )}
      {isUnlimited && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full w-full ${colorClass} opacity-30`} />
        </div>
      )}
    </div>
  );
}

export function SubscriptionQuotaCard() {
  const navigate = useNavigate();
  const limits = useSubscriptionLimits();

  if (limits.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasLimits = limits.maxProperties !== null || limits.maxTenants !== null;
  const isNearAnyLimit = 
    (limits.maxProperties !== null && limits.propertiesRemaining !== null && limits.propertiesRemaining <= 2) ||
    (limits.maxTenants !== null && limits.tenantsRemaining !== null && limits.tenantsRemaining <= 2);

  return (
    <Card className={isNearAnyLimit ? "border-amber-500/50" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            Forfait {limits.planName}
          </CardTitle>
          {hasLimits && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 text-emerald hover:text-emerald-dark"
              onClick={() => navigate("/settings?tab=subscription")}
            >
              Mettre à niveau
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <QuotaItem
          icon={<Building2 className="h-4 w-4 text-blue-500" />}
          label="Biens"
          current={limits.currentProperties}
          max={limits.maxProperties}
          colorClass="bg-blue-500"
        />
        <QuotaItem
          icon={<Users className="h-4 w-4 text-emerald" />}
          label="Locataires"
          current={limits.currentTenants}
          max={limits.maxTenants}
          colorClass="bg-emerald"
        />
        {isNearAnyLimit && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md">
            Vous approchez des limites de votre forfait. Pensez à passer au niveau supérieur.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
