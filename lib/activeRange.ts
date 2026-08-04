import { compareLocalDates } from "@/lib/dates";

/** Whether localDate falls inside an optional inclusive active window. */
export function isWithinActiveRange(
  localDate: string,
  start: string | null | undefined,
  end: string | null | undefined,
): boolean {
  if (start && compareLocalDates(localDate, start) < 0) return false;
  if (end && compareLocalDates(localDate, end) > 0) return false;
  return true;
}

/** Human-readable active window for list meta; null if open-ended. */
export function describeActiveRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  if (!start && !end) return null;
  if (start && end) return `${start} → ${end}`;
  if (start) return `From ${start}`;
  return `Until ${end}`;
}
