import type { Habit, HabitSchedule } from "../types/habit";
import { dayOfWeek } from "./dates";
import { isWithinActiveRange } from "./activeRange";

/** Normalize Firestore / raw schedule payloads. */
export function parseHabitSchedule(raw: unknown): HabitSchedule {
  if (!raw || typeof raw !== "object") return { type: "everyDay" };
  const s = raw as Record<string, unknown>;
  if (s.type === "weekdays" && Array.isArray(s.days)) {
    return {
      type: "weekdays",
      days: s.days.filter((d): d is number => typeof d === "number"),
    };
  }
  if (s.type === "timesPerWeek" && typeof s.n === "number") {
    return { type: "timesPerWeek", n: s.n };
  }
  return { type: "everyDay" };
}

/** Schedule obligation ignoring pause / N× quota (used for miss checks). */
export function isScheduledOn(
  schedule: HabitSchedule,
  localDate: string,
): boolean {
  switch (schedule.type) {
    case "everyDay":
      return true;
    case "weekdays":
      return schedule.days.includes(dayOfWeek(localDate));
    case "timesPerWeek":
      return true;
    default:
      return false;
  }
}

/**
 * Whether the habit should appear / be completable on localDate.
 * Paused → never due. Outside active date range → never due.
 * N×/week hidden once weekly quota is met.
 */
export function isHabitDueOn(
  habit: Pick<
    Habit,
    | "schedule"
    | "paused"
    | "activeStartLocalDate"
    | "activeEndLocalDate"
  >,
  localDate: string,
  completionsThisWeek: number,
): boolean {
  if (habit.paused) return false;
  if (
    !isWithinActiveRange(
      localDate,
      habit.activeStartLocalDate,
      habit.activeEndLocalDate,
    )
  ) {
    return false;
  }
  if (!isScheduledOn(habit.schedule, localDate)) return false;

  if (habit.schedule.type === "timesPerWeek") {
    return completionsThisWeek < habit.schedule.n;
  }

  return true;
}

export function describeSchedule(schedule: HabitSchedule): string {
  switch (schedule.type) {
    case "everyDay":
      return "Every day";
    case "weekdays": {
      const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const labels = [...schedule.days]
        .sort((a, b) => a - b)
        .map((d) => names[d] ?? "?");
      return labels.join(", ");
    }
    case "timesPerWeek":
      return `Variable · ${schedule.n} ${schedule.n === 1 ? "day" : "days"} / week`;
    default:
      return "";
  }
}
