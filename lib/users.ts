import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb } from "@/lib/firebase";
import { DEFAULT_DAY_PERIODS } from "@/lib/dayPeriods";
import type { DayPeriod, UserProfile } from "../types/user";

function userRef(uid: string) {
  return doc(getFirebaseDb(), "users", uid);
}

function normalizeProfile(
  data: Record<string, unknown>,
  fallback: { displayName: string; email: string },
): UserProfile {
  const dayPeriods = Array.isArray(data.dayPeriods)
    ? (data.dayPeriods as DayPeriod[])
    : DEFAULT_DAY_PERIODS;

  return {
    displayName:
      typeof data.displayName === "string"
        ? data.displayName
        : fallback.displayName,
    email: typeof data.email === "string" ? data.email : fallback.email,
    createdAt: data.createdAt ?? null,
    dayPeriods,
    currentStreak:
      typeof data.currentStreak === "number" ? data.currentStreak : 0,
    longestStreak:
      typeof data.longestStreak === "number" ? data.longestStreak : 0,
    lastResolvedLocalDate:
      typeof data.lastResolvedLocalDate === "string"
        ? data.lastResolvedLocalDate
        : null,
  };
}

/** Create users/{uid} on first session; return the profile. */
export async function ensureUserDoc(user: User): Promise<UserProfile> {
  const ref = userRef(user.uid);
  const snap = await getDoc(ref);
  const fallback = {
    displayName: user.displayName?.trim() || "",
    email: user.email || "",
  };

  if (!snap.exists()) {
    const payload = {
      displayName: fallback.displayName,
      email: fallback.email,
      createdAt: serverTimestamp(),
      dayPeriods: DEFAULT_DAY_PERIODS,
      currentStreak: 0,
      longestStreak: 0,
      lastResolvedLocalDate: null,
    };
    await setDoc(ref, payload);
    return normalizeProfile(payload, fallback);
  }

  return normalizeProfile(snap.data() as Record<string, unknown>, fallback);
}

export async function updateUserDisplayName(
  uid: string,
  displayName: string,
): Promise<void> {
  await updateDoc(userRef(uid), { displayName: displayName.trim() });
}

export async function updateUserDayPeriods(
  uid: string,
  dayPeriods: DayPeriod[],
): Promise<void> {
  await updateDoc(userRef(uid), { dayPeriods });
}

export async function updateUserGoalStreaks(
  uid: string,
  fields: {
    currentStreak: number;
    longestStreak: number;
    lastResolvedLocalDate: string;
  },
): Promise<void> {
  await updateDoc(userRef(uid), {
    currentStreak: fields.currentStreak,
    longestStreak: fields.longestStreak,
    lastResolvedLocalDate: fields.lastResolvedLocalDate,
  });
}
