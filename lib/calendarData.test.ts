import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCalendarDays, monthHabitCompletionRate } from "./calendarData";
import type { Habit, HabitCompletion } from "../types/habit";

function habit(partial: Partial<Habit> & Pick<Habit, "id" | "schedule">): Habit {
  return {
    title: partial.title ?? "Test",
    description: "",
    icon: "sparkles",
    dayPart: "morning",
    order: 0,
    paused: false,
    currentStreak: 0,
    longestStreak: 0,
    lastResolvedLocalDate: null,
    createdLocalDate: "2026-07-01",
    deletedAt: null,
    ...partial,
  };
}

describe("calendarData createdLocalDate", () => {
  it("hides days before the habit existed", () => {
    const h = habit({
      id: "a",
      schedule: { type: "everyDay" },
      createdLocalDate: "2026-07-14",
    });
    const days = buildCalendarDays({
      anchor: new Date(2026, 6, 1),
      today: "2026-07-14",
      habits: [h],
      goals: [],
      habitCompletions: [],
      goalCompletions: [],
    });
    const jul13 = days.find((d) => d.localDate === "2026-07-13");
    const jul14 = days.find((d) => d.localDate === "2026-07-14");
    assert.ok(jul13);
    assert.ok(jul14);
    assert.equal(jul13!.scheduledHabitCount, 0);
    assert.equal(jul14!.scheduledHabitCount, 1);
  });

  it("still shows historical misses when habit is paused now", () => {
    const h = habit({
      id: "a",
      schedule: { type: "everyDay" },
      createdLocalDate: "2026-07-10",
      paused: true,
    });
    const days = buildCalendarDays({
      anchor: new Date(2026, 6, 1),
      today: "2026-07-14",
      habits: [h],
      goals: [],
      habitCompletions: [],
      goalCompletions: [],
    });
    const jul12 = days.find((d) => d.localDate === "2026-07-12");
    const jul14 = days.find((d) => d.localDate === "2026-07-14");
    assert.ok(jul12);
    assert.ok(jul14);
    assert.equal(jul12!.scheduledHabitCount, 1);
    assert.equal(jul14!.scheduledHabitCount, 0);
  });

  it("caps variable-week empty days to the remaining quota", () => {
    const h = habit({
      id: "a",
      schedule: { type: "timesPerWeek", n: 3 },
      createdLocalDate: "2026-07-12",
    });
    // Week of Jul 12 2026 is Sun Jul 12 – Sat Jul 18. One completion Friday.
    const completions: HabitCompletion[] = [
      {
        id: "a_2026-07-17",
        habitId: "a",
        localDate: "2026-07-17",
        completedAt: null,
      },
    ];
    const rate = monthHabitCompletionRate({
      habits: [h],
      completions,
      monthStart: "2026-07-01",
      monthEnd: "2026-07-31",
      today: "2026-07-18",
    });
    // 2 empty slots + 1 completion = 3 scheduled when week is partial through Sat.
    assert.equal(rate.scheduled, 3);
    assert.equal(rate.completed, 1);
  });
});
