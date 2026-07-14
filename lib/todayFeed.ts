import { DAY_PART_KEYS, DAY_PART_LABELS, type DayPartKey, type DayPeriod } from "../types/user";
import type { Habit } from "../types/habit";
import type { Goal } from "../types/goal";
import { isHabitDueOn } from "./habitSchedule";
import { formatPeriodRange } from "./dayPeriods";
import { toLocalDateString } from "./dates";

export type TodayItem =
  | {
      kind: "habit";
      id: string;
      sortKey: string;
      order: number;
      dayPart: DayPartKey;
      title: string;
      icon: string;
      done: boolean;
      leftover?: boolean;
      habit: Habit;
    }
  | {
      kind: "goal";
      id: string;
      sortKey: string;
      order: number;
      dayPart: DayPartKey;
      title: string;
      icon: string;
      done: boolean;
      leftover: boolean;
      goal: Goal;
    };

export type TodaySection = {
  dayPart: DayPartKey;
  label: string;
  rangeLabel: string;
  items: TodayItem[];
};

export function buildTodaySections(args: {
  habits: Habit[];
  goals: Goal[];
  todayCompletions: Record<string, boolean>;
  weekCompletionCounts: Record<string, number>;
  dayPeriods: DayPeriod[];
  isLeftover: (goal: Goal) => boolean;
  today?: string;
}): TodaySection[] {
  const today = args.today ?? toLocalDateString();
  const periods = args.dayPeriods;

  const dueHabits = args.habits.filter((habit) => {
    if (habit.paused) return false;
    const weekCount = args.weekCompletionCounts[habit.id] ?? 0;
    const due = isHabitDueOn(habit, today, weekCount);
    const doneToday = Boolean(args.todayCompletions[habit.id]);
    return due || doneToday;
  });

  const habitItems: TodayItem[] = dueHabits.map((habit) => ({
    kind: "habit" as const,
    id: `habit:${habit.id}`,
    sortKey: habit.id,
    order: habit.order,
    dayPart: habit.dayPart,
    title: habit.title,
    icon: habit.icon,
    done: Boolean(args.todayCompletions[habit.id]),
    habit,
  }));

  const goalItems: TodayItem[] = args.goals.map((goal) => ({
    kind: "goal" as const,
    id: `goal:${goal.id}`,
    sortKey: goal.id,
    order: goal.order,
    dayPart: goal.dayPart,
    title: goal.title,
    icon: goal.icon,
    done: goal.status === "completed",
    leftover: args.isLeftover(goal),
    goal,
  }));

  const all = [...habitItems, ...goalItems];

  return DAY_PART_KEYS.map((key) => {
    const period = periods.find((p) => p.key === key);
    const items = all
      .filter((item) => item.dayPart === key)
      .sort(
        (a, b) =>
          a.order - b.order ||
          a.kind.localeCompare(b.kind) ||
          a.title.localeCompare(b.title),
      );
    return {
      dayPart: key,
      label: period?.label ?? DAY_PART_LABELS[key],
      rangeLabel: period ? formatPeriodRange(period) : "",
      items,
    };
  }).filter((section) => section.items.length > 0);
}

export function computeTodayProgress(sections: TodaySection[]): {
  completed: number;
  total: number;
  habitsComplete: boolean;
  goalsComplete: boolean;
  celebrate: boolean;
  empty: boolean;
} {
  const items = sections.flatMap((s) => s.items);
  const habitItems = items.filter((i) => i.kind === "habit");
  const goalItems = items.filter((i) => i.kind === "goal");
  const total = items.length;
  const completed = items.filter((i) => i.done).length;

  const habitsComplete =
    habitItems.length === 0 || habitItems.every((i) => i.done);
  const goalsComplete =
    goalItems.length === 0 || goalItems.every((i) => i.done);
  const empty = total === 0;
  const celebrate = !empty && habitsComplete && goalsComplete;

  return {
    completed,
    total,
    habitsComplete,
    goalsComplete,
    celebrate,
    empty,
  };
}
