import type {
  GymCardioBlock,
  GymExercise,
  GymLiftEntry,
} from "@/types/gym";
import {
  CARDIO_MINUTES_MIN,
  WARMUP_MINUTES_MIN,
  WEEKLY_WORKOUT_TARGET,
} from "@/types/gym";

export type ValidateSessionInput = {
  exercises: GymLiftEntry[];
  warmup: GymCardioBlock;
  cardio: GymCardioBlock;
  /** Map of exerciseId → last accepted weight (null/undefined = first use). */
  lastWeightByExerciseId: Record<string, number | null | undefined>;
};

export type ValidateSessionResult =
  | { ok: true }
  | { ok: false; reasons: string[] };

function isValidNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function validateSessionShape(args: {
  exercises: GymLiftEntry[];
  warmup: GymCardioBlock;
  cardio: GymCardioBlock;
}): ValidateSessionResult {
  const reasons: string[] = [];
  const { exercises, warmup, cardio } = args;

  if (exercises.length < WEEKLY_WORKOUT_TARGET) {
    reasons.push(
      `Need at least ${WEEKLY_WORKOUT_TARGET} resistance exercises (have ${exercises.length}).`,
    );
  }

  const ids = exercises.map((e) => e.exerciseId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    reasons.push("Each exercise may appear only once per session.");
  }

  for (const lift of exercises) {
    if (!lift.exerciseId) {
      reasons.push("Every lift needs an exercise.");
      break;
    }
    if (!isValidNumber(lift.weight) || lift.weight < 0) {
      reasons.push("Every lift needs a non-negative weight.");
      break;
    }
    if (!isValidNumber(lift.reps) || lift.reps <= 0) {
      reasons.push("Every lift needs reps greater than zero.");
      break;
    }
  }

  if (!isValidNumber(warmup.minutes) || warmup.minutes < WARMUP_MINUTES_MIN) {
    reasons.push(`Warm-up must be at least ${WARMUP_MINUTES_MIN} minutes.`);
  }
  if (!isValidNumber(warmup.calories) || warmup.calories <= 0) {
    reasons.push("Warm-up needs a calorie count greater than zero.");
  }
  if (!isValidNumber(cardio.minutes) || cardio.minutes < CARDIO_MINUTES_MIN) {
    reasons.push(`Cardio must be at least ${CARDIO_MINUTES_MIN} minutes.`);
  }
  if (!isValidNumber(cardio.calories) || cardio.calories <= 0) {
    reasons.push("Cardio needs a calorie count greater than zero.");
  }

  return reasons.length ? { ok: false, reasons } : { ok: true };
}

/** Hard gate for completing a session — shape + weight-only progressive rule. */
export function validateSession(
  input: ValidateSessionInput,
): ValidateSessionResult {
  const shape = validateSessionShape(input);
  const reasons = shape.ok ? [] : [...shape.reasons];

  for (const lift of input.exercises) {
    const last = input.lastWeightByExerciseId[lift.exerciseId];
    if (last == null) continue; // first use
    if (lift.weight < last) {
      reasons.push(
        `Weight regression on exercise ${lift.exerciseId}: ${lift.weight} < last ${last}.`,
      );
    }
  }

  return reasons.length ? { ok: false, reasons } : { ok: true };
}

/** Prefer human-readable names when available. */
export function validateSessionWithNames(
  input: ValidateSessionInput,
  exercisesById: Record<string, Pick<GymExercise, "name">>,
): ValidateSessionResult {
  const result = validateSession(input);
  if (result.ok) return result;
  return {
    ok: false,
    reasons: result.reasons.map((r) =>
      r.replace(/exercise ([a-zA-Z0-9_-]+)/g, (_, id: string) => {
        const name = exercisesById[id]?.name;
        return name ? `"${name}"` : `exercise ${id}`;
      }),
    ),
  };
}

export function buildLastWeightMap(
  exercises: Pick<GymExercise, "id" | "lastWeight">[],
): Record<string, number | null> {
  const map: Record<string, number | null> = {};
  for (const e of exercises) {
    map[e.id] = e.lastWeight;
  }
  return map;
}
