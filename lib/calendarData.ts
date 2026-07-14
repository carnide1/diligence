import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Habit, HabitCompletion } from "../types/habit";
import type { Goal, GoalCompletion } from "../types/goal";
import {
  compareLocalDates,
  eachLocalDate,
  toLocalDateString,
  weekBounds,
} from "./dates";
import { isHabitDueOn, isScheduledOn } from "./habitSchedule";
import { goalsDueOnDay } from "./goalStreaks";
import type { GoalStreakSnapshot } from "../types/goal";

export type DayTone =
  | "empty"
  | "upcoming"
  | "complete"
  | "miss"
  | "partial"
  | "today";

export type DayDetailItem = {
  kind: "habit" | "goal";
  id: string;
  title: string;
  icon: string;
  status: "completed" | "missed" | "upcoming" | "open";
  completedAtLabel: string | null;
};

export type CalendarDay = {
  localDate: string;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  tone: DayTone;
  items: DayDetailItem[];
  scheduledHabitCount: number;
  completedHabitCount: number;
  goalDueCount: number;
  goalDoneCount: number;
};

export type MonthSummary = {
  habitScheduled: number;
  habitCompleted: number;
  habitRate: number;
  goalClearDays: number;
  daysWithGoals: number;
  currentGoalStreak: number;
  longestGoalStreak: number;
  bestHabitStreak: number;
};

function timestampLabel(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return format((value as { toDate: () => Date }).toDate(), "h:mm a");
  }
  return null;
}

function completionsByHabitWeek(
  completions: HabitCompletion[],
  localDate: string,
  habitId: string,
): number {
  const { start, end } = weekBounds(localDate);
  let count = 0;
  for (const c of completions) {
    if (c.habitId !== habitId) continue;
    if (
      compareLocalDates(c.localDate, start) >= 0 &&
      compareLocalDates(c.localDate, end) <= 0
    ) {
      count += 1;
    }
  }
  return count;
}

function weekCountBeforeDay(
  completions: HabitCompletion[],
  localDate: string,
  habitId: string,
): number {
  const { start } = weekBounds(localDate);
  let count = 0;
  for (const c of completions) {
    if (c.habitId !== habitId) continue;
    if (
      compareLocalDates(c.localDate, start) >= 0 &&
      compareLocalDates(c.localDate, localDate) < 0
    ) {
      count += 1;
    }
  }
  return count;
}

export function monthLabel(anchor: Date): string {
  return format(anchor, "MMMM yyyy");
}

export function shiftMonth(anchor: Date, delta: number): Date {
  return addMonths(anchor, delta);
}

