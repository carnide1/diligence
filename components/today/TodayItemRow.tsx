"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { TodayItem } from "@/lib/todayFeed";
import { HabitIcon } from "@/components/icons/HabitIcon";

type TodayItemRowProps = {
  item: TodayItem;
  onToggle: () => void;
};

export function TodayItemRow({ item, onToggle }: TodayItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-bg-elevated/60 px-2 py-2.5"
    >
      <button
        type="button"
        className="cursor-grab touch-none p-1 text-faint hover:text-muted active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      <button
        type="button"
        onClick={onToggle}
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm",
          item.done
            ? "border-success bg-success-soft text-success"
            : "border-border text-faint",
        ].join(" ")}
        aria-label={item.done ? "Undo" : "Complete"}
      >
        {item.done ? "✓" : ""}
      </button>

      <span className="text-accent">
        <HabitIcon iconKey={item.icon} size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={[
            "truncate text-sm font-medium",
            item.done ? "text-muted line-through" : "text-foreground",
          ].join(" ")}
        >
          <span className="text-faint">
            {item.kind === "habit" ? "Habit: " : "Goal: "}
          </span>
          {item.title}
        </p>
        {item.kind === "goal" && item.leftover && !item.done ? (
          <span className="text-[10px] uppercase tracking-wide text-accent">
            Leftover
          </span>
        ) : null}
      </div>
    </li>
  );
}
