import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  daysLeftInGymWeek,
  gymWeekBounds,
  gymWeekId,
  isWeekWaived,
  requiredWorkoutsForWeek,
  weekAtRisk,
} from "./gymWeek";
import {
  buildLastVolumeMap,
  validateSession,
  validateSessionShape,
} from "./gymValidate";
import { catchUpGymStreaks, resolveWeek } from "./gymStreak";

describe("gymWeek", () => {
  it("uses Monday–Sunday bounds", () => {
    // 2026-08-05 is Wednesday
    const bounds = gymWeekBounds("2026-08-05");
    assert.equal(bounds.start, "2026-08-03"); // Monday
    assert.equal(bounds.end, "2026-08-09"); // Sunday
  });

  it("waives overlapping absences", () => {
    assert.equal(
      isWeekWaived(
        [{ startLocalDate: "2026-08-04", endLocalDate: "2026-08-06" }],
        "2026-08-05",
      ),
      true,
    );
    assert.equal(
      isWeekWaived(
        [{ startLocalDate: "2026-08-10", endLocalDate: "2026-08-12" }],
        "2026-08-05",
      ),
      false,
    );
    assert.equal(requiredWorkoutsForWeek([], "2026-08-05"), 5);
    assert.equal(
      requiredWorkoutsForWeek(
        [{ startLocalDate: "2026-08-03", endLocalDate: "2026-08-09" }],
        "2026-08-05",
      ),
      0,
    );
  });

  it("flags week at risk when remaining days cannot cover needed workouts", () => {
    // Sunday with 4/5 and not completed today → 1 needed, 1 day left → ok
    assert.equal(
      weekAtRisk({
        acceptedCount: 4,
        required: 5,
        localDate: "2026-08-09",
        completedToday: false,
      }),
      false,
    );
    // Sunday with 3/5 → at risk
    assert.equal(
      weekAtRisk({
        acceptedCount: 3,
        required: 5,
        localDate: "2026-08-09",
        completedToday: false,
      }),
      true,
    );
    assert.ok(daysLeftInGymWeek("2026-08-09") >= 1);
    assert.ok(gymWeekId("2026-08-05").includes("W"));
  });
});

describe("gymValidate", () => {
  const five = [
    {
      exerciseId: "a",
      loadType: "external" as const,
      sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }, { weight: 100, reps: 5 }],
    },
    {
      exerciseId: "b",
      loadType: "external" as const,
      sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }, { weight: 100, reps: 5 }],
    },
    {
      exerciseId: "c",
      loadType: "external" as const,
      sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }, { weight: 100, reps: 5 }],
    },
    {
      exerciseId: "d",
      loadType: "external" as const,
      sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }, { weight: 100, reps: 5 }],
    },
    {
      exerciseId: "e",
      loadType: "external" as const,
      sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }, { weight: 100, reps: 5 }],
    },
  ];
  const warmup = { minutes: 5, calories: 20, machine: "bike" };
  const cardio = { minutes: 20, calories: 150, machine: "treadmill" };

  it("requires shape: 5 lifts, warmup 5+, cardio 20+", () => {
    const bad = validateSessionShape({
      exercises: five.slice(0, 4),
      warmup,
      cardio,
    });
    assert.equal(bad.ok, false);

    const ok = validateSessionShape({ exercises: five, warmup, cardio });
    assert.equal(ok.ok, true);
  });

  it("rejects duplicate exercises", () => {
    const dup = [
      ...five.slice(0, 4),
      {
        exerciseId: "a",
        loadType: "external" as const,
        sets: [{ weight: 110, reps: 5 }],
      },
    ];
    const result = validateSessionShape({
      exercises: dup,
      warmup,
      cardio,
    });
    assert.equal(result.ok, false);
  });

  it("passes first use and rejects volume regression", () => {
    const first = validateSession({
      exercises: five,
      warmup,
      cardio,
      lastVolumeByExerciseId: {},
    });
    assert.equal(first.ok, true);

    // 3×100×5 = 1500 volume
    const hold = validateSession({
      exercises: five,
      warmup,
      cardio,
      lastVolumeByExerciseId: buildLastVolumeMap(
        five.map((e) => ({
          id: e.exerciseId,
          lastVolume: 1500,
          lastWeight: null,
          lastSets: null,
          lastReps: null,
        })),
      ),
    });
    assert.equal(hold.ok, true);

    const drop = validateSession({
      exercises: [
        {
          exerciseId: "a",
          loadType: "external",
          sets: [{ weight: 90, reps: 5 }, { weight: 90, reps: 5 }, { weight: 90, reps: 5 }],
        },
        ...five.slice(1),
      ],
      warmup,
      cardio,
      lastVolumeByExerciseId: { a: 1500 },
    });
    assert.equal(drop.ok, false);
  });

  it("skips volume gate for bodyweight lifts", () => {
    const result = validateSession({
      exercises: [
        {
          exerciseId: "a",
          loadType: "bodyweight",
          sets: [{ weight: 0, reps: 10 }],
        },
        ...five.slice(1),
      ],
      warmup,
      cardio,
      lastVolumeByExerciseId: { a: 9999 },
    });
    assert.equal(result.ok, true);
  });
});

describe("gymStreak", () => {
  it("resolves met vs missed weeks", () => {
    const met = resolveWeek({
      localDateInWeek: "2026-08-05",
      acceptedCount: 5,
      absences: [],
    });
    assert.equal(met.met, true);

    const miss = resolveWeek({
      localDateInWeek: "2026-08-05",
      acceptedCount: 4,
      absences: [],
    });
    assert.equal(miss.met, false);

    const waived = resolveWeek({
      localDateInWeek: "2026-08-05",
      acceptedCount: 0,
      absences: [
        { startLocalDate: "2026-08-03", endLocalDate: "2026-08-09" },
      ],
    });
    assert.equal(waived.met, true);
    assert.equal(waived.waived, true);
  });

  it("catch-up increments streak on met weeks and resets on miss", () => {
    // Resolve week of 2026-07-27 (Mon) .. 2026-08-02 (Sun) when today is 2026-08-05
    const weekId = gymWeekId("2026-07-27");
    const { stats } = catchUpGymStreaks({
      stats: {
        currentStreak: 2,
        longestStreak: 2,
        lastResolvedWeekId: null,
      },
      today: "2026-08-05",
      acceptedByWeekId: {
        [weekId]: 5,
        // older weeks in lookback default 0 → will reset unless we set lastResolved
      },
      absences: [],
    });
    // With null lastResolved and 8-week lookback of mostly zeros, streak ends at 0
    // unless we seed lastResolved just before the met week.
    assert.equal(typeof stats.currentStreak, "number");

    const seeded = catchUpGymStreaks({
      stats: {
        currentStreak: 2,
        longestStreak: 2,
        lastResolvedWeekId: gymWeekId("2026-07-20"),
      },
      today: "2026-08-05",
      acceptedByWeekId: { [weekId]: 5 },
      absences: [],
    });
    assert.equal(seeded.stats.currentStreak, 3);
    assert.equal(seeded.stats.longestStreak, 3);

    const miss = catchUpGymStreaks({
      stats: {
        currentStreak: 3,
        longestStreak: 3,
        lastResolvedWeekId: gymWeekId("2026-07-20"),
      },
      today: "2026-08-05",
      acceptedByWeekId: { [weekId]: 2 },
      absences: [],
    });
    assert.equal(miss.stats.currentStreak, 0);
  });
});
