import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

const WIDGET_TYPE = "DASHBOARD_WIDGET";

interface DragItem {
  id: string;
  index: number;
}

interface DraggableWidgetProps {
  id: string;
  index: number;
  children: ReactNode;
  className?: string;
  onMove: (dragIndex: number, hoverIndex: number) => void;
}

export function DraggableWidget({ id, index, children, className, onMove }: DraggableWidgetProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: WIDGET_TYPE,
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop<DragItem>({
    accept: WIDGET_TYPE,
    hover(item, monitor) {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the item's height
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  preview(drop(ref));

  return (
    <div
      ref={ref}
      className={cn(
        "relative group",
        isDragging && "opacity-50",
        className
      )}
    >
      <button
        ref={drag}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        aria-label="Réorganiser"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}
