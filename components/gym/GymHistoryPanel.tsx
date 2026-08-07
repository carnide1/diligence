"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useGym } from "@/contexts/GymContext";
import { liftVolume, type GymCardioBlock, type GymLiftEntry, type GymSession, type GymSessionStatus } from "@/types/gym";

function statusLabel(status: GymSessionStatus): string {
  if (status === "accepted") return "Completed";
  if (status === "planned") return "Planned";
  return "Rejected";
}

function statusClass(status: GymSessionStatus): string {
  if (status === "accepted") return "bg-success-soft text-success";
  if (status === "planned") return "bg-accent-soft text-accent";
  return "bg-danger-soft text-danger";
}

function formatSets(lift: GymLiftEntry): string {
  return lift.sets
    .map((s) =>
      lift.loadType === "bodyweight"
        ? `BW×${s.reps}`
        : `${s.weight}lb×${s.reps}`,
    )
    .join(", ");
}

function CardioSummary({
  label,
  block,
}: {
  label: string;
  block: GymCardioBlock | null | undefined;
}) {
  if (!block) return null;
  return (
    <p className="text-xs text-muted">
      <span className="font-medium text-foreground">{label}:</span>{" "}
      {block.machine || "—"} · {block.minutes}m · {block.calories} cal
    </p>
  );
}

function SessionDetail({
  session,
  exerciseName,
}: {
  session: GymSession;
  exerciseName: (id: string) => string;
}) {
  const preferActual =
    session.status === "accepted" ||
    (session.status === "rejected" && Boolean(session.actualExercises?.length));
  const lifts =
    preferActual && session.actualExercises?.length
      ? session.actualExercises
      : session.plannedExercises;
  const warmup =
    preferActual && session.actualWarmup
      ? session.actualWarmup
      : session.plannedWarmup;
  const cardio =
    preferActual && session.actualCardio
      ? session.actualCardio
      : session.plannedCardio;
  const showingPlan =
    session.status === "planned" ||
    (session.status === "rejected" && !session.actualExercises?.length);

  return (
    <div className="space-y-3 border-t border-border pt-3">
      {showingPlan ? (
        <p className="text-xs text-faint">Planned workout</p>
      ) : null}

      {session.status === "rejected" && session.rejectReasons.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-danger">
          {session.rejectReasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : null}

      {lifts.length === 0 ? (
        <p className="text-xs text-faint">No exercises logged.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lifts.map((lift) => {
            const volume =
              lift.loadType === "external" ? liftVolume(lift) : null;
            return (
              <li key={lift.exerciseId} className="text-sm">
                <p className="font-medium text-foreground">
                  {exerciseName(lift.exerciseId)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatSets(lift)}
                  {volume != null ? (
                    <span className="text-faint"> · vol {volume}</span>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-1">
        <CardioSummary label="Warm-up" block={warmup} />
        <CardioSummary label="Cardio" block={cardio} />
      </div>
    </div>
  );
}

function SessionRow({
  session,
  exerciseName,
  defaultOpen,
}: {
  session: GymSession;
  exerciseName: (id: string) => string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const count =
    session.actualExercises?.length ?? session.plannedExercises.length;
  const detailsId = `gym-session-${session.id}`;

  return (
    <li className="rounded-[var(--radius)] border border-border bg-bg-elevated">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-overlay/40"
      >
        <ChevronDown
          size={16}
          className={[
            "shrink-0 text-faint transition-transform duration-150",
            open ? "" : "-rotate-90",
          ].join(" ")}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{session.localDate}</p>
          <p className="mt-1 text-xs text-faint">
            {count} exercise{count === 1 ? "" : "s"}
          </p>
        </div>
        <span
          className={[
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
            statusClass(session.status),
          ].join(" ")}
        >
          {statusLabel(session.status)}
        </span>
      </button>

      {open ? (
        <div id={detailsId} className="px-4 pb-4">
          <SessionDetail session={session} exerciseName={exerciseName} />
        </div>
      ) : null}
    </li>
  );
}

export function GymHistoryPanel() {
  const { recentSessions, exercises } = useGym();

  const exerciseName = (id: string) =>
    exercises.find((e) => e.id === id)?.name ?? "Unknown exercise";

  if (recentSessions.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-8 text-center text-sm text-muted">
        No sessions this week yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Sessions in the current gym week. Tap a row to see the workout.
      </p>
      <ul className="flex flex-col gap-3">
        {recentSessions.map((s, index) => (
          <SessionRow
            key={s.id}
            session={s}
            exerciseName={exerciseName}
            defaultOpen={index === 0}
          />
        ))}
      </ul>
    </div>
  );
}
