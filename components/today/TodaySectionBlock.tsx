"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type { TodayItem, TodaySection } from "@/lib/todayFeed";
import type { DayPartKey } from "@/types/user";
import { TodayItemRow } from "./TodayItemRow";

type TodaySectionBlockProps = {
  section: TodaySection;
  onEditHeader: (dayPart: DayPartKey) => void;
  onToggle: (item: TodayItem) => void;
  onReorder: (dayPart: DayPartKey, items: TodayItem[]) => void;
};

export function TodaySectionBlock({
  section,
  onEditHeader,
  onToggle,
  onReorder,
}: TodaySectionBlockProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = section.items.findIndex((i) => i.id === active.id);
    const newIndex = section.items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(section.dayPart, arrayMove(section.items, oldIndex, newIndex));
  };

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => onEditHeader(section.dayPart)}
        className="flex w-full items-baseline justify-between gap-2 rounded-[var(--radius-sm)] px-1 py-1 text-left hover:bg-bg-overlay/60"
      >
        <h2 className="font-display text-lg text-foreground">{section.label}</h2>
        <span className="text-xs text-faint">{section.rangeLabel}</span>
      </button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={section.items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-2">
            {section.items.map((item) => (
              <TodayItemRow
                key={item.id}
                item={item}
                onToggle={() => onToggle(item)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}
