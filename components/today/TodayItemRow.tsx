"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Flag, GripVertical, Repeat } from "lucide-react";
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

  const href = item.kind === "habit" ? "/habits" : "/goals";
  const description =
    item.kind === "habit" ? item.habit.description : item.goal.description;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-[var(--radius)] border border-border bg-bg-elevated/60 px-2 py-2.5"
    >
      <button
        type="button"
        className="mt-0.5 cursor-grab touch-none p-1 text-faint hover:text-muted active:cursor-grabbing"
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
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm",
          item.done
            ? "border-success bg-success-soft text-success"
            : "border-border text-faint",
        ].join(" ")}
        aria-label={item.done ? "Undo" : "Complete"}
      >
        {item.done ? "✓" : ""}
      </button>

      <span className="mt-1 shrink-0 text-accent">
        <HabitIcon iconKey={item.icon} size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className={[
            "block break-words text-sm font-medium hover:text-accent",
            item.done ? "text-muted line-through" : "text-foreground",
          ].join(" ")}
        >
          {item.title}
        </Link>
        {item.kind === "goal" && item.leftover && !item.done ? (
          <span className="text-[10px] uppercase tracking-wide text-accent">
            Leftover
          </span>
        ) : null}
        {description?.trim() ? (
          <p className="mt-1 line-clamp-2 break-words text-xs text-muted">
            {description}
          </p>
        ) : null}
      </div>

      <Link
        href={href}
        className="mt-1 shrink-0 text-faint hover:text-accent"
        title={item.kind === "habit" ? "Open Habits" : "Open Goals"}
        aria-label={item.kind === "habit" ? "Open Habits" : "Open Goals"}
      >
        {item.kind === "habit" ? <Repeat size={15} /> : <Flag size={15} />}
      </Link>
    </li>
  );
}
