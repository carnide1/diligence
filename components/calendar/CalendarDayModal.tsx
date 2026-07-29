"use client";

import { Flag, Repeat } from "lucide-react";
import { HabitIcon } from "@/components/icons/HabitIcon";
import { Modal } from "@/components/ui/Modal";
import type { CalendarDay } from "@/lib/calendarData";

type CalendarDayModalProps = {
  selected: CalendarDay | null;
  onClose: () => void;
};

export function CalendarDayModal({ selected, onClose }: CalendarDayModalProps) {
  return (
    <Modal
      open={selected !== null}
      title={selected?.localDate ?? "Day"}
      onClose={onClose}
    >
      {selected ? (
        <div className="space-y-3">
          {selected.items.length === 0 ? (
            <p className="text-sm text-muted">
              {selected.isFuture
                ? "No upcoming habits scheduled."
                : "Nothing recorded for this day."}
            </p>
          ) : (
            <ul className="space-y-2">
              {selected.items.map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="mt-0.5 text-accent">
                    <HabitIcon iconKey={item.icon} size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-foreground">{item.title}</p>
                      <span
                        className="shrink-0 text-faint"
                        title={item.kind === "habit" ? "Habit" : "Goal"}
                      >
                        {item.kind === "habit" ? (
                          <Repeat size={14} />
                        ) : (
                          <Flag size={14} />
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {item.status === "completed" && item.completedAtLabel
                        ? `Completed at ${item.completedAtLabel}`
                        : item.status === "completed"
                          ? "Completed"
                          : item.status === "upcoming"
                            ? "Scheduled"
                            : item.status === "open"
                              ? "Not completed yet"
                              : "Not completed"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
