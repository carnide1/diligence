import {
  DAY_PART_KEYS,
  DAY_PART_LABELS,
  type DayPartKey,
  type DayPeriod,
} from "../types/user";

const MINUTES_PER_DAY = 24 * 60;

/** Blueprint §6 defaults. */
export const DEFAULT_DAY_PERIODS: DayPeriod[] = [
  { key: "dawning", label: DAY_PART_LABELS.dawning, startMinutes: 7 * 60, endMinutes: 9 * 60 },
  { key: "morning", label: DAY_PART_LABELS.morning, startMinutes: 9 * 60, endMinutes: 12 * 60 },
  { key: "noon", label: DAY_PART_LABELS.noon, startMinutes: 12 * 60, endMinutes: 13 * 60 },
  { key: "afternoon", label: DAY_PART_LABELS.afternoon, startMinutes: 13 * 60, endMinutes: 18 * 60 },
  { key: "dinner", label: DAY_PART_LABELS.dinner, startMinutes: 18 * 60, endMinutes: 19 * 60 },
  { key: "evening", label: DAY_PART_LABELS.evening, startMinutes: 19 * 60, endMinutes: 23 * 60 },
  { key: "night", label: DAY_PART_LABELS.night, startMinutes: 23 * 60, endMinutes: 7 * 60 },
];

export function minutesToLabel(minutes: number): string {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function labelToMinutes(label: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(label.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const min = Number(match[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function periodDurationMinutes(period: DayPeriod): number {
  if (period.endMinutes > period.startMinutes) {
    return period.endMinutes - period.startMinutes;
  }
  // Wraps midnight (Night)
  return MINUTES_PER_DAY - period.startMinutes + period.endMinutes;
}

export function validateDayPeriods(periods: DayPeriod[]): string | null {
  if (periods.length !== DAY_PART_KEYS.length) {
    return "Expected all 7 day periods.";
  }

  for (let i = 0; i < periods.length; i++) {
    const expected = DAY_PART_KEYS[i];
    if (periods[i].key !== expected) {
      return `Period order must be ${DAY_PART_KEYS.join(", ")}.`;
    }
    if (periodDurationMinutes(periods[i]) <= 0) {
      return `${periods[i].label} must have a positive duration.`;
    }
  }

  let total = 0;
  for (let i = 0; i < periods.length; i++) {
    const current = periods[i];
    const next = periods[(i + 1) % periods.length];
    if (current.endMinutes !== next.startMinutes) {
      return `${current.label} must meet ${next.label} with no gap or overlap.`;
    }
    total += periodDurationMinutes(current);
  }

  if (total !== MINUTES_PER_DAY) {
    return "Day periods must cover exactly 24 hours.";
  }

  return null;
}

function clonePeriods(periods: DayPeriod[]): DayPeriod[] {
  return periods.map((p) => ({ ...p }));
}

/**
 * Edit period start. Previous period's end snaps to the same minute.
 * Rejects edits that would zero out this or the previous period.
 */
export function adjustPeriodStart(
  periods: DayPeriod[],
  key: DayPartKey,
  nextStartMinutes: number,
): DayPeriod[] | { error: string } {
  const idx = periods.findIndex((p) => p.key === key);
  if (idx < 0) return { error: "Unknown day period." };

  const start =
    ((nextStartMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const next = clonePeriods(periods);
  const prevIdx = (idx - 1 + next.length) % next.length;

  next[idx] = { ...next[idx], startMinutes: start };
  next[prevIdx] = { ...next[prevIdx], endMinutes: start };

  const error = validateDayPeriods(next);
  if (error) return { error };
  return next;
}

/**
 * Edit period end. Next period's start snaps to the same minute.
 */
export function adjustPeriodEnd(
  periods: DayPeriod[],
  key: DayPartKey,
  nextEndMinutes: number,
): DayPeriod[] | { error: string } {
  const idx = periods.findIndex((p) => p.key === key);
  if (idx < 0) return { error: "Unknown day period." };

  const end =
    ((nextEndMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const next = clonePeriods(periods);
  const nextIdx = (idx + 1) % next.length;

  next[idx] = { ...next[idx], endMinutes: end };
  next[nextIdx] = { ...next[nextIdx], startMinutes: end };

  const error = validateDayPeriods(next);
  if (error) return { error };
  return next;
}

export function formatPeriodRange(period: DayPeriod): string {
  return `${minutesToLabel(period.startMinutes)}–${minutesToLabel(period.endMinutes)}`;
}
