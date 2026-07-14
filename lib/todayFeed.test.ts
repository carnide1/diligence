import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeTodayProgress, type TodaySection } from "./todayFeed";

function section(items: TodaySection["items"]): TodaySection {
  return {
    dayPart: "morning",
    label: "Morning",
    rangeLabel: "09:00–12:00",
    items,
  };
}

describe("today progress", () => {
  it("celebrates when both sides clear with items", () => {
    const progress = computeTodayProgress([
      section([
        {
          kind: "habit",
          id: "habit:1",
          sortKey: "1",
          order: 0,
          dayPart: "morning",
          title: "Water",
          icon: "droplets",
          done: true,
          habit: {} as never,
        },
        {
          kind: "goal",
          id: "goal:1",
          sortKey: "1",
          order: 1,
          dayPart: "morning",
          title: "Ship",
          icon: "sparkles",
          done: true,
          leftover: false,
          goal: {} as never,
        },
      ]),
    ]);
    assert.equal(progress.celebrate, true);
    assert.equal(progress.empty, false);
  });

  it("celebrates habits-only when all habits done", () => {
    const progress = computeTodayProgress([
      section([
        {
          kind: "habit",
          id: "habit:1",
          sortKey: "1",
          order: 0,
          dayPart: "morning",
          title: "Water",
          icon: "droplets",
          done: true,
          habit: {} as never,
        },
      ]),
    ]);
    assert.equal(progress.goalsComplete, true);
    assert.equal(progress.celebrate, true);
  });

  it("does not celebrate empty day", () => {
    const progress = computeTodayProgress([]);
    assert.equal(progress.empty, true);
    assert.equal(progress.celebrate, false);
  });

  it("blocks celebration if goals remain", () => {
    const progress = computeTodayProgress([
      section([
        {
          kind: "habit",
          id: "habit:1",
          sortKey: "1",
          order: 0,
          dayPart: "morning",
          title: "Water",
          icon: "droplets",
          done: true,
          habit: {} as never,
        },
        {
          kind: "goal",
          id: "goal:1",
          sortKey: "1",
          order: 1,
          dayPart: "morning",
          title: "Ship",
          icon: "sparkles",
          done: false,
          leftover: false,
          goal: {} as never,
        },
      ]),
    ]);
    assert.equal(progress.celebrate, false);
  });
});
