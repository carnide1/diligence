import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { DEFAULT_HABIT_ICON } from "./habitIcons";
import { toLocalDateString } from "./dates";
import type { DayPartKey } from "../types/user";
import type {
  Goal,
  GoalCompletion,
  GoalInput,
  GoalStatus,
  GoalStreakSnapshot,
} from "../types/goal";

function goalsCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "goals");
}

function completionsCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "goalCompletions");
}

function goalRef(uid: string, goalId: string) {
  return doc(getFirebaseDb(), "users", uid, "goals", goalId);
}

function completionRef(uid: string, goalId: string, localDate: string) {
  return doc(
    getFirebaseDb(),
    "users",
    uid,
    "goalCompletions",
    `${goalId}_${localDate}`,
  );
}

function mapGoal(id: string, data: Record<string, unknown>): Goal {
  const status = (
    data.status === "completed" || data.status === "deleted"
      ? data.status
      : "active"
  ) as GoalStatus;

  return {
    id,
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    icon: typeof data.icon === "string" ? data.icon : DEFAULT_HABIT_ICON,
    dayPart: (typeof data.dayPart === "string"
      ? data.dayPart
      : "morning") as DayPartKey,
    order: typeof data.order === "number" ? data.order : 0,
    createdLocalDate:
      typeof data.createdLocalDate === "string"
        ? data.createdLocalDate
        : toLocalDateString(),
    status,
    deletedAt:
      typeof data.deletedAt === "string"
        ? data.deletedAt
        : data.deletedAt == null
          ? null
          : String(data.deletedAt),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/** Active goals, plus goals completed today (for undo on Goals page). */
export async function listGoalsForTodayView(uid: string): Promise<Goal[]> {
  const today = toLocalDateString();
  const snap = await getDocs(goalsCol(uid));
  const all = snap.docs.map((d) =>
    mapGoal(d.id, d.data() as Record<string, unknown>),
  );

  const completions = await listAllGoalCompletions(uid);
  const completedTodayIds = new Set(
    completions.filter((c) => c.localDate === today).map((c) => c.goalId),
  );

  return all
    .filter(
      (g) =>
        g.status === "active" ||
        (g.status === "completed" && completedTodayIds.has(g.id)),
    )
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

/** All goals (including deleted) for streak reconstruction. */
export async function listGoalsForStreak(uid: string): Promise<Goal[]> {
  const snap = await getDocs(goalsCol(uid));
  return snap.docs.map((d) =>
    mapGoal(d.id, d.data() as Record<string, unknown>),
  );
}

export async function createGoal(
  uid: string,
  input: GoalInput,
): Promise<Goal> {
  const ref = doc(goalsCol(uid));
  const existing = await listGoalsForTodayView(uid);
  const order =
    input.order ??
    existing.reduce((max, g) => Math.max(max, g.order), -1) + 1;
  const today = toLocalDateString();

  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    icon: input.icon || DEFAULT_HABIT_ICON,
    dayPart: input.dayPart,
    order,
    createdLocalDate: today,
    status: "active" as const,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload);
  return mapGoal(ref.id, { ...payload });
}

export async function updateGoal(
  uid: string,
  goalId: string,
  patch: Partial<GoalInput> & { status?: GoalStatus; deletedAt?: string | null },
): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.title !== undefined) data.title = patch.title.trim();
  if (patch.description !== undefined)
    data.description = patch.description.trim();
  if (patch.icon !== undefined) data.icon = patch.icon;
  if (patch.dayPart !== undefined) data.dayPart = patch.dayPart;
  if (patch.order !== undefined) data.order = patch.order;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.deletedAt !== undefined) data.deletedAt = patch.deletedAt;
  await updateDoc(goalRef(uid, goalId), data);
}

export async function softDeleteGoal(uid: string, goalId: string): Promise<void> {
  await updateDoc(goalRef(uid, goalId), {
    status: "deleted",
    deletedAt: toLocalDateString(),
    updatedAt: serverTimestamp(),
  });
}

export async function listCompletionsForGoal(
  uid: string,
  goalId: string,
): Promise<GoalCompletion[]> {
  const snap = await getDocs(
    query(completionsCol(uid), where("goalId", "==", goalId)),
  );
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      goalId: String(data.goalId),
      localDate: String(data.localDate),
      completedAt: data.completedAt,
    };
  });
}

export async function listAllGoalCompletions(
  uid: string,
): Promise<GoalCompletion[]> {
  const snap = await getDocs(completionsCol(uid));
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      goalId: String(data.goalId),
      localDate: String(data.localDate),
      completedAt: data.completedAt,
    };
  });
}

export async function buildGoalStreakSnapshots(
  uid: string,
): Promise<GoalStreakSnapshot[]> {
  const [goals, completions] = await Promise.all([
    listGoalsForStreak(uid),
    listAllGoalCompletions(uid),
  ]);

  const byGoal = new Map<string, string[]>();
  for (const c of completions) {
    const list = byGoal.get(c.goalId) ?? [];
    list.push(c.localDate);
    byGoal.set(c.goalId, list);
  }

  return goals.map((g) => ({
    id: g.id,
    createdLocalDate: g.createdLocalDate,
    status: g.status,
    deletedAt: g.deletedAt,
    completionDates: byGoal.get(g.id) ?? [],
  }));
}

export async function completeGoalToday(
  uid: string,
  goalId: string,
  localDate: string = toLocalDateString(),
): Promise<void> {
  await setDoc(
    completionRef(uid, goalId, localDate),
    {
      goalId,
      localDate,
      completedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await updateDoc(goalRef(uid, goalId), {
    status: "completed",
    updatedAt: serverTimestamp(),
  });
}

export async function undoGoalCompletionToday(
  uid: string,
  goalId: string,
  localDate: string = toLocalDateString(),
): Promise<void> {
  await deleteDoc(completionRef(uid, goalId, localDate));
  await updateDoc(goalRef(uid, goalId), {
    status: "active",
    updatedAt: serverTimestamp(),
  });
}
