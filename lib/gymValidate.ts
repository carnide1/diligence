import type {
  GymCardioBlock,
  GymExercise,
  GymLiftEntry,
  GymSet,
} from "@/types/gym";
import {
  CARDIO_MINUTES_MIN,
  WARMUP_MINUTES_MIN,
  WEEKLY_WORKOUT_TARGET,
  liftVolume,
} from "@/types/gym";

export type ValidateSessionInput = {
  exercises: GymLiftEntry[];
  warmup: GymCardioBlock;
  cardio: GymCardioBlock;
  /** Map of exerciseId → last accepted volume (null/undefined = first use). */
  lastVolumeByExerciseId: Record<string, number | null | undefined>;
};

export type ValidateSessionResult =
  | { ok: true }
  | { ok: false; reasons: string[] };

function isValidNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function validateSets(
  sets: GymSet[],
  loadType: GymLiftEntry["loadType"],
  reasons: string[],
): void {
  if (!sets.length) {
    reasons.push("Every lift needs at least one set.");
    return;
  }
  for (const set of sets) {
    if (!isValidNumber(set.reps) || set.reps <= 0) {
      reasons.push("Every set needs reps greater than zero.");
      return;
    }
    if (loadType === "external") {
      if (!isValidNumber(set.weight) || set.weight < 0) {
        reasons.push("Every set needs a non-negative weight in lb.");
        return;
      }
    }
  }
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
    if (lift.loadType !== "external" && lift.loadType !== "bodyweight") {
      reasons.push("Every lift needs a load type (lb or bodyweight).");
      break;
    }
    validateSets(lift.sets, lift.loadType, reasons);
    if (reasons.length) break;
  }

  if (!isValidNumber(warmup.minutes) || warmup.minutes < WARMUP_MINUTES_MIN) {
    reasons.push(`Warm-up must be at least ${WARMUP_MINUTES_MIN} minutes.`);
  }
  if (!isValidNumber(warmup.calories) || warmup.calories <= 0) {
    reasons.push("Warm-up needs a calorie count greater than zero.");
  }
  if (!warmup.machine?.trim()) {
    reasons.push("Warm-up needs a machine name.");
  }
  if (!isValidNumber(cardio.minutes) || cardio.minutes < CARDIO_MINUTES_MIN) {
    reasons.push(`Cardio must be at least ${CARDIO_MINUTES_MIN} minutes.`);
  }
  if (!isValidNumber(cardio.calories) || cardio.calories <= 0) {
    reasons.push("Cardio needs a calorie count greater than zero.");
  }
  if (!cardio.machine?.trim()) {
    reasons.push("Cardio needs a machine name.");
  }

  return reasons.length ? { ok: false, reasons } : { ok: true };
}

/** Hard gate — shape + volume progressive rule (external lifts only). */
export function validateSession(
  input: ValidateSessionInput,
): ValidateSessionResult {
  const shape = validateSessionShape(input);
  const reasons = shape.ok ? [] : [...shape.reasons];

  for (const lift of input.exercises) {
    if (lift.loadType === "bodyweight") continue;
    const last = input.lastVolumeByExerciseId[lift.exerciseId];
    if (last == null) continue; // first use
    const volume = liftVolume(lift);
    if (volume < last) {
      reasons.push(
        `Volume regression on exercise ${lift.exerciseId}: ${volume} < last ${last} (lb×reps).`,
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

export function buildLastVolumeMap(
  exercises: Pick<GymExercise, "id" | "lastVolume" | "lastWeight" | "lastSets" | "lastReps">[],
): Record<string, number | null> {
  const map: Record<string, number | null> = {};
  for (const e of exercises) {
    if (e.lastVolume != null) {
      map[e.id] = e.lastVolume;
    } else if (
      e.lastWeight != null &&
      e.lastSets != null &&
      e.lastReps != null
    ) {
      // Legacy docs without lastVolume
      map[e.id] = e.lastWeight * e.lastSets * e.lastReps;
    } else {
      map[e.id] = null;
    }
  }
  return map;
}

/** @deprecated Prefer buildLastVolumeMap — kept for any leftover imports. */
export function buildLastWeightMap(
  exercises: Pick<GymExercise, "id" | "lastWeight">[],
): Record<string, number | null> {
  const map: Record<string, number | null> = {};
  for (const e of exercises) {
    map[e.id] = e.lastWeight;
  }
  return map;
}

/** Filter exercises by name search and optional tag/location (case-insensitive). */
export function filterExercises<
  T extends { name: string; tags: string[]; location?: string },
>(
  exercises: T[],
  opts: { query?: string; tag?: string; location?: string },
): T[] {
  const q = opts.query?.trim().toLowerCase() ?? "";
  const tag = opts.tag?.trim().toLowerCase() ?? "";
  const location = opts.location?.trim().toLowerCase() ?? "";
  return exercises.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q)) return false;
    if (tag && !e.tags.some((t) => t.toLowerCase() === tag)) return false;
    if (location && (e.location ?? "").toLowerCase() !== location) return false;
    return true;
  });
}

export function collectUniqueTags(
  exercises: { tags: string[] }[],
): string[] {
  const set = new Set<string>();
  for (const e of exercises) {
    for (const t of e.tags) {
      const trimmed = t.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function collectUniqueLocations(
  exercises: { location?: string }[],
): string[] {
  const set = new Set<string>();
  for (const e of exercises) {
    const trimmed = e.location?.trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
