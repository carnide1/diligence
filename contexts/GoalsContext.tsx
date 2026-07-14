"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import {
  buildGoalStreakSnapshots,
  completeGoalToday,
  createGoal,
  listGoalsForTodayView,
  softDeleteGoal,
  undoGoalCompletionToday,
  updateGoal,
} from "@/lib/goals";
import { catchUpGoalStreaks, isLeftoverGoal } from "@/lib/goalStreaks";
import { updateUserGoalStreaks } from "@/lib/users";
import { toLocalDateString } from "@/lib/dates";
import type { Goal, GoalInput } from "@/types/goal";
import type { UserProfile } from "@/types/user";

type GoalsContextValue = {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addGoal: (input: GoalInput) => Promise<void>;
  editGoal: (id: string, input: GoalInput) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  toggleToday: (goal: Goal) => Promise<void>;
  isLeftover: (goal: Goal) => boolean;
  reorderGoals: (orderedIds: string[]) => Promise<void>;
};

const GoalsContext = createContext<GoalsContextValue | null>(null);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, refreshProfile } = useUserProfile();
  const profileRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const today = toLocalDateString();
      const currentProfile = profileRef.current;

      if (currentProfile) {
        const snapshots = await buildGoalStreakSnapshots(user.uid);
        const catchUp = catchUpGoalStreaks(
          {
            currentStreak: currentProfile.currentStreak,
            longestStreak: currentProfile.longestStreak,
            lastResolvedLocalDate: currentProfile.lastResolvedLocalDate,
          },
          snapshots,
          today,
        );

        if (
          catchUp.currentStreak !== currentProfile.currentStreak ||
          catchUp.longestStreak !== currentProfile.longestStreak ||
          catchUp.lastResolvedLocalDate !==
            currentProfile.lastResolvedLocalDate
        ) {
          await updateUserGoalStreaks(user.uid, catchUp);
          await refreshProfile();
        }
      }

      const listed = await listGoalsForTodayView(user.uid);
      setGoals(listed);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [user, refreshProfile]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) void refresh();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [refresh, profile?.lastResolvedLocalDate]);

  const addGoal = useCallback(
    async (input: GoalInput) => {
      if (!user) throw new Error("Sign in required");
      await createGoal(user.uid, input);
      await refresh();
    },
    [user, refresh],
  );

  const editGoal = useCallback(
    async (id: string, input: GoalInput) => {
      if (!user) throw new Error("Sign in required");
      await updateGoal(user.uid, id, input);
      await refresh();
    },
    [user, refresh],
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      if (!user) throw new Error("Sign in required");
      await softDeleteGoal(user.uid, id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    },
    [user],
  );

  const toggleToday = useCallback(
    async (goal: Goal) => {
      if (!user) throw new Error("Sign in required");
      if (goal.status === "completed") {
        await undoGoalCompletionToday(user.uid, goal.id);
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goal.id ? { ...g, status: "active" as const } : g,
          ),
        );
      } else {
        await completeGoalToday(user.uid, goal.id);
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goal.id ? { ...g, status: "completed" as const } : g,
          ),
        );
      }
    },
    [user],
  );

  const isLeftover = useCallback((goal: Goal) => {
    return isLeftoverGoal(goal.createdLocalDate);
  }, []);

  const reorderGoals = useCallback(
    async (orderedIds: string[]) => {
      if (!user) throw new Error("Sign in required");
      await Promise.all(
        orderedIds.map((id, index) =>
          updateGoal(user.uid, id, { order: index }),
        ),
      );
      setGoals((prev) => {
        const byId = new Map(prev.map((g) => [g.id, g]));
        const reordered = orderedIds
          .map((id, index) => {
            const g = byId.get(id);
            return g ? { ...g, order: index } : null;
          })
          .filter((g): g is Goal => g !== null);
        const untouched = prev.filter((g) => !orderedIds.includes(g.id));
        return [...reordered, ...untouched].sort(
          (a, b) => a.order - b.order || a.title.localeCompare(b.title),
        );
      });
    },
    [user],
  );

  const value = useMemo(
    () => ({
      goals,
      loading,
      error,
      refresh,
      addGoal,
      editGoal,
      deleteGoal,
      toggleToday,
      isLeftover,
      reorderGoals,
    }),
    [
      goals,
      loading,
      error,
      refresh,
      addGoal,
      editGoal,
      deleteGoal,
      toggleToday,
      isLeftover,
      reorderGoals,
    ],
  );

  return (
    <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
  );
}

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used within GoalsProvider");
  return ctx;
}
