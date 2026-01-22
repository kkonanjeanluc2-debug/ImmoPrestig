import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon: LucideIcon;
  iconColor?: "primary" | "emerald" | "amber" | "destructive";
  tooltip?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconColor = "primary",
  tooltip,
}: KPICardProps) {
  const iconColorClasses = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald/10 text-emerald",
    amber: "bg-amber-100 text-amber-600",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-lg", iconColorClasses[iconColor])}>
          <Icon className="h-5 w-5" />
        </div>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[200px]">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      
      <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      
      {(subtitle || trend) && (
        <div className="flex items-center gap-2 mt-2">
          {trend && (
            <span
              className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                trend.value >= 0
                  ? "bg-emerald/10 text-emerald"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
