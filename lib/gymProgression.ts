import {
  heaviestSetWeight,
  liftVolume,
  type GymLiftEntry,
  type GymLoadType,
  type GymSession,
  type GymSet,
} from "@/types/gym";

export type ExerciseProgressEntry = {
  sessionId: string;
  localDate: string;
  loadType: GymLoadType;
  sets: GymSet[];
  /** Σ(weight × reps); 0 for bodyweight. */
  volume: number;
  heaviestWeight: number | null;
  totalReps: number;
};

export type ExerciseProgress = {
  exerciseId: string;
  entries: ExerciseProgressEntry[];
};

function entryFromLift(
  session: Pick<GymSession, "id" | "localDate">,
  lift: GymLiftEntry,
): ExerciseProgressEntry {
  return {
    sessionId: session.id,
    localDate: session.localDate,
    loadType: lift.loadType,
    sets: lift.sets,
    volume: liftVolume(lift),
    heaviestWeight:
      lift.loadType === "bodyweight" ? null : heaviestSetWeight(lift.sets),
    totalReps: lift.sets.reduce((sum, s) => sum + s.reps, 0),
  };
}

function liftsForAccepted(
  session: Pick<GymSession, "actualExercises" | "plannedExercises">,
): GymLiftEntry[] {
  if (session.actualExercises?.length) return session.actualExercises;
  return session.plannedExercises ?? [];
}

/**
 * Build per-exercise lift history from accepted sessions (oldest → newest).
 */
export function buildExerciseProgression(
  sessions: Pick<
    GymSession,
    "id" | "localDate" | "status" | "actualExercises" | "plannedExercises"
  >[],
): ExerciseProgress[] {
  const byId = new Map<string, ExerciseProgressEntry[]>();

  const accepted = sessions
    .filter((s) => s.status === "accepted")
    .slice()
    .sort((a, b) => a.localDate.localeCompare(b.localDate));

  for (const session of accepted) {
    for (const lift of liftsForAccepted(session)) {
      const list = byId.get(lift.exerciseId) ?? [];
      list.push(entryFromLift(session, lift));
      byId.set(lift.exerciseId, list);
    }
  }

  return [...byId.entries()].map(([exerciseId, entries]) => ({
    exerciseId,
    entries,
  }));
}

/** Newest entry volume/weight vs previous accepted entry (for growth chips). */
export function progressionDelta(entries: ExerciseProgressEntry[]): {
  volumeDelta: number | null;
  weightDelta: number | null;
  repsDelta: number | null;
} | null {
  if (entries.length < 2) return null;
  const prev = entries[entries.length - 2]!;
  const latest = entries[entries.length - 1]!;
  if (latest.loadType === "bodyweight" || prev.loadType === "bodyweight") {
    return {
      volumeDelta: null,
      weightDelta: null,
      repsDelta: latest.totalReps - prev.totalReps,
    };
  }
  return {
    volumeDelta: latest.volume - prev.volume,
    weightDelta:
      latest.heaviestWeight != null && prev.heaviestWeight != null
        ? latest.heaviestWeight - prev.heaviestWeight
        : null,
    repsDelta: latest.totalReps - prev.totalReps,
  };
}
