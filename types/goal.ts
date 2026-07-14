import type { DayPartKey } from "./user";

export type GoalStatus = "active" | "completed" | "deleted";

export type Goal = {
  id: string;
  title: string;
  description: string;
  icon: string;
  dayPart: DayPartKey;
  order: number;
  createdLocalDate: string;
  status: GoalStatus;
  deletedAt: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type GoalCompletion = {
  id: string;
  goalId: string;
  localDate: string;
  completedAt: unknown;
};

export type GoalInput = {
  title: string;
  description: string;
  icon: string;
  dayPart: DayPartKey;
  order?: number;
};

/** Snapshot needed to resolve goal streak for past days. */
export type GoalStreakSnapshot = {
  id: string;
  createdLocalDate: string;
  status: GoalStatus;
  deletedAt: string | null;
  /** Completion dates for this goal (YYYY-MM-DD). */
  completionDates: string[];
};
