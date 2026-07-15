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
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { DEFAULT_HABIT_ICON } from "./habitIcons";
import { toLocalDateString, yesterdayLocalDate } from "./dates";
import type { Habit, HabitCompletion, HabitInput } from "../types/habit";
import type { DayPartKey } from "../types/user";
import type { HabitSchedule } from "../types/habit";

function habitsCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "habits");
}

function completionsCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "habitCompletions");
}

function habitRef(uid: string, habitId: string) {
  return doc(getFirebaseDb(), "users", uid, "habits", habitId);
}

function completionRef(uid: string, habitId: string, localDate: string) {
  return doc(
    getFirebaseDb(),
    "users",
    uid,
    "habitCompletions",
    `${habitId}_${localDate}`,
  );
}

function parseSchedule(raw: unknown): HabitSchedule {
  if (!raw || typeof raw !== "object") return { type: "everyDay" };
  const s = raw as Record<string, unknown>;
  if (s.type === "weekdays" && Array.isArray(s.days)) {
    return {
      type: "weekdays",
      days: s.days.filter((d): d is number => typeof d === "number"),
    };
  }
  if (s.type === "timesPerWeek" && typeof s.n === "number") {
    return { type: "timesPerWeek", n: s.n };
  }
  return { type: "everyDay" };
}

function mapHabit(id: string, data: Record<string, unknown>): Habit {
  const deletedAt =
    data.deletedAt == null
      ? null
      : typeof data.deletedAt === "string"
        ? data.deletedAt
        : data.deletedAt &&
            typeof data.deletedAt === "object" &&
            "toDate" in data.deletedAt
          ? toLocalDateString((data.deletedAt as Timestamp).toDate())
          : String(data.deletedAt);

  let createdLocalDate =
    typeof data.createdLocalDate === "string" ? data.createdLocalDate : null;
  if (!createdLocalDate && data.createdAt) {
    if (
      typeof data.createdAt === "object" &&
      "toDate" in data.createdAt &&
      typeof (data.createdAt as Timestamp).toDate === "function"
    ) {
      createdLocalDate = toLocalDateString(
        (data.createdAt as Timestamp).toDate(),
      );
    }
  }
  if (!createdLocalDate) {
    // Legacy docs without timestamps: keep historic calendar visibility.
    createdLocalDate = "1970-01-01";
  }

  return {
    id,
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    icon: typeof data.icon === "string" ? data.icon : DEFAULT_HABIT_ICON,
    dayPart: (typeof data.dayPart === "string"
      ? data.dayPart
      : "morning") as DayPartKey,
    schedule: parseSchedule(data.schedule),
    order: typeof data.order === "number" ? data.order : 0,
    paused: Boolean(data.paused),
    currentStreak:
      typeof data.currentStreak === "number" ? data.currentStreak : 0,
    longestStreak:
      typeof data.longestStreak === "number" ? data.longestStreak : 0,
    lastResolvedLocalDate:
      typeof data.lastResolvedLocalDate === "string"
        ? data.lastResolvedLocalDate
        : null,
    createdLocalDate,
    deletedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listHabits(
  uid: string,
  opts?: { includeDeleted?: boolean },
): Promise<Habit[]> {
  const snap = await getDocs(habitsCol(uid));
  const habits = snap.docs
    .map((d) => mapHabit(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  if (opts?.includeDeleted) return habits;
  return habits.filter((h) => !h.deletedAt);
}

export async function createHabit(
  uid: string,
  input: HabitInput,
): Promise<Habit> {
  const ref = doc(habitsCol(uid));
  const order =
    input.order ??
    (await listHabits(uid)).reduce((max, h) => Math.max(max, h.order), -1) + 1;

  const yesterday = yesterdayLocalDate();
  const today = toLocalDateString();
  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    icon: input.icon || DEFAULT_HABIT_ICON,
    dayPart: input.dayPart,
    schedule: input.schedule,
    order,
    paused: input.paused ?? false,
    currentStreak: 0,
    longestStreak: 0,
    // Caught up through yesterday so today's miss is resolved tomorrow.
    lastResolvedLocalDate: yesterday,
    createdLocalDate: today,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload);
  return mapHabit(ref.id, { ...payload, deletedAt: null });
}

export async function updateHabit(
  uid: string,
  habitId: string,
  patch: Partial<HabitInput> & {
    paused?: boolean;
    currentStreak?: number;
    longestStreak?: number;
    lastResolvedLocalDate?: string | null;
    order?: number;
  },
): Promise<void> {
  const data: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (patch.title !== undefined) data.title = patch.title.trim();
  if (patch.description !== undefined)
    data.description = patch.description.trim();
  if (patch.icon !== undefined) data.icon = patch.icon;
  if (patch.dayPart !== undefined) data.dayPart = patch.dayPart;
  if (patch.schedule !== undefined) data.schedule = patch.schedule;
  if (patch.paused !== undefined) data.paused = patch.paused;
  if (patch.order !== undefined) data.order = patch.order;
  if (patch.currentStreak !== undefined)
    data.currentStreak = patch.currentStreak;
  if (patch.longestStreak !== undefined)
    data.longestStreak = patch.longestStreak;
  if (patch.lastResolvedLocalDate !== undefined)
    data.lastResolvedLocalDate = patch.lastResolvedLocalDate;

  await updateDoc(habitRef(uid, habitId), data);
}

export async function softDeleteHabit(
  uid: string,
  habitId: string,
): Promise<void> {
  await updateDoc(habitRef(uid, habitId), {
    deletedAt: toLocalDateString(),
    updatedAt: serverTimestamp(),
  });
}

export async function setHabitPaused(
  uid: string,
  habitId: string,
  paused: boolean,
): Promise<void> {
  await updateDoc(habitRef(uid, habitId), {
    paused,
    updatedAt: serverTimestamp(),
  });
}

export async function listCompletionsForHabit(
  uid: string,
  habitId: string,
): Promise<HabitCompletion[]> {
  const snap = await getDocs(
    query(completionsCol(uid), where("habitId", "==", habitId)),
  );
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      habitId: String(data.habitId),
      localDate: String(data.localDate),
      completedAt: data.completedAt,
    };
  });
}

export async function listAllHabitCompletions(
  uid: string,
): Promise<HabitCompletion[]> {
  const snap = await getDocs(completionsCol(uid));
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      habitId: String(data.habitId),
      localDate: String(data.localDate),
      completedAt: data.completedAt,
    };
  });
}

export async function setHabitCompletion(
  uid: string,
  habitId: string,
  localDate: string,
): Promise<void> {
  await setDoc(
    completionRef(uid, habitId, localDate),
    {
      habitId,
      localDate,
      completedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function clearHabitCompletion(
  uid: string,
  habitId: string,
  localDate: string,
): Promise<void> {
  await deleteDoc(completionRef(uid, habitId, localDate));
}
