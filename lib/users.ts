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
import { defaultTimezone } from "@/lib/nudgeDecide";
import type {
  DayPeriod,
  NotificationPrefs,
  UserProfile,
} from "../types/user";
import { DEFAULT_NOTIFICATION_PREFS } from "../types/user";

function userRef(uid: string) {
  return doc(getFirebaseDb(), "users", uid);
}

function normalizePrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NOTIFICATION_PREFS };
  const o = raw as Record<string, unknown>;
  return {
    enabled: o.enabled !== false,
    gymNags: o.gymNags !== false,
    habitsGoalsNags: o.habitsGoalsNags !== false,
  };
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
    timezone:
      typeof data.timezone === "string" && data.timezone
        ? data.timezone
        : "UTC",
    notificationPrefs: normalizePrefs(data.notificationPrefs),
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
      timezone: defaultTimezone(),
      notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
    };
    await setDoc(ref, payload);
    return normalizeProfile(payload, fallback);
  }

  const profile = normalizeProfile(
    snap.data() as Record<string, unknown>,
    fallback,
  );

  // Backfill timezone / prefs for older profiles
  const data = snap.data() as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (!data.timezone) patch.timezone = defaultTimezone();
  if (!data.notificationPrefs)
    patch.notificationPrefs = DEFAULT_NOTIFICATION_PREFS;
  if (Object.keys(patch).length) {
    await updateDoc(ref, patch);
    return normalizeProfile(
      { ...(snap.data() as Record<string, unknown>), ...patch },
      fallback,
    );
  }

  return profile;
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

export async function updateUserTimezone(
  uid: string,
  timezone: string,
): Promise<void> {
  await updateDoc(userRef(uid), { timezone });
}

export async function updateNotificationPrefs(
  uid: string,
  prefs: NotificationPrefs,
): Promise<void> {
  await updateDoc(userRef(uid), { notificationPrefs: prefs });
}
