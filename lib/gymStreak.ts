import { addLocalDays, compareLocalDates } from "@/lib/dates";
import { gymWeekBounds, gymWeekId, isWeekWaived, requiredWorkoutsForWeek } from "@/lib/gymWeek";
import type { GymAbsence, GymStats } from "@/types/gym";
import { WEEKLY_WORKOUT_TARGET } from "@/types/gym";

export type WeekResolution = {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  required: number;
  acceptedCount: number;
  met: boolean;
  waived: boolean;
};

export function resolveWeek(args: {
  localDateInWeek: string;
  acceptedCount: number;
  absences: Pick<GymAbsence, "startLocalDate" | "endLocalDate">[];
  target?: number;
}): WeekResolution {
  const { start, end } = gymWeekBounds(args.localDateInWeek);
  const waived = isWeekWaived(args.absences, args.localDateInWeek);
  const required = requiredWorkoutsForWeek(
    args.absences,
    args.localDateInWeek,
    args.target ?? WEEKLY_WORKOUT_TARGET,
  );
  const met = waived || args.acceptedCount >= required;
  return {
    weekId: gymWeekId(args.localDateInWeek),
    weekStart: start,
    weekEnd: end,
    required,
    acceptedCount: args.acceptedCount,
    met,
    waived,
  };
}

/**
 * Walk closed weeks (those whose Sunday is before `today`) since lastResolvedWeekId
 * and update streak. Call on app open / cron.
 */
export function catchUpGymStreaks(args: {
  stats: GymStats;
  today: string;
  /** acceptedCount keyed by gymWeekId for weeks that need resolution */
  acceptedByWeekId: Record<string, number>;
  absences: Pick<GymAbsence, "startLocalDate" | "endLocalDate">[];
}): { stats: GymStats; resolved: WeekResolution[] } {
  const resolved: WeekResolution[] = [];
  let { currentStreak, longestStreak, lastResolvedWeekId } = args.stats;

  // Start from Monday of week after last resolved, or a sane lookback.
  let cursorMonday: string;
  if (lastResolvedWeekId) {
    // Find a date in that week by scanning back from today — simpler: start
    // from 8 weeks before today and skip already-resolved.
    cursorMonday = gymWeekBounds(addLocalDays(args.today, -7 * 8)).start;
  } else {
    cursorMonday = gymWeekBounds(addLocalDays(args.today, -7 * 8)).start;
  }

  const todayWeekStart = gymWeekBounds(args.today).start;

  while (compareLocalDates(cursorMonday, todayWeekStart) < 0) {
    const { end } = gymWeekBounds(cursorMonday);
    const weekId = gymWeekId(cursorMonday);

    // Skip if already resolved up through this week.
    if (lastResolvedWeekId && weekId <= lastResolvedWeekId) {
      cursorMonday = addLocalDays(end, 1);
      continue;
    }

    const acceptedCount = args.acceptedByWeekId[weekId] ?? 0;
    const week = resolveWeek({
      localDateInWeek: cursorMonday,
      acceptedCount,
      absences: args.absences,
    });
    resolved.push(week);

    if (week.met) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    lastResolvedWeekId = weekId;
    cursorMonday = addLocalDays(end, 1);
  }

  return {
    stats: { currentStreak, longestStreak, lastResolvedWeekId },
    resolved,
  };
}
