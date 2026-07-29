"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useGoals } from "@/contexts/GoalsContext";
import { toErrorMessage } from "@/lib/errors";
import { useDayPartGroups } from "@/hooks/useDayPartGroups";
import type { Goal, GoalInput } from "@/types/goal";
import { GoalFormModal } from "@/components/goals/GoalFormModal";
import { HabitIcon } from "@/components/icons/HabitIcon";
import { DayPartSection } from "@/components/ui/DayPartSection";
import { Button } from "@/components/ui/Button";
import { EntityListShell } from "@/components/layout/EntityListShell";
import { StatTile } from "@/components/ui/StatTile";

export default function GoalsPage() {
  const {
    goals,
    loading,
    error,
    refresh,
    addGoal,
    editGoal,
    deleteGoal,
    toggleToday,
    isLeftover,
  } = useGoals();
  const { groups, rangeByKey, profile } = useDayPartGroups(goals);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setModalOpen(true);
  };

  const onSave = async (input: GoalInput) => {
    try {
      if (editing) {
        await editGoal(editing.id, input);
        toast.success("Goal updated");
      } else {
        await addGoal(input);
        toast.success("Goal created");
      }
    } catch (err) {
      toast.error(toErrorMessage(err, "Save failed"));
      throw err;
    }
  };

  const onDelete = async (goal: Goal) => {
    if (!window.confirm(`Delete “${goal.title}”?`)) return;
    try {
      await deleteGoal(goal.id);
      toast.success("Goal deleted");
    } catch (err) {
      toast.error(toErrorMessage(err, "Delete failed"));
    }
  };

  const onToggle = async (goal: Goal) => {
    try {
      await toggleToday(goal);
    } catch (err) {
      toast.error(toErrorMessage(err, "Could not update"));
    }
  };

  return (
    <EntityListShell
      title="Goals"
      description="Same-day targets. Leftovers roll until done."
      actionLabel="Add goal"
      onAction={openCreate}
      loading={loading}
      loadingLabel="Loading goals…"
      error={error}
      onRetry={() => void refresh()}
      empty={goals.length === 0}
      emptyLabel="No active goals. Add one for today."
      beforeList={
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Current streak" value={profile?.currentStreak ?? 0} />
          <StatTile label="Longest streak" value={profile?.longestStreak ?? 0} />
        </div>
      }
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
              {group.items.map((goal) => {
                const done = goal.status === "completed";
                const leftover = isLeftover(goal);
                return (
                  <li
                    key={goal.id}
                    className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => void onToggle(goal)}
                        className={[
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm",
                          done
                            ? "border-success bg-success-soft text-success"
                            : "border-border text-faint",
                        ].join(" ")}
                        aria-label={done ? "Undo today" : "Complete today"}
                      >
                        {done ? "✓" : ""}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-accent">
                            <HabitIcon iconKey={goal.icon} size={18} />
                          </span>
                          <p
                            className={[
                              "truncate font-medium",
                              done
                                ? "text-muted line-through"
                                : "text-foreground",
                            ].join(" ")}
                          >
                            {goal.title}
                          </p>
                          {leftover && !done ? (
                            <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                              Leftover
                            </span>
                          ) : null}
                        </div>
                        {goal.description ? (
                          <p className="mt-1 text-xs text-muted">
                            {goal.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {!done ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(goal)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void onDelete(goal)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </DayPartSection>
        ))}
      </div>

      <GoalFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSave}
        initial={editing}
      />
    </EntityListShell>
  );
}
