import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { toLocalDateString } from "@/lib/dates";
import { gymWeekId } from "@/lib/gymWeek";
import {
  buildLastWeightMap,
  validateSessionWithNames,
} from "@/lib/gymValidate";
import { catchUpGymStreaks } from "@/lib/gymStreak";
import type {
  GymAbsence,
  GymAbsenceInput,
  GymExercise,
  GymExerciseInput,
  GymSession,
  GymSessionCompleteInput,
  GymSessionPlanInput,
  GymStats,
  GymTemplate,
  GymTemplateInput,
} from "@/types/gym";

function exercisesCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "gymExercises");
}
function templatesCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "gymTemplates");
}
function sessionsCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "gymSessions");
}
function absencesCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "gymAbsences");
}
function userRef(uid: string) {
  return doc(getFirebaseDb(), "users", uid);
}

function mapExercise(id: string, data: Record<string, unknown>): GymExercise {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    tags: Array.isArray(data.tags)
      ? data.tags.filter((t): t is string => typeof t === "string")
      : [],
    lastWeight: typeof data.lastWeight === "number" ? data.lastWeight : null,
    lastReps: typeof data.lastReps === "number" ? data.lastReps : null,
    lastUsedLocalDate:
      typeof data.lastUsedLocalDate === "string"
        ? data.lastUsedLocalDate
        : null,
    timesUsed: typeof data.timesUsed === "number" ? data.timesUsed : 0,
    archived: Boolean(data.archived),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function mapTemplate(id: string, data: Record<string, unknown>): GymTemplate {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    exerciseIds: Array.isArray(data.exerciseIds)
      ? data.exerciseIds.filter((t): t is string => typeof t === "string")
      : [],
    warmupMinutesTarget:
      typeof data.warmupMinutesTarget === "number"
        ? data.warmupMinutesTarget
        : 5,
    cardioMinutesTarget:
      typeof data.cardioMinutesTarget === "number"
        ? data.cardioMinutesTarget
        : 20,
    cardioCaloriesTarget:
      typeof data.cardioCaloriesTarget === "number"
        ? data.cardioCaloriesTarget
        : 100,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function mapLift(raw: unknown): { exerciseId: string; weight: number; reps: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.exerciseId !== "string") return null;
  if (typeof o.weight !== "number" || typeof o.reps !== "number") return null;
  return { exerciseId: o.exerciseId, weight: o.weight, reps: o.reps };
}

function mapCardio(raw: unknown): { minutes: number; calories: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.minutes !== "number" || typeof o.calories !== "number")
    return null;
  return { minutes: o.minutes, calories: o.calories };
}

