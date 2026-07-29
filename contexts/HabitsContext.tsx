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
  applyHabitCompletionToggle,
  createHabit,
  listAllHabitCompletions,
  listHabits,
  setHabitPaused,
  softDeleteHabit,
  updateHabit,
} from "@/lib/habits";
import {
  catchUpHabitStreaks,
  applyHabitCheckoffStreak,
  applyHabitUndoStreak,
  countCompletionsInWeek,
} from "@/lib/habitStreaks";
import { toLocalDateString } from "@/lib/dates";
import { toErrorMessage } from "@/lib/errors";
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
  reorderHabits: (orders: { id: string; order: number }[]) => Promise<void>;
};

const HabitsContext = createContext<HabitsContextValue | null>(null);

function groupCompletionDates(
  completions: { habitId: string; localDate: string }[],
): Map<string, Set<string>> {
  const byHabit = new Map<string, Set<string>>();
  for (const c of completions) {
    let dates = byHabit.get(c.habitId);
    if (!dates) {
      dates = new Set();
      byHabit.set(c.habitId, dates);
    }
    dates.add(c.localDate);
  }
  return byHabit;
}

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
      const [listed, allCompletions] = await Promise.all([
        listHabits(user.uid),
        listAllHabitCompletions(user.uid),
      ]);
      const datesByHabit = groupCompletionDates(allCompletions);

      const resolved: Habit[] = [];
      const streakUpdates: Promise<void>[] = [];

      for (const habit of listed) {
        const dates = datesByHabit.get(habit.id) ?? new Set<string>();
        const catchUp = catchUpHabitStreaks(habit, dates, today);
        if (
          catchUp.currentStreak !== habit.currentStreak ||
          catchUp.longestStreak !== habit.longestStreak ||
          catchUp.lastResolvedLocalDate !== habit.lastResolvedLocalDate
        ) {
          streakUpdates.push(
            updateHabit(user.uid, habit.id, {
              currentStreak: catchUp.currentStreak,
              longestStreak: catchUp.longestStreak,
              lastResolvedLocalDate: catchUp.lastResolvedLocalDate,
            }),
          );
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

      await Promise.all(streakUpdates);
      setHabits(resolved);

      const completionMap: Record<string, boolean> = {};
      const weekMap: Record<string, number> = {};
      for (const habit of resolved) {
        const dates = datesByHabit.get(habit.id) ?? new Set<string>();
        completionMap[habit.id] = dates.has(today);
        weekMap[habit.id] = countCompletionsInWeek(dates, today);
      }
      setTodayCompletions(completionMap);
      setWeekCompletionCounts(weekMap);
    } catch (err) {
      console.error(err);
      setError(toErrorMessage(err, "Failed to load habits"));
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
      const streaks = completed
        ? applyHabitCheckoffStreak(habit)
        : applyHabitUndoStreak(habit);

      await applyHabitCompletionToggle(
        user.uid,
        id,
        today,
        completed,
        streaks,
      );

      setTodayCompletions((prev) => ({ ...prev, [id]: completed }));
      setWeekCompletionCounts((prev) => ({
        ...prev,
        [id]: completed
          ? (prev[id] ?? 0) + 1
          : Math.max(0, (prev[id] ?? 0) - 1),
      }));
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...streaks } : h)),
      );
    },
    [user, habits],
  );

  const reorderHabits = useCallback(
    async (orders: { id: string; order: number }[]) => {
      if (!user) throw new Error("Sign in required");
      if (orders.length === 0) return;
      await Promise.all(
        orders.map(({ id, order }) => updateHabit(user.uid, id, { order })),
      );
      const orderById = new Map(orders.map((o) => [o.id, o.order]));
      setHabits((prev) =>
        prev
          .map((h) =>
            orderById.has(h.id) ? { ...h, order: orderById.get(h.id)! } : h,
          )
          .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
      );
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
