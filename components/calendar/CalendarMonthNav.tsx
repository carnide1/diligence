"use client";

import type { RefObject } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { monthLabel } from "@/lib/calendarData";
import { Button } from "@/components/ui/Button";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

type CalendarMonthNavProps = {
  anchor: Date;
  pickerOpen: boolean;
  pickerYear: number;
  monthPickerRef: RefObject<HTMLDivElement | null>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onTogglePicker: () => void;
  onPickerYearChange: (year: number) => void;
  onSelectMonth: (monthIndex: number) => void;
  onGoToday: () => void;
};

export function CalendarMonthNav({
  anchor,
  pickerOpen,
  pickerYear,
  monthPickerRef,
  onPrevMonth,
  onNextMonth,
  onTogglePicker,
  onPickerYearChange,
  onSelectMonth,
  onGoToday,
}: CalendarMonthNavProps) {
  return (
    <div className="relative flex items-center gap-1" ref={monthPickerRef}>
      <Button
        size="sm"
        variant="secondary"
        aria-label="Previous month"
        onClick={onPrevMonth}
        className="!px-2"
      >
        <ChevronLeft size={18} />
      </Button>

      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={pickerOpen}
        onClick={onTogglePicker}
        className="inline-flex h-8 min-w-[9.5rem] items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-border bg-bg-overlay px-3 text-sm font-medium text-foreground transition-colors hover:border-border-strong"
      >
        {monthLabel(anchor)}
        <ChevronDown
          size={14}
          className={[
            "text-faint transition-transform",
            pickerOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      <Button
        size="sm"
        variant="secondary"
        aria-label="Next month"
        onClick={onNextMonth}
        className="!px-2"
      >
        <ChevronRight size={18} />
      </Button>

      {pickerOpen ? (
        <div
          role="dialog"
          aria-label="Choose month"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-[var(--radius)] border border-border bg-bg-elevated p-3 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous year"
              className="rounded-[var(--radius-sm)] p-1.5 text-muted hover:bg-bg-overlay hover:text-foreground"
              onClick={() => onPickerYearChange(pickerYear - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-medium text-foreground">{pickerYear}</p>
            <button
              type="button"
              aria-label="Next year"
              className="rounded-[var(--radius-sm)] p-1.5 text-muted hover:bg-bg-overlay hover:text-foreground"
              onClick={() => onPickerYearChange(pickerYear + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_SHORT.map((label, monthIndex) => {
              const isSelected =
                anchor.getFullYear() === pickerYear &&
                anchor.getMonth() === monthIndex;
              const isCurrent =
                new Date().getFullYear() === pickerYear &&
                new Date().getMonth() === monthIndex;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onSelectMonth(monthIndex)}
                  className={[
                    "rounded-[var(--radius-sm)] px-2 py-2 text-sm transition-colors",
                    isSelected
                      ? "bg-accent text-bg"
                      : isCurrent
                        ? "bg-accent-soft text-accent hover:brightness-110"
                        : "text-foreground hover:bg-bg-overlay",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-muted hover:bg-bg-overlay hover:text-foreground"
            onClick={onGoToday}
          >
            Today · {format(new Date(), "MMM yyyy")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
