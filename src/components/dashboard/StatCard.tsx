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
  const iconStyles = {
    navy: "bg-primary/8 text-primary ring-1 ring-primary/10",
    emerald: "bg-accent/8 text-accent ring-1 ring-accent/10",
    sand: "bg-secondary/40 text-primary ring-1 ring-secondary/60",
  };

  const changeClasses = {
    positive: "text-accent",
    negative: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="group relative bg-card rounded-2xl p-6 border border-border/40 shadow-sm hover:shadow-md hover:border-border/70 transition-all duration-300 ease-out animate-fade-in flex flex-col h-full min-h-[150px] overflow-hidden">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
      
      {/* Header row: Title + Icon */}
      <div className="relative flex items-start justify-between gap-3 mb-auto">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground/80 leading-tight">{title}</p>
        <div className={cn("p-2.5 rounded-xl flex-shrink-0 transition-transform duration-300 group-hover:scale-105", iconStyles[iconBg])}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </div>
      </div>
      
      {/* Value and change */}
      <div className="relative mt-4">
        <p className="text-[28px] font-display font-bold text-foreground tracking-tight leading-none truncate">{value}</p>
        {change && (
          <p className={cn("text-[13px] font-medium mt-2 tracking-tight", changeClasses[changeType])}>
            {change}
          </p>
        )}
      </div>
    </div>
  );
}