export function buildMonthGrid(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

function habitVisibleOnDay(args: {
  habit: Habit;
  localDate: string;
  isFuture: boolean;
  completion: HabitCompletion | undefined;
  allCompletions: HabitCompletion[];
}): boolean {
  const { habit, localDate, isFuture, completion, allCompletions } = args;

  if (habit.deletedAt && compareLocalDates(habit.deletedAt, localDate) <= 0) {
    return Boolean(completion);
  }

  if (completion) return true;

  if (habit.paused) return false;

  if (isFuture) {
    const weekCount = completionsByHabitWeek(
      allCompletions,
      localDate,
      habit.id,
    );
    return isHabitDueOn(habit, localDate, weekCount);
  }

  if (habit.schedule.type === "timesPerWeek") {
    const prior = weekCountBeforeDay(allCompletions, localDate, habit.id);
    return prior < habit.schedule.n;
  }

  return isScheduledOn(habit.schedule, localDate);
}

export function buildCalendarDays(args: {
  anchor: Date;
  today: string;
  habits: Habit[];
  goals: Goal[];
  habitCompletions: HabitCompletion[];
  goalCompletions: GoalCompletion[];
}): CalendarDay[] {
  const monthStart = toLocalDateString(startOfMonth(args.anchor));
  const monthEnd = toLocalDateString(endOfMonth(args.anchor));
  const grid = buildMonthGrid(args.anchor);

  const goalSnapshots: GoalStreakSnapshot[] = args.goals.map((g) => ({
    id: g.id,
    createdLocalDate: g.createdLocalDate,
    status: g.status,
    deletedAt: g.deletedAt,
    completionDates: args.goalCompletions
      .filter((c) => c.goalId === g.id)
      .map((c) => c.localDate),
  }));

  return grid.map((date) => {
    const localDate = toLocalDateString(date);
    const inMonth =
      compareLocalDates(localDate, monthStart) >= 0 &&
      compareLocalDates(localDate, monthEnd) <= 0;
    const isToday = localDate === args.today;
    const isFuture = compareLocalDates(localDate, args.today) > 0;

    const items: DayDetailItem[] = [];
    let scheduledHabitCount = 0;
    let completedHabitCount = 0;

    for (const habit of args.habits) {
      const completion = args.habitCompletions.find(
        (c) => c.habitId === habit.id && c.localDate === localDate,
      );
      const visible = habitVisibleOnDay({
        habit,
        localDate,
        isFuture,
        completion,
        allCompletions: args.habitCompletions,
      });
      if (!visible) continue;

      scheduledHabitCount += 1;
      if (completion) completedHabitCount += 1;

      items.push({
        kind: "habit",
        id: habit.id,
        title: habit.title,
        icon: habit.icon,
        status: completion
          ? "completed"
          : isFuture
            ? "upcoming"
            : isToday
              ? "open"
              : "missed",
        completedAtLabel: completion
          ? timestampLabel(completion.completedAt)
          : null,
      });
    }

    let goalDueCount = 0;
    let goalDoneCount = 0;

    if (!isFuture) {
      const dueGoals = goalsDueOnDay(goalSnapshots, localDate);
      for (const g of dueGoals) {
        goalDueCount += 1;
        const completion = args.goalCompletions.find(
          (c) => c.goalId === g.id && c.localDate === localDate,
        );
        if (completion) goalDoneCount += 1;
        const goal = args.goals.find((x) => x.id === g.id);
        items.push({
          kind: "goal",
          id: g.id,
          title: goal?.title ?? "Goal",
          icon: goal?.icon ?? "sparkles",
          status: completion ? "completed" : isToday ? "open" : "missed",
          completedAtLabel: completion
            ? timestampLabel(completion.completedAt)
            : null,
        });
      }
    }

    let tone: DayTone = "empty";
    if (inMonth) {
      if (isFuture) {
        tone = scheduledHabitCount > 0 ? "upcoming" : "empty";
      } else if (scheduledHabitCount === 0 && goalDueCount === 0) {
        tone = isToday ? "today" : "empty";
      } else {
        const habitsOk =
          scheduledHabitCount === 0 ||
          completedHabitCount === scheduledHabitCount;
        const goalsOk = goalDueCount === 0 || goalDoneCount === goalDueCount;
        if (habitsOk && goalsOk) tone = "complete";
        else if (completedHabitCount + goalDoneCount === 0) tone = "miss";
        else tone = "partial";
      }
    }

    return {
      localDate,
      inMonth,
      isToday,
      isFuture,
      tone,
      items,
      scheduledHabitCount,
      completedHabitCount,
      goalDueCount,
      goalDoneCount,
    };
  });
}

export function summarizeMonth(
  days: CalendarDay[],
  extras: {
    currentGoalStreak: number;
    longestGoalStreak: number;
    bestHabitStreak: number;
  },
): MonthSummary {
  const inMonth = days.filter((d) => d.inMonth && !d.isFuture);
  let habitScheduled = 0;
  let habitCompleted = 0;
  let daysWithGoals = 0;
  let goalClearDays = 0;

  for (const day of inMonth) {
    habitScheduled += day.scheduledHabitCount;
    habitCompleted += day.completedHabitCount;
    if (day.goalDueCount > 0) {
      daysWithGoals += 1;
      if (day.goalDoneCount === day.goalDueCount) goalClearDays += 1;
    }
  }

  return {
    habitScheduled,
    habitCompleted,
    habitRate:
      habitScheduled === 0
        ? 0
        : Math.round((habitCompleted / habitScheduled) * 100),
    goalClearDays,
    daysWithGoals,
    currentGoalStreak: extras.currentGoalStreak,
    longestGoalStreak: extras.longestGoalStreak,
    bestHabitStreak: extras.bestHabitStreak,
  };
}

export function monthHabitCompletionRate(args: {
  habits: Habit[];
  completions: HabitCompletion[];
  monthStart: string;
  monthEnd: string;
  today: string;
}): { scheduled: number; completed: number; rate: number } {
  const end =
    compareLocalDates(args.monthEnd, args.today) > 0
      ? args.today
      : args.monthEnd;
  if (compareLocalDates(args.monthStart, end) > 0) {
    return { scheduled: 0, completed: 0, rate: 0 };
  }

  let scheduled = 0;
  let completed = 0;

  for (const localDate of eachLocalDate(args.monthStart, end)) {
    for (const habit of args.habits) {
      if (habit.deletedAt && compareLocalDates(habit.deletedAt, localDate) <= 0) {
        continue;
      }
      const completion = args.completions.find(
        (c) => c.habitId === habit.id && c.localDate === localDate,
      );
      const visible = habitVisibleOnDay({
        habit,
        localDate,
        isFuture: false,
        completion,
        allCompletions: args.completions,
      });
      if (!visible) continue;
      scheduled += 1;
      if (completion) completed += 1;
    }
  }

  return {
    scheduled,
    completed,
    rate: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100),
  };
}
