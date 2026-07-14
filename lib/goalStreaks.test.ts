import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catchUpGoalStreaks,
  goalsDueOnDay,
  isLeftoverGoal,
  resolveGoalStreakOnDayBoundary,
} from "./goalStreaks";
import type { GoalStreakSnapshot } from "../types/goal";

function goal(
  partial: Partial<GoalStreakSnapshot> & Pick<GoalStreakSnapshot, "id">,
): GoalStreakSnapshot {
  return {
    createdLocalDate: "2026-07-10",
    status: "active",
    deletedAt: null,
    completionDates: [],
    ...partial,
  };
}

describe("goalStreaks", () => {
  it("empty day pauses streak", () => {
    const next = resolveGoalStreakOnDayBoundary(
      { currentStreak: 4, longestStreak: 6 },
      [],
      "2026-07-13",
    );
    assert.equal(next.currentStreak, 4);
    assert.equal(next.longestStreak, 6);
  });

  it("unfinished goals break streak", () => {
    const goals = [goal({ id: "a", createdLocalDate: "2026-07-12" })];
    const next = resolveGoalStreakOnDayBoundary(
      { currentStreak: 2, longestStreak: 5 },
      goals,
      "2026-07-13",
    );
    assert.equal(next.currentStreak, 0);
    assert.equal(next.longestStreak, 5);
  });

  it("all completed advances streak and longest", () => {
    const goals = [
      goal({
        id: "a",
        createdLocalDate: "2026-07-12",
        completionDates: ["2026-07-13"],
        status: "completed",
      }),
    ];
    const next = resolveGoalStreakOnDayBoundary(
      { currentStreak: 2, longestStreak: 2 },
      goals,
      "2026-07-13",
    );
    assert.equal(next.currentStreak, 3);
    assert.equal(next.longestStreak, 3);
  });

  it("rollover leftovers still count as due", () => {
    const goals = [
      goal({ id: "old", createdLocalDate: "2026-07-10", status: "active" }),
    ];
    const due = goalsDueOnDay(goals, "2026-07-13");
    assert.equal(due.length, 1);
    assert.equal(isLeftoverGoal("2026-07-10", "2026-07-13"), true);
  });

  it("already finished earlier goals are not due again", () => {
    const goals = [
      goal({
        id: "done",
        createdLocalDate: "2026-07-10",
        status: "completed",
        completionDates: ["2026-07-11"],
      }),
    ];
    assert.equal(goalsDueOnDay(goals, "2026-07-13").length, 0);
  });

  it("multi-day catch-up walks every missing day", () => {
    const goals = [
      goal({ id: "a", createdLocalDate: "2026-07-11", status: "active" }),
    ];
    const result = catchUpGoalStreaks(
      {
        currentStreak: 1,
        longestStreak: 3,
        lastResolvedLocalDate: "2026-07-10",
      },
      goals,
      "2026-07-14",
    );
    // Missed 11,12,13 with open goal → breaks
    assert.equal(result.currentStreak, 0);
    assert.equal(result.lastResolvedLocalDate, "2026-07-13");
  });
});
