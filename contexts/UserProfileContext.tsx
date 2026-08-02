"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  ensureUserDoc,
  updateNotificationPrefs,
  updateUserDayPeriods,
  updateUserDisplayName,
  updateUserTimezone,
} from "@/lib/users";
import { defaultTimezone } from "@/lib/nudgeDecide";
import type { DayPeriod, NotificationPrefs, UserProfile } from "@/types/user";

type UserProfileContextValue = {
  profile: UserProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  saveDisplayName: (displayName: string) => Promise<void>;
  saveDayPeriods: (dayPeriods: DayPeriod[]) => Promise<void>;
  saveNotificationPrefs: (prefs: NotificationPrefs) => Promise<void>;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user, updateDisplayName } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (uidUser: NonNullable<typeof user>) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const next = await ensureUserDoc(uidUser);
      const tz = defaultTimezone();
      if (next.timezone === "UTC" && tz !== "UTC") {
        await updateUserTimezone(uidUser.uid, tz);
        next.timezone = tz;
      }
      setProfile(next);
    } catch (error) {
      console.error(error);
      setProfileError(
        error instanceof Error
          ? error.message
          : "Could not load your profile. Check Firestore rules.",
      );
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }
    await loadProfile(user);
  }, [user, loadProfile]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (!user) {
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
        return;
      }
      void loadProfile(user);
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user, loadProfile]);

  const saveDisplayName = useCallback(
    async (displayName: string) => {
      if (!user) throw new Error("You must be signed in.");
      await updateDisplayName(displayName);
      await updateUserDisplayName(user.uid, displayName);
      setProfile((prev) =>
        prev ? { ...prev, displayName: displayName.trim() } : prev,
      );
    },
    [user, updateDisplayName],
  );

  const saveDayPeriods = useCallback(
    async (dayPeriods: DayPeriod[]) => {
      if (!user) throw new Error("You must be signed in.");
      await updateUserDayPeriods(user.uid, dayPeriods);
      setProfile((prev) => (prev ? { ...prev, dayPeriods } : prev));
    },
    [user],
  );

  const saveNotificationPrefs = useCallback(
    async (prefs: NotificationPrefs) => {
      if (!user) throw new Error("You must be signed in.");
      await updateNotificationPrefs(user.uid, prefs);
      setProfile((prev) =>
        prev ? { ...prev, notificationPrefs: prefs } : prev,
      );
    },
    [user],
  );

  const value = useMemo(
    () => ({
      profile,
      profileLoading,
      profileError,
      refreshProfile,
      saveDisplayName,
      saveDayPeriods,
      saveNotificationPrefs,
    }),
    [
      profile,
      profileLoading,
      profileError,
      refreshProfile,
      saveDisplayName,
      saveDayPeriods,
      saveNotificationPrefs,
    ],
  );

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }
  return ctx;
}
