"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useHabits } from "@/contexts/HabitsContext";
import { describeSchedule } from "@/lib/habitSchedule";
import { DAY_PART_LABELS } from "@/types/user";
import type { Habit, HabitInput } from "@/types/habit";
import { HabitFormModal } from "@/components/habits/HabitFormModal";
import { HabitIcon } from "@/components/icons/HabitIcon";
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
    toggleTodayCompletion,
    todayCompletions,
  } = useHabits();

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

  const onToggle = async (habit: Habit) => {
    const done = Boolean(todayCompletions[habit.id]);
    try {
      await toggleTodayCompletion(habit.id, !done);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  };

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
        <Button onClick={openCreate}>Add habit</Button>
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
        <div className="rounded-[var(--radius)] border border-border bg-bg-elevated/50 px-4 py-8 text-center text-sm text-muted">
          No habits yet. Add one to start a streak.
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {habits.map((habit) => {
          const done = Boolean(todayCompletions[habit.id]);
          return (
            <li
              key={habit.id}
              className="rounded-[var(--radius)] border border-border bg-bg-elevated/50 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => void onToggle(habit)}
                  disabled={habit.paused}
                  className={[
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm",
                    done
                      ? "border-success bg-success-soft text-success"
                      : "border-border text-faint",
                    habit.paused ? "opacity-40" : "",
                  ].join(" ")}
                  aria-label={done ? "Undo today" : "Complete today"}
                  title="Toggle today (full Today page comes in Phase 6)"
                >
                  {done ? "✓" : ""}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-accent">
                      <HabitIcon iconKey={habit.icon} size={18} />
                    </span>
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
                    {DAY_PART_LABELS[habit.dayPart]} ·{" "}
                    {describeSchedule(habit.schedule)}
                  </p>
                  <p className="mt-1 text-xs text-faint">
                    Streak {habit.currentStreak} · Best {habit.longestStreak}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEdit(habit)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void onPause(habit)}
                >
                  {habit.paused ? "Resume" : "Pause"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void onDelete(habit)}
                >
                  Delete
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <HabitFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSave}
        initial={editing}
      />
    </div>
  );
}
