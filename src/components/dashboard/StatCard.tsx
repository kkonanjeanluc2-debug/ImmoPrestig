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
    <div className="bg-card rounded-xl px-5 py-4 border border-border/30 shadow-sm animate-fade-in flex items-center justify-between gap-4 h-full min-h-[90px]">
      {/* Left: Title + Value */}
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground tracking-wide">{title}</p>
        <p className={cn("text-xl font-bold tracking-tight leading-none truncate", changeType === "negative" ? "text-destructive" : "text-foreground")}>{value}</p>
        {change && (
          <p className={cn("text-[11px] font-medium mt-0.5", changeClasses[changeType])}>
            {change}
          </p>
        )}
      </div>

      {/* Right: Icon */}
      <div className={cn("p-2.5 rounded-xl flex-shrink-0", iconStyles[iconBg])}>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
    </div>
  );
}