function mapSession(id: string, data: Record<string, unknown>): GymSession {
  const planned = Array.isArray(data.plannedExercises)
    ? data.plannedExercises.map(mapLift).filter(Boolean)
    : [];
  const actual = Array.isArray(data.actualExercises)
    ? data.actualExercises.map(mapLift).filter(Boolean)
    : null;
  return {
    id,
    localDate: typeof data.localDate === "string" ? data.localDate : "",
    status:
      data.status === "accepted" || data.status === "rejected"
        ? data.status
        : "planned",
    templateId: typeof data.templateId === "string" ? data.templateId : null,
    plannedExercises: planned as GymSession["plannedExercises"],
    actualExercises: actual as GymSession["actualExercises"],
    plannedWarmup: mapCardio(data.plannedWarmup) ?? {
      minutes: 5,
      calories: 20,
    },
    plannedCardio: mapCardio(data.plannedCardio) ?? {
      minutes: 20,
      calories: 100,
    },
    actualWarmup: mapCardio(data.actualWarmup),
    actualCardio: mapCardio(data.actualCardio),
    rejectReasons: Array.isArray(data.rejectReasons)
      ? data.rejectReasons.filter((r): r is string => typeof r === "string")
      : [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function mapAbsence(id: string, data: Record<string, unknown>): GymAbsence {
  return {
    id,
    description: typeof data.description === "string" ? data.description : "",
    startLocalDate:
      typeof data.startLocalDate === "string" ? data.startLocalDate : "",
    endLocalDate:
      typeof data.endLocalDate === "string" ? data.endLocalDate : "",
    createdAt: data.createdAt,
  };
}

export function mapGymStats(data: Record<string, unknown> | undefined): GymStats {
  const g =
    data && typeof data.gymStats === "object" && data.gymStats
      ? (data.gymStats as Record<string, unknown>)
      : {};
  return {
    currentStreak: typeof g.currentStreak === "number" ? g.currentStreak : 0,
    longestStreak: typeof g.longestStreak === "number" ? g.longestStreak : 0,
    lastResolvedWeekId:
      typeof g.lastResolvedWeekId === "string" ? g.lastResolvedWeekId : null,
  };
}

// ——— Exercises ———

export async function listExercises(
  uid: string,
  opts?: { includeArchived?: boolean },
): Promise<GymExercise[]> {
  const snap = await getDocs(exercisesCol(uid));
  let list = snap.docs.map((d) =>
    mapExercise(d.id, d.data() as Record<string, unknown>),
  );
  if (!opts?.includeArchived) list = list.filter((e) => !e.archived);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createExercise(
  uid: string,
  input: GymExerciseInput,
): Promise<GymExercise> {
  const ref = doc(exercisesCol(uid));
  const payload = {
    name: input.name.trim(),
    tags: input.tags.map((t) => t.trim()).filter(Boolean),
    lastWeight: null,
    lastReps: null,
    lastUsedLocalDate: null,
    timesUsed: 0,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
  return mapExercise(ref.id, payload);
}

export async function updateExercise(
  uid: string,
  id: string,
  input: GymExerciseInput,
): Promise<void> {
  await updateDoc(doc(exercisesCol(uid), id), {
    name: input.name.trim(),
    tags: input.tags.map((t) => t.trim()).filter(Boolean),
    updatedAt: serverTimestamp(),
  });
}

export async function archiveExercise(uid: string, id: string): Promise<void> {
  await updateDoc(doc(exercisesCol(uid), id), {
    archived: true,
    updatedAt: serverTimestamp(),
  });
}

// ——— Templates ———

export async function listTemplates(uid: string): Promise<GymTemplate[]> {
  const snap = await getDocs(templatesCol(uid));
  return snap.docs
    .map((d) => mapTemplate(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createTemplate(
  uid: string,
  input: GymTemplateInput,
): Promise<GymTemplate> {
  const ref = doc(templatesCol(uid));
  const payload = {
    name: input.name.trim(),
    exerciseIds: input.exerciseIds,
    warmupMinutesTarget: input.warmupMinutesTarget,
    cardioMinutesTarget: input.cardioMinutesTarget,
    cardioCaloriesTarget: input.cardioCaloriesTarget,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
  return mapTemplate(ref.id, payload);
}

export async function updateTemplate(
  uid: string,
  id: string,
  input: GymTemplateInput,
): Promise<void> {
  await updateDoc(doc(templatesCol(uid), id), {
    name: input.name.trim(),
    exerciseIds: input.exerciseIds,
    warmupMinutesTarget: input.warmupMinutesTarget,
    cardioMinutesTarget: input.cardioMinutesTarget,
    cardioCaloriesTarget: input.cardioCaloriesTarget,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTemplate(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(templatesCol(uid), id));
}

// ——— Sessions ———

export async function listSessions(
  uid: string,
  opts?: { from?: string; to?: string },
): Promise<GymSession[]> {
  const snap = await getDocs(sessionsCol(uid));
  let list = snap.docs.map((d) =>
    mapSession(d.id, d.data() as Record<string, unknown>),
  );
  if (opts?.from) list = list.filter((s) => s.localDate >= opts.from!);
  if (opts?.to) list = list.filter((s) => s.localDate <= opts.to!);
  return list.sort((a, b) => b.localDate.localeCompare(a.localDate));
}

export async function getSessionForDate(
  uid: string,
  localDate: string,
): Promise<GymSession | null> {
  const snap = await getDocs(
    query(sessionsCol(uid), where("localDate", "==", localDate)),
  );
  if (snap.empty) return null;
  // Prefer accepted, then planned, then rejected
  const sessions = snap.docs.map((d) =>
    mapSession(d.id, d.data() as Record<string, unknown>),
  );
  return (
    sessions.find((s) => s.status === "accepted") ??
    sessions.find((s) => s.status === "planned") ??
    sessions[0] ??
    null
  );
}

export async function saveDailyPlan(
  uid: string,
  input: GymSessionPlanInput,
): Promise<GymSession> {
  const existing = await getSessionForDate(uid, input.localDate);
  if (existing?.status === "accepted") {
    throw new Error("Today already has an accepted workout.");
  }

  const ref = existing
    ? doc(sessionsCol(uid), existing.id)
    : doc(sessionsCol(uid));

  const payload = {
    localDate: input.localDate,
    status: "planned" as const,
    templateId: input.templateId ?? null,
    plannedExercises: input.exercises,
    actualExercises: null,
    plannedWarmup: input.warmup,
    plannedCardio: input.cardio,
    actualWarmup: null,
    actualCardio: null,
    rejectReasons: [],
    updatedAt: serverTimestamp(),
    ...(existing ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(ref, payload, { merge: true });
  return mapSession(ref.id, payload);
}

export async function completeDailySession(
  uid: string,
  sessionId: string,
  input: GymSessionCompleteInput,
): Promise<GymSession> {
  const ref = doc(sessionsCol(uid), sessionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Session not found");
  const current = mapSession(sessionId, snap.data() as Record<string, unknown>);
  if (current.status === "accepted") {
    throw new Error("Session already accepted.");
  }

  const exercises = await listExercises(uid, { includeArchived: true });
  const byId = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const lastWeightByExerciseId = buildLastWeightMap(exercises);

  const validation = validateSessionWithNames(
    {
      exercises: input.exercises,
      warmup: input.warmup,
      cardio: input.cardio,
      lastWeightByExerciseId,
    },
    byId,
  );

  if (!validation.ok) {
    await updateDoc(ref, {
      status: "rejected",
      actualExercises: input.exercises,
      actualWarmup: input.warmup,
      actualCardio: input.cardio,
      rejectReasons: validation.reasons,
      updatedAt: serverTimestamp(),
    });
    return mapSession(sessionId, {
      ...snap.data(),
      status: "rejected",
      actualExercises: input.exercises,
      actualWarmup: input.warmup,
      actualCardio: input.cardio,
      rejectReasons: validation.reasons,
    } as Record<string, unknown>);
  }

  const batch = writeBatch(getFirebaseDb());
  batch.update(ref, {
    status: "accepted",
    actualExercises: input.exercises,
    actualWarmup: input.warmup,
    actualCardio: input.cardio,
    rejectReasons: [],
    updatedAt: serverTimestamp(),
  });

  for (const lift of input.exercises) {
    const ex = byId[lift.exerciseId];
    if (!ex) continue;
    batch.update(doc(exercisesCol(uid), lift.exerciseId), {
      lastWeight: lift.weight,
      lastReps: lift.reps,
      lastUsedLocalDate: current.localDate,
      timesUsed: (ex.timesUsed ?? 0) + 1,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return mapSession(sessionId, {
    ...snap.data(),
    status: "accepted",
    actualExercises: input.exercises,
    actualWarmup: input.warmup,
    actualCardio: input.cardio,
    rejectReasons: [],
  } as Record<string, unknown>);
}

// ——— Absences ———

export async function listAbsences(uid: string): Promise<GymAbsence[]> {
  const snap = await getDocs(absencesCol(uid));
  return snap.docs
    .map((d) => mapAbsence(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => b.startLocalDate.localeCompare(a.startLocalDate));
}

export async function createAbsence(
  uid: string,
  input: GymAbsenceInput,
): Promise<GymAbsence> {
  if (input.endLocalDate < input.startLocalDate) {
    throw new Error("End date must be on or after start date.");
  }
  const ref = doc(absencesCol(uid));
  const payload = {
    description: input.description.trim(),
    startLocalDate: input.startLocalDate,
    endLocalDate: input.endLocalDate,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
  return mapAbsence(ref.id, payload);
}

// ——— Stats / streak catch-up ———

export async function loadGymStats(uid: string): Promise<GymStats> {
  const snap = await getDoc(userRef(uid));
  return mapGymStats(snap.data() as Record<string, unknown> | undefined);
}

export async function refreshGymStreaks(
  uid: string,
  today = toLocalDateString(),
): Promise<GymStats> {
  const [stats, sessions, absences] = await Promise.all([
    loadGymStats(uid),
    listSessions(uid),
    listAbsences(uid),
  ]);

  const acceptedByWeekId: Record<string, number> = {};
  for (const s of sessions) {
    if (s.status !== "accepted") continue;
    const id = gymWeekId(s.localDate);
    acceptedByWeekId[id] = (acceptedByWeekId[id] ?? 0) + 1;
  }

  const { stats: next } = catchUpGymStreaks({
    stats,
    today,
    acceptedByWeekId,
    absences,
  });

  if (
    next.currentStreak !== stats.currentStreak ||
    next.longestStreak !== stats.longestStreak ||
    next.lastResolvedWeekId !== stats.lastResolvedWeekId
  ) {
    await updateDoc(userRef(uid), {
      gymStats: next,
    });
  }

  return next;
}
