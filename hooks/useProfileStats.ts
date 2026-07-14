"use client";

import { useEffect, useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { listHabits, listAllHabitCompletions } from "@/lib/habits";
import { listGoalsForTodayView } from "@/lib/goals";
import { monthHabitCompletionRate } from "@/lib/calendarData";
import { toLocalDateString } from "@/lib/dates";

export type ProfileStats = {
  goalCurrent: number;
  goalLongest: number;
  bestHabitStreak: number;
  bestHabitTitle: string | null;
  monthRate: number;
  monthCompleted: number;
  monthScheduled: number;
  activeHabits: number;
  activeGoals: number;
};

export function useProfileStats(): {
  stats: ProfileStats | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!user || !profile) {
      const clearTimer = setTimeout(() => {
        if (!cancelled) setStats(null);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(clearTimer);
      };
    }

    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const today = toLocalDateString();
          const now = new Date();
          const [habits, todayGoals, completions] = await Promise.all([
            listHabits(user.uid, { includeDeleted: false }),
            listGoalsForTodayView(user.uid),
            listAllHabitCompletions(user.uid),
          ]);

          const activeGoals = todayGoals.filter((g) => g.status === "active");

          let bestHabitStreak = 0;
          let bestHabitTitle: string | null = null;
          for (const h of habits) {
            if (h.longestStreak > bestHabitStreak) {
              bestHabitStreak = h.longestStreak;
              bestHabitTitle = h.title;
            }
          }

          const month = monthHabitCompletionRate({
            habits,
            completions,
            monthStart: toLocalDateString(startOfMonth(now)),
            monthEnd: toLocalDateString(endOfMonth(now)),
            today,
          });

          if (cancelled) return;
          setStats({
            goalCurrent: profile.currentStreak,
            goalLongest: profile.longestStreak,
            bestHabitStreak,
            bestHabitTitle,
            monthRate: month.rate,
            monthCompleted: month.completed,
            monthScheduled: month.scheduled,
            activeHabits: habits.filter((h) => !h.paused).length,
            activeGoals: activeGoals.length,
          });
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user, profile]);

  return { stats, loading };
}
