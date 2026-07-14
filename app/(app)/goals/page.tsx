"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useGoals } from "@/contexts/GoalsContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { DAY_PART_LABELS } from "@/types/user";
import type { Goal, GoalInput } from "@/types/goal";
import { GoalFormModal } from "@/components/goals/GoalFormModal";
import { HabitIcon } from "@/components/icons/HabitIcon";
import { Button } from "@/components/ui/Button";

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
  const { profile } = useUserProfile();

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
      toast.error(err instanceof Error ? err.message : "Save failed");
      throw err;
    }
  };

  const onDelete = async (goal: Goal) => {
    if (!window.confirm(`Delete “${goal.title}”?`)) return;
    try {
      await deleteGoal(goal.id);
      toast.success("Goal deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const onToggle = async (goal: Goal) => {
    try {
      await toggleToday(goal);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            Goals
          </h1>
          <p className="text-sm text-muted">
            Same-day targets. Leftovers roll until done.
          </p>
        </div>
        <Button onClick={openCreate}>Add goal</Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius)] border border-border bg-bg-elevated/50 px-4 py-3">
          <p className="text-xs text-faint">Current streak</p>
          <p className="mt-1 text-2xl font-medium text-foreground">
            {profile?.currentStreak ?? 0}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-bg-elevated/50 px-4 py-3">
          <p className="text-xs text-faint">Longest streak</p>
          <p className="mt-1 text-2xl font-medium text-foreground">
            {profile?.longestStreak ?? 0}
          </p>
        </div>
      </div>

      {loading ? <p className="text-sm text-muted">Loading goals…</p> : null}

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

      {!loading && !error && goals.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-bg-elevated/50 px-4 py-8 text-center text-sm text-muted">
          No active goals. Add one for today.
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {goals.map((goal) => {
          const done = goal.status === "completed";
          const leftover = isLeftover(goal);
          return (
            <li
              key={goal.id}
              className="rounded-[var(--radius)] border border-border bg-bg-elevated/50 px-4 py-3"
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
                  <p className="mt-1 text-xs text-muted">
                    {DAY_PART_LABELS[goal.dayPart]}
                    {goal.description ? ` · ${goal.description}` : ""}
                  </p>
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

      <GoalFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSave}
        initial={editing}
      />
    </div>
  );
}
