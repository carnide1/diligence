import { addDays, format, getISOWeek, getISOWeekYear, startOfWeek } from "date-fns";
import {
  addLocalDays,
  compareLocalDates,
  parseLocalDate,
  toLocalDateString,
} from "@/lib/dates";
import type { GymAbsence } from "@/types/gym";
import { WEEKLY_WORKOUT_TARGET } from "@/types/gym";

/** Monday–Sunday week containing localDate (contract Calendar Week). */
export function gymWeekBounds(localDate: string): {
  start: string;
  end: string;
} {
  const start = startOfWeek(parseLocalDate(localDate), { weekStartsOn: 1 });
  return {
    start: toLocalDateString(start),
    end: toLocalDateString(addDays(start, 6)),
  };
}

/** Stable id for a Monday-start week, e.g. 2026-W31. */
export function gymWeekId(localDate: string): string {
  const d = parseLocalDate(localDate);
  const year = getISOWeekYear(d);
  const week = getISOWeek(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function daysLeftInGymWeek(
  localDate: string,
): number {
  const { end } = gymWeekBounds(localDate);
  // Inclusive: today counts as a remaining day.
  let count = 0;
  let cursor = localDate;
  while (compareLocalDates(cursor, end) <= 0) {
    count += 1;
    cursor = addLocalDays(cursor, 1);
  }
  return count;
}

export function absenceCoversWeek(
  absence: Pick<GymAbsence, "startLocalDate" | "endLocalDate">,
  weekStart: string,
  weekEnd: string,
): boolean {
  // Waive if absence overlaps the week at all.
  return (
    compareLocalDates(absence.startLocalDate, weekEnd) <= 0 &&
    compareLocalDates(absence.endLocalDate, weekStart) >= 0
  );
}

export function isWeekWaived(
  absences: Pick<GymAbsence, "startLocalDate" | "endLocalDate">[],
  localDateInWeek: string,
): boolean {
  const { start, end } = gymWeekBounds(localDateInWeek);
  return absences.some((a) => absenceCoversWeek(a, start, end));
}

export function requiredWorkoutsForWeek(
  absences: Pick<GymAbsence, "startLocalDate" | "endLocalDate">[],
  localDateInWeek: string,
  target = WEEKLY_WORKOUT_TARGET,
): number {
  return isWeekWaived(absences, localDateInWeek) ? 0 : target;
}

export function weekAtRisk(args: {
  acceptedCount: number;
  required: number;
  localDate: string;
  completedToday: boolean;
}): boolean {
  const { acceptedCount, required, localDate, completedToday } = args;
  if (required <= 0) return false;
  const stillNeeded = Math.max(0, required - acceptedCount);
  if (stillNeeded === 0) return false;
  let daysLeft = daysLeftInGymWeek(localDate);
  // If today is already completed, remaining slots start tomorrow.
  if (completedToday && daysLeft > 0) {
    daysLeft -= 1;
  }
  return stillNeeded > daysLeft;
}

export function formatWeekLabel(localDate: string): string {
  const { start, end } = gymWeekBounds(localDate);
  return `${format(parseLocalDate(start), "MMM d")} – ${format(parseLocalDate(end), "MMM d")}`;
}
