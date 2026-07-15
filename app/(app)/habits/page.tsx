"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Pause, Play, Trash2 } from "lucide-react";
import { useHabits } from "@/contexts/HabitsContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { describeSchedule } from "@/lib/habitSchedule";
import { groupByDayPart } from "@/lib/groupByDayPart";
import { formatPeriodRange } from "@/lib/dayPeriods";
import type { Habit, HabitInput } from "@/types/habit";
import { HabitFormModal } from "@/components/habits/HabitFormModal";
import { HabitIcon } from "@/components/icons/HabitIcon";
import { DayPartSection } from "@/components/ui/DayPartSection";
import { Button } from "@/components/ui/Button";

export default function HabitsPage() {
  const {
    habits,
    loading,
    error,
    refresh,
    addHabit,
    editHabit,
    pauseHabit,
    deleteHabit,
  } = useHabits();
  const { profile } = useUserProfile();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (habit: Habit) => {
    setEditing(habit);
    setModalOpen(true);
  };

  const onSave = async (input: HabitInput) => {
    try {
      if (editing) {
        await editHabit(editing.id, input);
        toast.success("Habit updated");
      } else {
        await addHabit(input);
        toast.success("Habit created");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      throw err;
    }
  };

  const onPause = async (habit: Habit) => {
    try {
      await pauseHabit(habit.id, !habit.paused);
      toast.success(habit.paused ? "Resumed" : "Paused");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const onDelete = async (habit: Habit) => {
    if (!window.confirm(`Delete “${habit.title}”? History stays on the calendar.`)) {
      return;
    }
    try {
      await deleteHabit(habit.id);
      toast.success("Habit deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const groups = useMemo(() => {
    const labels = Object.fromEntries(
      (profile?.dayPeriods ?? []).map((p) => [p.key, p.label]),
    );
    return groupByDayPart(habits, labels);
  }, [habits, profile?.dayPeriods]);

  const rangeByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const period of profile?.dayPeriods ?? []) {
      map.set(period.key, formatPeriodRange(period));
    }
    return map;
  }, [profile?.dayPeriods]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            Habits
          </h1>
          <p className="text-sm text-muted">
            Recurring schedules with current and longest streaks.
          </p>
        </div>
        <Button onClick={openCreate}>New</Button>
      </div>

      {loading ? <p className="text-sm text-muted">Loading habits…</p> : null}

      {error ? (
        <div className="rounded-[var(--radius)] border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p>{error}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => void refresh()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {!loading && !error && habits.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-8 text-center text-sm text-muted">
          No habits yet. Add one to start a streak.
        </div>
      ) : null}

      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <DayPartSection
            key={group.key}
            dayPart={group.key}
            label={group.label}
            count={group.items.length}
            rangeLabel={rangeByKey.get(group.key)}
          >
            <ul className="flex flex-col gap-3">
              {group.items.map((habit) => (
                <li
                  key={habit.id}
                  className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-3"
                >
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 shrink-0 text-accent">
                      <HabitIcon iconKey={habit.icon} size={20} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-foreground">
                          {habit.title}
                        </p>
                        {habit.paused ? (
                          <span className="rounded bg-bg-overlay px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-faint">
                            Paused
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {describeSchedule(habit.schedule)}
                      </p>
                      <p className="mt-1 text-xs text-faint">
                        Streak {habit.currentStreak} · Best {habit.longestStreak}
                      </p>
                    </div>

                    {habit.description ? (
                      <div className="hidden w-[12rem] shrink-0 md:block md:w-[14rem]">
                        <p className="mb-1.5 px-3 text-xs font-medium text-muted">
                          Description
                        </p>
                        <div className="rounded-[var(--radius-sm)] bg-bg-overlay/80 px-3 py-2">
                          <p className="break-words text-xs leading-relaxed text-muted">
                            {habit.description}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {habit.description ? (
                    <div className="mt-3 md:hidden">
                      <p className="mb-1.5 px-3 text-xs font-medium text-muted">
                        Description
                      </p>
                      <div className="rounded-[var(--radius-sm)] bg-bg-overlay/80 px-3 py-2">
                        <p className="break-words text-xs leading-relaxed text-muted">
                          {habit.description}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEdit(habit)}
                    >
                      <Pencil size={14} />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void onPause(habit)}
                    >
                      {habit.paused ? <Play size={14} /> : <Pause size={14} />}
                      {habit.paused ? "Resume" : "Pause"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void onDelete(habit)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </DayPartSection>
        ))}
      </div>

      <HabitFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSave}
        initial={editing}
      />
    </div>
  );
}
