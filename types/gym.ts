export type GymLoadType = "external" | "bodyweight";

export type GymSet = {
  /** Pounds when loadType is external; ignored for pure bodyweight. */
  weight: number;
  reps: number;
};

export type GymExercise = {
  id: string;
  name: string;
  /** Free-text tags (muscle group, split, etc.). */
  tags: string[];
  /** Free-text gym / place; progression is per exercise doc. */
  location: string;
  /** Default load type when logging this exercise. */
  loadType: GymLoadType;
  /** Legacy / display: heaviest set weight from last accept. */
  lastWeight: number | null;
  lastSets: number | null;
  lastReps: number | null;
  /** Σ(weight × reps) from last accepted external session. */
  lastVolume: number | null;
  /** Full set list from last accept (for autofill). */
  lastSetPerformance: GymSet[] | null;
  lastUsedLocalDate: string | null;
  timesUsed: number;
  archived: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type GymExerciseInput = {
  name: string;
  tags: string[];
  location: string;
  loadType?: GymLoadType;
};

export type GymTemplate = {
  id: string;
  name: string;
  exerciseIds: string[];
  warmupMinutesTarget: number;
  cardioMinutesTarget: number;
  cardioCaloriesTarget: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type GymTemplateInput = {
  name: string;
  exerciseIds: string[];
  warmupMinutesTarget: number;
  cardioMinutesTarget: number;
  cardioCaloriesTarget: number;
};

export type GymLiftEntry = {
  exerciseId: string;
  loadType: GymLoadType;
  sets: GymSet[];
};

export type GymCardioBlock = {
  minutes: number;
  calories: number;
  /** Cardio machine name (e.g. treadmill, bike). */
  machine: string;
};

export type GymSessionStatus = "planned" | "accepted" | "rejected";

export type GymSession = {
  id: string;
  localDate: string;
  status: GymSessionStatus;
  templateId: string | null;
  plannedExercises: GymLiftEntry[];
  actualExercises: GymLiftEntry[] | null;
  plannedWarmup: GymCardioBlock;
  plannedCardio: GymCardioBlock;
  actualWarmup: GymCardioBlock | null;
  actualCardio: GymCardioBlock | null;
  rejectReasons: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type GymSessionPlanInput = {
  localDate: string;
  templateId?: string | null;
  exercises: GymLiftEntry[];
  warmup: GymCardioBlock;
  cardio: GymCardioBlock;
};

export type GymSessionCompleteInput = {
  exercises: GymLiftEntry[];
  warmup: GymCardioBlock;
  cardio: GymCardioBlock;
};

export type GymAbsence = {
  id: string;
  description: string;
  startLocalDate: string;
  endLocalDate: string;
  createdAt?: unknown;
};

export type GymAbsenceInput = {
  description: string;
  startLocalDate: string;
  endLocalDate: string;
};

export type GymStats = {
  currentStreak: number;
  longestStreak: number;
  /** ISO week id like 2026-W31 (Monday-start week containing last resolved Sunday). */
  lastResolvedWeekId: string | null;
};

export type GymMotivation = {
  penaltySum: string;
  beneficiaryName: string;
  successDinnerLimit: string;
};

export const WEEKLY_WORKOUT_TARGET = 5;
export const WARMUP_MINUTES_MIN = 5;
export const CARDIO_MINUTES_MIN = 20;

/** Volume in lb·reps for progressive gate (bodyweight → 0). */
export function liftVolume(lift: Pick<GymLiftEntry, "loadType" | "sets">): number {
  if (lift.loadType === "bodyweight") return 0;
  return lift.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function heaviestSetWeight(sets: GymSet[]): number | null {
  if (!sets.length) return null;
  return sets.reduce((max, s) => Math.max(max, s.weight), 0);
}
