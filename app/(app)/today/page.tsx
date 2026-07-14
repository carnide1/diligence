"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useHabits } from "@/contexts/HabitsContext";
import { useGoals } from "@/contexts/GoalsContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import {
  buildTodaySections,
  computeTodayProgress,
  type TodayItem,
} from "@/lib/todayFeed";
import { updateHabit } from "@/lib/habits";
import { updateGoal } from "@/lib/goals";
import { toLocalDateString } from "@/lib/dates";
import type { DayPartKey } from "@/types/user";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TodaySectionBlock } from "@/components/today/TodaySectionBlock";
import { DayPartEditModal } from "@/components/today/DayPartEditModal";

export default function TodayPage() {
  const { user } = useAuth();
  const {
    habits,
    loading: habitsLoading,
    todayCompletions,
    weekCompletionCounts,
    toggleTodayCompletion,
    refresh: refreshHabits,
  } = useHabits();
  const {
    goals,
    loading: goalsLoading,
    toggleToday,
    isLeftover,
    refresh: refreshGoals,
  } = useGoals();
  const { profile, profileLoading } = useUserProfile();

  const [editPart, setEditPart] = useState<DayPartKey | null>(null);
  const [orderOverride, setOrderOverride] = useState<
    Partial<Record<DayPartKey, TodayItem[]>>
  >({});

  const baseSections = useMemo(
    () =>
      buildTodaySections({
        habits,
        goals,
        todayCompletions,
        weekCompletionCounts,
        dayPeriods: profile?.dayPeriods ?? [],
        isLeftover,
      }),
    [
      habits,
      goals,
      todayCompletions,
      weekCompletionCounts,
      profile?.dayPeriods,
      isLeftover,
    ],
  );

  const sections = useMemo(() => {
    return baseSections.map((section) => {
      const override = orderOverride[section.dayPart];
      if (!override) return section;
      const freshById = new Map(section.items.map((i) => [i.id, i]));
      const items = override
        .map((item) => {
          const fresh = freshById.get(item.id);
          return fresh ? { ...fresh, order: item.order } : null;
        })
        .filter((i): i is TodayItem => Boolean(i));
      for (const item of section.items) {
        if (!items.some((i) => i.id === item.id)) items.push(item);
      }
      return { ...section, items };
    });
  }, [baseSections, orderOverride]);

  const progress = computeTodayProgress(sections);
  const loading = habitsLoading || goalsLoading || profileLoading;

  const onToggle = async (item: TodayItem) => {
    try {
      if (item.kind === "habit") {
        await toggleTodayCompletion(item.habit.id, !item.done);
      } else {
        await toggleToday(item.goal);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const onReorder = async (dayPart: DayPartKey, items: TodayItem[]) => {
    if (!user) return;
    const withOrders = items.map((item, index) => ({ ...item, order: index }));
    setOrderOverride((prev) => ({ ...prev, [dayPart]: withOrders }));
    try {
      await Promise.all(
        withOrders.map((item) =>
          item.kind === "habit"
            ? updateHabit(user.uid, item.habit.id, { order: item.order })
            : updateGoal(user.uid, item.goal.id, { order: item.order }),
        ),
      );
      await Promise.all([refreshHabits(), refreshGoals()]);
      setOrderOverride((prev) => {
        const next = { ...prev };
        delete next[dayPart];
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reorder failed");
      setOrderOverride((prev) => {
        const next = { ...prev };
        delete next[dayPart];
        return next;
      });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Today
        </h1>
        <p className="text-sm text-muted">{toLocalDateString()}</p>
      </div>

      <ProgressBar
        value={progress.completed}
        max={Math.max(progress.total, 1)}
        label={
          progress.empty
            ? "Nothing scheduled"
            : `Progress ${progress.completed}/${progress.total}`
        }
      />

      {progress.celebrate ? (
        <div className="rounded-[var(--radius)] border border-success/40 bg-success-soft px-4 py-4 text-center">
          <p className="font-display text-xl text-success">All done</p>
          <p className="mt-1 text-sm text-muted">
            Habits and goals for today are clear.
          </p>
        </div>
      ) : null}

      {progress.empty && !loading ? (
        <div className="rounded-[var(--radius)] border border-border bg-bg-elevated/50 px-4 py-8 text-center text-sm text-muted">
          Nothing on Today yet.{" "}
          <Link href="/habits" className="text-accent hover:underline">
            Add a habit
          </Link>{" "}
          or{" "}
          <Link href="/goals" className="text-accent hover:underline">
            a goal
          </Link>
          .
        </div>
      ) : null}

      {loading ? <p className="text-sm text-muted">Loading Today…</p> : null}

      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <TodaySectionBlock
            key={section.dayPart}
            section={section}
            onEditHeader={setEditPart}
            onToggle={(item) => void onToggle(item)}
            onReorder={(part, items) => void onReorder(part, items)}
          />
        ))}
      </div>

      <DayPartEditModal
        open={editPart !== null}
        dayPart={editPart}
        onClose={() => setEditPart(null)}
      />
    </div>
  );
}
