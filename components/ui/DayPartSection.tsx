"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { DayPartKey } from "@/types/user";

type DayPartSectionProps = {
  dayPart: DayPartKey;
  label: string;
  count: number;
  rangeLabel?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function DayPartSection({
  dayPart,
  label,
  count,
  rangeLabel,
  defaultOpen = true,
  children,
}: DayPartSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`day-part-${dayPart}`}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-1 py-1.5 text-left transition-colors hover:bg-bg-overlay/60"
      >
        <ChevronDown
          size={18}
          className={[
            "shrink-0 text-faint transition-transform duration-150",
            open ? "" : "-rotate-90",
          ].join(" ")}
        />
        <h2 className="min-w-0 flex-1 font-display text-lg text-foreground">
          {label}
        </h2>
        {rangeLabel ? (
          <span className="hidden text-xs text-faint sm:inline">{rangeLabel}</span>
        ) : null}
        <span className="rounded bg-bg-overlay px-1.5 py-0.5 text-[11px] tabular-nums text-faint">
          {count}
        </span>
      </button>

      {open ? (
        <div id={`day-part-${dayPart}`} className="space-y-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}
