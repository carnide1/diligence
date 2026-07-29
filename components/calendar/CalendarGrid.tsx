"use client";

import type { CalendarDay } from "@/lib/calendarData";
import { WEEKDAY_LABELS } from "@/lib/weekdays";

type CalendarGridProps = {
  days: CalendarDay[];
  selected: CalendarDay | null;
  onSelectDay: (day: CalendarDay) => void;
  onHoverDay: (day: CalendarDay) => void;
  onLeaveDay: () => void;
};

export function CalendarGrid({
  days,
  selected,
  onSelectDay,
  onHoverDay,
  onLeaveDay,
}: CalendarGridProps) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-bg-elevated/80">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="px-1 py-2 text-center text-[10px] uppercase tracking-wide text-faint"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <button
            key={day.localDate}
            type="button"
            disabled={!day.inMonth}
            onClick={() => day.inMonth && onSelectDay(day)}
            onMouseEnter={() => day.inMonth && onHoverDay(day)}
            onMouseLeave={onLeaveDay}
            className={[
              "min-h-[4.75rem] border-b border-r border-border p-1.5 text-left transition-colors last:border-r-0",
              day.inMonth ? "hover:bg-bg-overlay/70" : "bg-bg/40 text-faint",
              day.isToday ? "ring-1 ring-inset ring-accent/50" : "",
              selected?.localDate === day.localDate ? "bg-accent-soft/40" : "",
            ].join(" ")}
            title={day.inMonth ? "View day details" : undefined}
          >
            <div className="flex items-start justify-between gap-1">
              <span
                className={[
                  "text-sm",
                  day.inMonth ? "text-muted" : "text-faint",
                  day.isToday ? "font-semibold text-accent" : "",
                ].join(" ")}
              >
                {Number(day.localDate.slice(8))}
              </span>
              <ToneMark tone={day.tone} inMonth={day.inMonth} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ToneMark({
  tone,
  inMonth,
}: {
  tone: CalendarDay["tone"];
  inMonth: boolean;
}) {
  if (!inMonth || tone === "empty") return null;
  const mark =
    tone === "complete"
      ? "✓"
      : tone === "miss"
        ? "×"
        : tone === "upcoming"
          ? "·"
          : tone === "partial"
            ? "∼"
            : "•";
  const color =
    tone === "complete"
      ? "text-success"
      : tone === "miss"
        ? "text-danger"
        : tone === "upcoming"
          ? "text-accent"
          : "text-muted";
  return (
    <span className={`text-base font-semibold leading-none ${color}`}>
      {mark}
    </span>
  );
}
