import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface DraggableWidgetProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function DraggableWidget({ id, children, className }: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-50",
        className
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        aria-label="Réorganiser"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}
