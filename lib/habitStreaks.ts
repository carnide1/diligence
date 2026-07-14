import type { Habit } from "../types/habit";
import {
  addLocalDays,
  compareLocalDates,
  eachLocalDate,
  isSaturday,
  toLocalDateString,
  weekBounds,
  yesterdayLocalDate,
} from "./dates";
import { isHabitDueOn, isScheduledOn } from "./habitSchedule";

export type StreakFields = {
  currentStreak: number;
  longestStreak: number;
};

function bumpLongest(fields: StreakFields): StreakFields {
  return {
    currentStreak: fields.currentStreak,
    longestStreak: Math.max(fields.longestStreak, fields.currentStreak),
  };
}

export function countCompletionsInWeek(
  completedDates: ReadonlySet<string>,
  localDate: string,
): number {
  const { start, end } = weekBounds(localDate);
  let count = 0;
  for (const d of eachLocalDate(start, end)) {
    if (completedDates.has(d)) count += 1;
  }
  return count;
}

/**
 * Resolve streak effects for the end of `localDate` (day-boundary).
 * Does not advance lastResolved — caller does.
 */
export function resolveHabitStreakOnDayBoundary(
  habit: Pick<Habit, "schedule" | "paused" | "currentStreak" | "longestStreak">,
  localDate: string,
  completedDates: ReadonlySet<string>,
): StreakFields {
  if (habit.paused) {
    return {
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
    };
  }

  let currentStreak = habit.currentStreak;
  const longestStreak = habit.longestStreak;

  if (habit.schedule.type === "timesPerWeek") {
    if (!isSaturday(localDate)) {
      return { currentStreak, longestStreak };
    }
    const count = countCompletionsInWeek(completedDates, localDate);
    if (count >= habit.schedule.n) {
      currentStreak += 1;
      return bumpLongest({ currentStreak, longestStreak });
    }
    return { currentStreak: 0, longestStreak };
  }

  if (
    isScheduledOn(habit.schedule, localDate) &&
    !completedDates.has(localDate)
  ) {
    return { currentStreak: 0, longestStreak };
  }

  return { currentStreak, longestStreak };
}

/** After a successful checkoff on a due day (today). */
export function applyHabitCheckoffStreak(
  habit: Pick<Habit, "schedule" | "paused" | "currentStreak" | "longestStreak">,
): StreakFields {
  if (habit.paused) {
    return {
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
    };
  }

  if (habit.schedule.type === "timesPerWeek") {
    return {
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
    };
  }

  const currentStreak = habit.currentStreak + 1;
  return bumpLongest({
    currentStreak,
    longestStreak: habit.longestStreak,
  });
}

/** Undo today's completion. */
export function applyHabitUndoStreak(
  habit: Pick<Habit, "schedule" | "paused" | "currentStreak" | "longestStreak">,
): StreakFields {
  if (habit.paused || habit.schedule.type === "timesPerWeek") {
    return {
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
    };
  }

  return {
    currentStreak: Math.max(0, habit.currentStreak - 1),
    longestStreak: habit.longestStreak,
  };
}

export type CatchUpResult = {
  currentStreak: number;
  longestStreak: number;
  lastResolvedLocalDate: string;
};

/**
 * Walk every missing local date from lastResolved+1 through yesterday.
 * New habits (null lastResolved) mark through yesterday without inventing
 * prehistoric misses — first boundary pass starts at yesterday only.
 */
export function catchUpHabitStreaks(
  habit: Pick<
    Habit,
    | "schedule"
    | "paused"
    | "currentStreak"
    | "longestStreak"
    | "lastResolvedLocalDate"
  >,
  completedDates: ReadonlySet<string>,
  today: string = toLocalDateString(),
): CatchUpResult {
  const yesterday = yesterdayLocalDate(today);
  let currentStreak = habit.currentStreak;
  let longestStreak = habit.longestStreak;

  const start = habit.lastResolvedLocalDate
    ? addLocalDays(habit.lastResolvedLocalDate, 1)
    : yesterday;

  if (compareLocalDates(start, yesterday) > 0) {
    return {
      currentStreak,
      longestStreak,
      lastResolvedLocalDate: habit.lastResolvedLocalDate ?? yesterday,
    };
  }

  for (const localDate of eachLocalDate(start, yesterday)) {
    const next = resolveHabitStreakOnDayBoundary(
      {
        schedule: habit.schedule,
        paused: habit.paused,
        currentStreak,
        longestStreak,
      },
      localDate,
      completedDates,
    );
    currentStreak = next.currentStreak;
    longestStreak = next.longestStreak;
  }

  return {
    currentStreak,
    longestStreak,
    lastResolvedLocalDate: yesterday,
  };
}

export { isHabitDueOn };
