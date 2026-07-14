import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyHabitCheckoffStreak,
  catchUpHabitStreaks,
  resolveHabitStreakOnDayBoundary,
} from "./habitStreaks";
import { isHabitDueOn } from "./habitSchedule";
import type { Habit } from "../types/habit";

function base(
  overrides: Partial<Habit> & Pick<Habit, "schedule">,
): Pick<
  Habit,
  | "schedule"
  | "paused"
  | "currentStreak"
  | "longestStreak"
  | "lastResolvedLocalDate"
> {
  return {
    paused: false,
    currentStreak: 3,
    longestStreak: 5,
    lastResolvedLocalDate: "2026-07-10",
    ...overrides,
  };
}

describe("habitSchedule", () => {
  it("hides N× habits after weekly quota", () => {
    const habit = base({ schedule: { type: "timesPerWeek", n: 3 } });
    assert.equal(isHabitDueOn(habit, "2026-07-14", 2), true);
    assert.equal(isHabitDueOn(habit, "2026-07-14", 3), false);
  });

  it("pause means not due", () => {
    const habit = base({ schedule: { type: "everyDay" }, paused: true });
    assert.equal(isHabitDueOn(habit, "2026-07-14", 0), false);
  });
});

describe("habitStreaks", () => {
  it("daily miss breaks current streak", () => {
    const habit = base({ schedule: { type: "everyDay" } });
    const next = resolveHabitStreakOnDayBoundary(
      habit,
      "2026-07-13",
      new Set(),
    );
    assert.equal(next.currentStreak, 0);
    assert.equal(next.longestStreak, 5);
  });

  it("checkoff increments daily streak and longest", () => {
    const habit = base({
      schedule: { type: "everyDay" },
      currentStreak: 5,
      longestStreak: 5,
    });
    const next = applyHabitCheckoffStreak(habit);
    assert.equal(next.currentStreak, 6);
    assert.equal(next.longestStreak, 6);
  });

  it("N× week under-complete breaks at Saturday", () => {
    const habit = base({
      schedule: { type: "timesPerWeek", n: 3 },
      currentStreak: 2,
    });
    // 2026-07-11 is Saturday
    const next = resolveHabitStreakOnDayBoundary(
      habit,
      "2026-07-11",
      new Set(["2026-07-06", "2026-07-07"]),
    );
    assert.equal(next.currentStreak, 0);
  });

  it("N× week met advances at Saturday", () => {
    const habit = base({
      schedule: { type: "timesPerWeek", n: 3 },
      currentStreak: 2,
      longestStreak: 4,
    });
    const next = resolveHabitStreakOnDayBoundary(
      habit,
      "2026-07-11",
      new Set(["2026-07-06", "2026-07-08", "2026-07-10"]),
    );
    assert.equal(next.currentStreak, 3);
    assert.equal(next.longestStreak, 4);
  });

  it("pause freezes streak across catch-up", () => {
    const habit = base({
      schedule: { type: "everyDay" },
      paused: true,
      currentStreak: 4,
      lastResolvedLocalDate: "2026-07-10",
    });
    const result = catchUpHabitStreaks(
      habit,
      new Set(),
      "2026-07-14",
    );
    assert.equal(result.currentStreak, 4);
    assert.equal(result.lastResolvedLocalDate, "2026-07-13");
  });

  it("multi-day catch-up walks every missing day", () => {
    const habit = base({
      schedule: { type: "everyDay" },
      currentStreak: 2,
      lastResolvedLocalDate: "2026-07-10",
    });
    // Miss all days → streak 0 after walking 11,12,13
    const result = catchUpHabitStreaks(habit, new Set(), "2026-07-14");
    assert.equal(result.currentStreak, 0);
    assert.equal(result.lastResolvedLocalDate, "2026-07-13");
  });
});
