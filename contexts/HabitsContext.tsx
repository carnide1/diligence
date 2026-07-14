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
  clearHabitCompletion,
  createHabit,
  listCompletionsForHabit,
  listHabits,
  setHabitCompletion,
  setHabitPaused,
  softDeleteHabit,
  updateHabit,
} from "@/lib/habits";
import { catchUpHabitStreaks, applyHabitCheckoffStreak, applyHabitUndoStreak, countCompletionsInWeek } from "@/lib/habitStreaks";
import { toLocalDateString } from "@/lib/dates";
import type { Habit, HabitInput } from "@/types/habit";

type HabitsContextValue = {
  habits: Habit[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addHabit: (input: HabitInput) => Promise<void>;
  editHabit: (id: string, input: HabitInput) => Promise<void>;
  pauseHabit: (id: string, paused: boolean) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleTodayCompletion: (id: string, completed: boolean) => Promise<void>;
  todayCompletions: Record<string, boolean>;
  /** Completions in the current Sun–Sat week per habit id. */
  weekCompletionCounts: Record<string, number>;
  reorderHabits: (orderedIds: string[]) => Promise<void>;
};

const HabitsContext = createContext<HabitsContextValue | null>(null);

export function HabitsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayCompletions, setTodayCompletions] = useState<
    Record<string, boolean>
  >({});
  const [weekCompletionCounts, setWeekCompletionCounts] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setHabits([]);
      setTodayCompletions({});
      setWeekCompletionCounts({});
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const today = toLocalDateString();
      let listed = await listHabits(user.uid);

      // Day-boundary catch-up per habit
      const resolved: Habit[] = [];
      for (const habit of listed) {
        const completions = await listCompletionsForHabit(user.uid, habit.id);
        const dates = new Set(completions.map((c) => c.localDate));
        const catchUp = catchUpHabitStreaks(habit, dates, today);
        if (
          catchUp.currentStreak !== habit.currentStreak ||
          catchUp.longestStreak !== habit.longestStreak ||
          catchUp.lastResolvedLocalDate !== habit.lastResolvedLocalDate
        ) {
          await updateHabit(user.uid, habit.id, {
            currentStreak: catchUp.currentStreak,
            longestStreak: catchUp.longestStreak,
            lastResolvedLocalDate: catchUp.lastResolvedLocalDate,
          });
          resolved.push({
            ...habit,
            currentStreak: catchUp.currentStreak,
            longestStreak: catchUp.longestStreak,
            lastResolvedLocalDate: catchUp.lastResolvedLocalDate,
          });
        } else {
          resolved.push(habit);
        }
      }

      listed = resolved;
      setHabits(listed);

      const completionMap: Record<string, boolean> = {};
      const weekMap: Record<string, number> = {};
      await Promise.all(
        listed.map(async (habit) => {
          const completions = await listCompletionsForHabit(user.uid, habit.id);
          const dates = new Set(completions.map((c) => c.localDate));
          completionMap[habit.id] = dates.has(today);
          weekMap[habit.id] = countCompletionsInWeek(dates, today);
        }),
      );
      setTodayCompletions(completionMap);
      setWeekCompletionCounts(weekMap);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load habits");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) void refresh();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [refresh]);

  const addHabit = useCallback(
    async (input: HabitInput) => {
      if (!user) throw new Error("Sign in required");
      await createHabit(user.uid, input);
      await refresh();
    },
    [user, refresh],
  );

  const editHabit = useCallback(
    async (id: string, input: HabitInput) => {
      if (!user) throw new Error("Sign in required");
      await updateHabit(user.uid, id, input);
      await refresh();
    },
    [user, refresh],
  );

  const pauseHabit = useCallback(
    async (id: string, paused: boolean) => {
      if (!user) throw new Error("Sign in required");
      await setHabitPaused(user.uid, id, paused);
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, paused } : h)),
      );
    },
    [user],
  );

  const deleteHabit = useCallback(
    async (id: string) => {
      if (!user) throw new Error("Sign in required");
      await softDeleteHabit(user.uid, id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
    },
    [user],
  );

  const toggleTodayCompletion = useCallback(
    async (id: string, completed: boolean) => {
      if (!user) throw new Error("Sign in required");
      const habit = habits.find((h) => h.id === id);
      if (!habit) throw new Error("Habit not found");
      const today = toLocalDateString();

      if (completed) {
        const streaks = applyHabitCheckoffStreak(habit);
        await setHabitCompletion(user.uid, id, today);
        await updateHabit(user.uid, id, streaks);
        setTodayCompletions((prev) => ({ ...prev, [id]: true }));
        setHabits((prev) =>
          prev.map((h) => (h.id === id ? { ...h, ...streaks } : h)),
        );
      } else {
        const streaks = applyHabitUndoStreak(habit);
        await clearHabitCompletion(user.uid, id, today);
        await updateHabit(user.uid, id, streaks);
        setTodayCompletions((prev) => ({ ...prev, [id]: false }));
        setHabits((prev) =>
          prev.map((h) => (h.id === id ? { ...h, ...streaks } : h)),
        );
      }
    },
    [user, habits],
  );

  const reorderHabits = useCallback(
    async (orderedIds: string[]) => {
      if (!user) throw new Error("Sign in required");
      await Promise.all(
        orderedIds.map((id, index) =>
          updateHabit(user.uid, id, { order: index }),
        ),
      );
      setHabits((prev) => {
        const byId = new Map(prev.map((h) => [h.id, h]));
        const reordered = orderedIds
          .map((id, index) => {
            const h = byId.get(id);
            return h ? { ...h, order: index } : null;
          })
          .filter((h): h is Habit => h !== null);
        const untouched = prev.filter((h) => !orderedIds.includes(h.id));
        return [...reordered, ...untouched].sort(
          (a, b) => a.order - b.order || a.title.localeCompare(b.title),
        );
      });
    },
    [user],
  );

  const value = useMemo(
    () => ({
      habits,
      loading,
      error,
      refresh,
      addHabit,
      editHabit,
      pauseHabit,
      deleteHabit,
      toggleTodayCompletion,
      todayCompletions,
      weekCompletionCounts,
      reorderHabits,
    }),
    [
      habits,
      loading,
      error,
      refresh,
      addHabit,
      editHabit,
      pauseHabit,
      deleteHabit,
      toggleTodayCompletion,
      todayCompletions,
      weekCompletionCounts,
      reorderHabits,
    ],
  );

  return (
    <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>
  );
}

export function useHabits(): HabitsContextValue {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error("useHabits must be used within HabitsProvider");
  return ctx;
}
