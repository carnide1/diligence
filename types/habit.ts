import type { DayPartKey } from "./user";

export type HabitSchedule =
  | { type: "everyDay" }
  | { type: "weekdays"; days: number[] }
  | { type: "timesPerWeek"; n: number };

export type Habit = {
  id: string;
  title: string;
  description: string;
  icon: string;
  dayPart: DayPartKey;
  schedule: HabitSchedule;
  order: number;
  paused: boolean;
  currentStreak: number;
  longestStreak: number;
  /** YYYY-MM-DD; last day-boundary date fully resolved for this habit. */
  lastResolvedLocalDate: string | null;
  deletedAt: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type HabitCompletion = {
  id: string;
  habitId: string;
  localDate: string;
  completedAt: unknown;
};

export type HabitInput = {
  title: string;
  description: string;
  icon: string;
  dayPart: DayPartKey;
  schedule: HabitSchedule;
  order?: number;
  paused?: boolean;
};
