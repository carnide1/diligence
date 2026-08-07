import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildExerciseProgression,
  progressionDelta,
} from "./gymProgression";
import type { GymSession } from "@/types/gym";

function session(
  partial: Pick<
    GymSession,
    "id" | "localDate" | "status" | "actualExercises" | "plannedExercises"
  >,
): Pick<
  GymSession,
  "id" | "localDate" | "status" | "actualExercises" | "plannedExercises"
> {
  return partial;
}

describe("buildExerciseProgression", () => {
  it("groups accepted lifts oldest to newest and skips non-accepted", () => {
    const result = buildExerciseProgression([
      session({
        id: "s2",
        localDate: "2026-08-05",
        status: "accepted",
        plannedExercises: [],
        actualExercises: [
          {
            exerciseId: "bench",
            loadType: "external",
            sets: [
              { weight: 135, reps: 8 },
              { weight: 135, reps: 8 },
            ],
          },
        ],
      }),
      session({
        id: "s1",
        localDate: "2026-08-01",
        status: "accepted",
        plannedExercises: [],
        actualExercises: [
          {
            exerciseId: "bench",
            loadType: "external",
            sets: [{ weight: 125, reps: 8 }],
          },
          {
            exerciseId: "pullup",
            loadType: "bodyweight",
            sets: [{ weight: 0, reps: 10 }],
          },
        ],
      }),
      session({
        id: "s3",
        localDate: "2026-08-06",
        status: "planned",
        plannedExercises: [],
        actualExercises: null,
      }),
      session({
        id: "s4",
        localDate: "2026-08-07",
        status: "rejected",
        plannedExercises: [],
        actualExercises: [
          {
            exerciseId: "bench",
            loadType: "external",
            sets: [{ weight: 100, reps: 5 }],
          },
        ],
      }),
    ]);

    const byId = Object.fromEntries(result.map((r) => [r.exerciseId, r]));
    assert.equal(byId.bench?.entries.length, 2);
    assert.equal(byId.bench?.entries[0]?.localDate, "2026-08-01");
    assert.equal(byId.bench?.entries[0]?.volume, 1000);
    assert.equal(byId.bench?.entries[1]?.localDate, "2026-08-05");
    assert.equal(byId.bench?.entries[1]?.volume, 2160);
    assert.equal(byId.pullup?.entries.length, 1);
    assert.equal(byId.pullup?.entries[0]?.totalReps, 10);
  });

  it("falls back to planned lifts when accepted session has no actuals", () => {
    const result = buildExerciseProgression([
      session({
        id: "legacy",
        localDate: "2026-07-01",
        status: "accepted",
        actualExercises: null,
        plannedExercises: [
          {
            exerciseId: "row",
            loadType: "external",
            sets: [{ weight: 100, reps: 10 }],
          },
        ],
      }),
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0]?.exerciseId, "row");
    assert.equal(result[0]?.entries[0]?.volume, 1000);
  });
});

describe("progressionDelta", () => {
  it("reports volume and weight change between last two entries", () => {
    const progression = buildExerciseProgression([
      session({
        id: "a",
        localDate: "2026-08-01",
        status: "accepted",
        plannedExercises: [],
        actualExercises: [
          {
            exerciseId: "squat",
            loadType: "external",
            sets: [{ weight: 185, reps: 5 }],
          },
        ],
      }),
      session({
        id: "b",
        localDate: "2026-08-04",
        status: "accepted",
        plannedExercises: [],
        actualExercises: [
          {
            exerciseId: "squat",
            loadType: "external",
            sets: [{ weight: 195, reps: 5 }],
          },
        ],
      }),
    ]);
    const delta = progressionDelta(progression[0]!.entries);
    assert.deepEqual(delta, {
      volumeDelta: 50,
      weightDelta: 10,
      repsDelta: 0,
    });
  });
});
