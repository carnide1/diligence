"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Pause, Play, Trash2 } from "lucide-react";
import { useHabits } from "@/contexts/HabitsContext";
import { describeSchedule } from "@/lib/habitSchedule";
import { describeActiveRange } from "@/lib/activeRange";
import { toErrorMessage } from "@/lib/errors";
import { useDayPartGroups } from "@/hooks/useDayPartGroups";
import type { Habit, HabitInput } from "@/types/habit";
import { HabitFormModal } from "@/components/habits/HabitFormModal";
import { HabitIcon } from "@/components/icons/HabitIcon";
import { DayPartSection } from "@/components/ui/DayPartSection";
import { Button } from "@/components/ui/Button";
import { EntityDescription } from "@/components/ui/EntityDescription";
import { EntityListShell } from "@/components/layout/EntityListShell";

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

  const { groups, rangeByKey } = useDayPartGroups(habits);
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
      toast.error(toErrorMessage(err, "Save failed"));
      throw err;
    }
  };

  const onPause = async (habit: Habit) => {
    try {
      await pauseHabit(habit.id, !habit.paused);
      toast.success(habit.paused ? "Resumed" : "Paused");
    } catch (err) {
      toast.error(toErrorMessage(err, "Update failed"));
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
      toast.error(toErrorMessage(err, "Delete failed"));
    }
  };

  return (
    <EntityListShell
      title="Habits"
      description="Recurring schedules with current and longest streaks."
      actionLabel="New"
      onAction={openCreate}
      loading={loading}
      loadingLabel="Loading habits…"
      error={error}
      onRetry={() => void refresh()}
      empty={habits.length === 0}
      emptyLabel="No habits yet. Add one to start a streak."
    >
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
              {group.items.map((habit) => {
                const rangeLabel = describeActiveRange(
                  habit.activeStartLocalDate,
                  habit.activeEndLocalDate,
                );
                return (
                  <li
                    key={habit.id}
                    className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-3"
                  >
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 shrink-0 text-accent">
                        <HabitIcon iconKey={habit.icon} size={20} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words font-medium text-foreground">
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
                          {rangeLabel ? ` · ${rangeLabel}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-faint">
                          Streak {habit.currentStreak} · Best {habit.longestStreak}
                        </p>
                      </div>

                      {habit.description ? (
                        <div className="hidden w-[12rem] shrink-0 md:block md:w-[14rem]">
                          <EntityDescription text={habit.description} />
                        </div>
                      ) : null}
                    </div>

                    {habit.description ? (
                      <div className="mt-3 md:hidden">
                        <EntityDescription text={habit.description} />
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
                );
              })}
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
    </EntityListShell>
  );
}
