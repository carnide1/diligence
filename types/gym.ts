export type GymExercise = {
  id: string;
  name: string;
  /** Free-text tags (muscle group, split, etc.). */
  tags: string[];
  lastWeight: number | null;
  lastReps: number | null;
  lastUsedLocalDate: string | null;
  timesUsed: number;
  archived: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type GymExerciseInput = {
  name: string;
  tags: string[];
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
  weight: number;
  reps: number;
};

export type GymCardioBlock = {
  minutes: number;
  calories: number;
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
