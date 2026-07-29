"use client";

type CalendarSummaryChipProps = {
  label: string;
  value: string;
  hint: string;
};

/** Compact summary chip with hint — StatTile’s text-2xl / no-hint layout doesn’t match. */
export function CalendarSummaryChip({
  label,
  value,
  hint,
}: CalendarSummaryChipProps) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-0.5 text-lg font-medium text-foreground">{value}</p>
      <p className="text-[11px] text-muted">{hint}</p>
    </div>
  );
}
