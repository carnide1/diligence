"use client";

import {
  formatPeriodRange,
  minutesToLabel,
} from "@/lib/dayPeriods";
import { useDayPeriodsDraft } from "@/hooks/useDayPeriodsDraft";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";

export function DayPeriodsEditor() {
  const {
    profile,
    periods,
    dirty,
    saving,
    onStartChange,
    onEndChange,
    reset,
    save,
  } = useDayPeriodsDraft();

  if (!profile) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-medium text-foreground">Day periods</h2>
        <p className="mt-1 text-sm text-muted">
          Ranges must cover 24 hours with no gaps. Editing one end snaps the
          neighbor.
        </p>
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated">
        <ul className="divide-y divide-border/60">
          {periods.map((period) => (
            <li key={period.key} className="px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {period.label}
                </span>
                <span className="text-xs text-faint">
                  {formatPeriodRange(period)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextInput
                  label="Start"
                  defaultValue={minutesToLabel(period.startMinutes)}
                  key={`${period.key}-start-${period.startMinutes}`}
                  onBlur={(e) => onStartChange(period.key, e.target.value)}
                />
                <TextInput
                  label="End"
                  defaultValue={minutesToLabel(period.endMinutes)}
                  key={`${period.key}-end-${period.endMinutes}`}
                  onBlur={(e) => onEndChange(period.key, e.target.value)}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save day periods"}
        </Button>
        {dirty ? (
          <Button variant="ghost" onClick={reset} disabled={saving}>
            Reset
          </Button>
        ) : null}
      </div>
    </section>
  );
}
