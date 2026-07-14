import type { GoalStreakSnapshot } from "../types/goal";
import {
  addLocalDays,
  compareLocalDates,
  eachLocalDate,
  toLocalDateString,
  yesterdayLocalDate,
} from "./dates";

export type GoalStreakFields = {
  currentStreak: number;
  longestStreak: number;
};

function bumpLongest(fields: GoalStreakFields): GoalStreakFields {
  return {
    currentStreak: fields.currentStreak,
    longestStreak: Math.max(fields.longestStreak, fields.currentStreak),
  };
}

/**
 * Goals that were still open obligations on localDate (including leftovers).
 * Already finished on an earlier day do not count.
 */
export function goalsDueOnDay(
  goals: GoalStreakSnapshot[],
  localDate: string,
): GoalStreakSnapshot[] {
  return goals.filter((goal) => {
    if (compareLocalDates(goal.createdLocalDate, localDate) > 0) return false;
    if (goal.deletedAt && compareLocalDates(goal.deletedAt, localDate) <= 0) {
      return false;
    }

    const earlierCompletion = goal.completionDates.some(
      (d) => compareLocalDates(d, localDate) < 0,
    );
    if (earlierCompletion) return false;

    return true;
  });
}

export function resolveGoalStreakOnDayBoundary(
  fields: GoalStreakFields,
  goals: GoalStreakSnapshot[],
  localDate: string,
): GoalStreakFields {
  const due = goalsDueOnDay(goals, localDate);

  if (due.length === 0) {
    // Empty day pauses streak
    return fields;
  }

  const allDone = due.every((goal) =>
    goal.completionDates.includes(localDate),
  );

  if (allDone) {
    const currentStreak = fields.currentStreak + 1;
    return bumpLongest({
      currentStreak,
      longestStreak: fields.longestStreak,
    });
  }

  return { currentStreak: 0, longestStreak: fields.longestStreak };
}

export type GoalCatchUpResult = GoalStreakFields & {
  lastResolvedLocalDate: string;
};

/**
 * Walk every missing local date from lastResolved+1 through yesterday.
 * Null lastResolved → resolve yesterday only (no prehistoric breaks).
 */
export function catchUpGoalStreaks(
  fields: GoalStreakFields & { lastResolvedLocalDate: string | null },
  goals: GoalStreakSnapshot[],
  today: string = toLocalDateString(),
): GoalCatchUpResult {
  const yesterday = yesterdayLocalDate(today);
  let currentStreak = fields.currentStreak;
  let longestStreak = fields.longestStreak;

  const start = fields.lastResolvedLocalDate
    ? addLocalDays(fields.lastResolvedLocalDate, 1)
    : yesterday;

  if (compareLocalDates(start, yesterday) > 0) {
    return {
      currentStreak,
      longestStreak,
      lastResolvedLocalDate: fields.lastResolvedLocalDate ?? yesterday,
    };
  }

  for (const localDate of eachLocalDate(start, yesterday)) {
    const next = resolveGoalStreakOnDayBoundary(
      { currentStreak, longestStreak },
      goals,
      localDate,
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

export function isLeftoverGoal(
  createdLocalDate: string,
  today: string = toLocalDateString(),
): boolean {
  return compareLocalDates(createdLocalDate, today) < 0;
}
