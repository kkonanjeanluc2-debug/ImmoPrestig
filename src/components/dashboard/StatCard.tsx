import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconBg?: "navy" | "emerald" | "sand";
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon,
  iconBg = "navy"
}: StatCardProps) {
  const iconBgClasses = {
    navy: "bg-navy/10 text-navy",
    emerald: "bg-emerald/10 text-emerald",
    sand: "bg-sand text-navy",
  };

  const changeClasses = {
    positive: "text-emerald",
    negative: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-display font-bold text-foreground">{value}</p>
          {change && (
            <p className={cn("text-sm font-medium", changeClasses[changeType])}>
              {change}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconBgClasses[iconBg])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
