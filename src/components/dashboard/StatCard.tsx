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
    navy: "bg-primary/8 text-primary",
    emerald: "bg-accent/8 text-accent",
    sand: "bg-destructive/8 text-destructive",
  };

  const borderStyles = {
    navy: "border-l-primary",
    emerald: "border-l-accent",
    sand: "border-l-destructive",
  };

  const valueColor = changeType === "negative" ? "text-destructive" : "text-foreground";

  return (
    <div className={cn(
      "bg-card rounded-xl px-5 py-4 border border-border/40 border-l-[3px] shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4",
      borderStyles[iconBg]
    )}>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1 truncate">{title}</p>
        <p className={cn("text-xl font-display font-bold tracking-tight truncate", valueColor)}>{value}</p>
      </div>
      <div className={cn("p-2.5 rounded-xl flex-shrink-0", iconStyles[iconBg])}>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
    </div>
  );
}
