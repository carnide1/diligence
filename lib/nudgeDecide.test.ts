import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideNudge, type NudgeUserSnapshot } from "./nudgeDecide";

function base(over: Partial<NudgeUserSnapshot> = {}): NudgeUserSnapshot {
  return {
    uid: "u1",
    email: "a@b.com",
    displayName: "Joe",
    timezone: "America/New_York",
    prefs: { enabled: true, gymNags: true, habitsGoalsNags: true },
    localHour: 8,
    localDate: "2026-08-05",
    sentToday: 0,
    overdueHabitTitles: [],
    overdueGoalTitles: [],
    gym: {
      weekNeedsWork: true,
      weekAccepted: 1,
      weekRequired: 5,
      todayStatus: "none",
    },
    ...over,
  };
}

describe("decideNudge", () => {
  it("sends morning gym + overdue digest", () => {
    const email = decideNudge(
      base({
        overdueHabitTitles: ["Meditate"],
        overdueGoalTitles: ["Ship PR"],
      }),
    );
    assert.ok(email);
    assert.match(email!.subject, /Gym|Overdue/);
    assert.match(email!.text, /Meditate/);
    assert.match(email!.text, /no plan/);
  });

  it("skips outside nag hours and when capped", () => {
    assert.equal(decideNudge(base({ localHour: 22 })), null);
    assert.equal(decideNudge(base({ sentToday: 3 })), null);
  });

  it("sends during daytime even outside old 8/12/17 slots (Hobby daily cron)", () => {
    const email = decideNudge(base({ localHour: 10 }));
    assert.ok(email);
  });

  it("skips gym when week already met", () => {
    const email = decideNudge(
      base({
        gym: {
          weekNeedsWork: false,
          weekAccepted: 5,
          weekRequired: 5,
          todayStatus: "none",
        },
        overdueHabitTitles: [],
      }),
    );
    assert.equal(email, null);
  });

  it("nags incomplete planned session", () => {
    const email = decideNudge(
      base({
        localHour: 17,
        gym: {
          weekNeedsWork: true,
          weekAccepted: 2,
          weekRequired: 5,
          todayStatus: "planned",
        },
      }),
    );
    assert.ok(email);
    assert.ok(email!.reasons.includes("gym_incomplete"));
  });
});
