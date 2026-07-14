"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  adjustPeriodEnd,
  adjustPeriodStart,
  formatPeriodRange,
  labelToMinutes,
  minutesToLabel,
  validateDayPeriods,
} from "@/lib/dayPeriods";
import { useUserProfile } from "@/contexts/UserProfileContext";
import type { DayPartKey, DayPeriod } from "@/types/user";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";

export function DayPeriodsEditor() {
  const { profile, saveDayPeriods } = useUserProfile();
  const [draft, setDraft] = useState<DayPeriod[] | null>(null);
  const [saving, setSaving] = useState(false);

  const periods = draft ?? profile?.dayPeriods ?? [];

  const applyChange = (
    result: DayPeriod[] | { error: string },
  ): boolean => {
    if ("error" in result) {
      toast.error(result.error);
      return false;
    }
    setDraft(result);
    return true;
  };

  const onStartChange = (key: DayPartKey, value: string) => {
    const minutes = labelToMinutes(value);
    if (minutes === null) return;
    applyChange(adjustPeriodStart(periods, key, minutes));
  };

  const onEndChange = (key: DayPartKey, value: string) => {
    const minutes = labelToMinutes(value);
    if (minutes === null) return;
    applyChange(adjustPeriodEnd(periods, key, minutes));
  };

  const onSave = async () => {
    const error = validateDayPeriods(periods);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      await saveDayPeriods(periods);
      setDraft(null);
      toast.success("Day periods saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const dirty = draft !== null;

  if (!profile) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-medium text-foreground">Day periods</h2>
        <p className="mt-1 text-sm text-muted">
          Ranges must cover 24 hours with no gaps. Editing one end snaps the
          neighbor (Tomorrow’s Today headers will reuse this).
        </p>
      </div>

      <ul className="space-y-3">
        {periods.map((period) => (
          <li
            key={period.key}
            className="rounded-[var(--radius)] border border-border bg-bg-elevated/50 px-3 py-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{period.label}</span>
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

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save day periods"}
        </Button>
        {dirty ? (
          <Button
            variant="ghost"
            onClick={() => setDraft(null)}
            disabled={saving}
          >
            Reset
          </Button>
        ) : null}
      </div>
    </section>
  );
}
