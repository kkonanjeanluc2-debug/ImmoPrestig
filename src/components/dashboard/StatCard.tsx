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
    <div className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50 animate-fade-in flex flex-col h-full min-h-[140px]">
      {/* Header row: Title + Icon */}
      <div className="flex items-start justify-between gap-3 mb-auto">
        <p className="text-sm font-medium text-muted-foreground leading-tight">{title}</p>
        <div className={cn("p-2.5 rounded-xl flex-shrink-0", iconBgClasses[iconBg])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      
      {/* Value and change */}
      <div className="mt-3">
        <p className="text-2xl sm:text-3xl font-display font-bold text-foreground truncate">{value}</p>
        {change && (
          <p className={cn("text-sm font-medium mt-1", changeClasses[changeType])}>
            {change}
          </p>
        )}
      </div>
    </div>
  );
}
