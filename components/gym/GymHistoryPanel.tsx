"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useGym } from "@/contexts/GymContext";
import {
  buildExerciseProgression,
  progressionDelta,
  type ExerciseProgress,
  type ExerciseProgressEntry,
} from "@/lib/gymProgression";
import {
  liftVolume,
  type GymCardioBlock,
  type GymLiftEntry,
  type GymSession,
  type GymSessionStatus,
} from "@/types/gym";
import { TextInput } from "@/components/ui/TextInput";

const HISTORY_TABS = [
  { id: "workouts", label: "Workouts" },
  { id: "exercises", label: "Exercises" },
] as const;

type HistoryTabId = (typeof HISTORY_TABS)[number]["id"];

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

function formatSets(lift: Pick<GymLiftEntry, "loadType" | "sets">): string {
  return lift.sets
    .map((s) =>
      lift.loadType === "bodyweight"
        ? `BW×${s.reps}`
        : `${s.weight}lb×${s.reps}`,
    )
    .join(", ");
}

function formatSigned(n: number, suffix = ""): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}${suffix}`;
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
          {lifts.map((lift, index) => {
            const volume =
              lift.loadType === "external" ? liftVolume(lift) : null;
            return (
              <li key={`${lift.exerciseId}-${index}`} className="text-sm">
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

function WorkoutsTab({
  sessions,
  exerciseName,
}: {
  sessions: GymSession[];
  exerciseName: (id: string) => string;
}) {
  if (sessions.length === 0) {
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
        {sessions.map((s, index) => (
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

function EntryDelta({
  entry,
  previous,
}: {
  entry: ExerciseProgressEntry;
  previous: ExerciseProgressEntry | undefined;
}) {
  if (!previous) {
    return <span className="text-faint">first log</span>;
  }
  if (entry.loadType === "bodyweight" || previous.loadType === "bodyweight") {
    const d = entry.totalReps - previous.totalReps;
    if (d === 0) return <span className="text-faint">same reps</span>;
    return (
      <span className={d > 0 ? "text-success" : "text-danger"}>
        {formatSigned(d, " reps")}
      </span>
    );
  }
  const vol = entry.volume - previous.volume;
  const wt =
    entry.heaviestWeight != null && previous.heaviestWeight != null
      ? entry.heaviestWeight - previous.heaviestWeight
      : null;
  const parts: string[] = [];
  if (wt != null && wt !== 0) parts.push(formatSigned(wt, " lb"));
  if (vol !== 0) parts.push(formatSigned(vol, " vol"));
  if (!parts.length) return <span className="text-faint">same</span>;
  const up = (wt != null && wt > 0) || vol > 0;
  const down = (wt != null && wt < 0) || vol < 0;
  return (
    <span
      className={
        up && !down ? "text-success" : down && !up ? "text-danger" : "text-muted"
      }
    >
      {parts.join(" · ")}
    </span>
  );
}

function ExerciseProgressRow({
  progress,
  name,
  defaultOpen,
}: {
  progress: ExerciseProgress;
  name: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const detailsId = `gym-exercise-progress-${progress.exerciseId}`;
  const latest = progress.entries[progress.entries.length - 1];
  const delta = progressionDelta(progress.entries);
  // Newest first for reading recent growth.
  const timeline = [...progress.entries].reverse();

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
          <p className="font-medium text-foreground">{name}</p>
          <p className="mt-1 text-xs text-faint">
            {progress.entries.length} session
            {progress.entries.length === 1 ? "" : "s"}
            {latest ? ` · last ${latest.localDate}` : ""}
          </p>
        </div>
        {delta ? (
          <span
            className={[
              "shrink-0 text-[10px] uppercase tracking-wide",
              (delta.weightDelta != null && delta.weightDelta > 0) ||
              (delta.volumeDelta != null && delta.volumeDelta > 0) ||
              (delta.repsDelta != null && delta.repsDelta > 0)
                ? "text-success"
                : (delta.weightDelta != null && delta.weightDelta < 0) ||
                    (delta.volumeDelta != null && delta.volumeDelta < 0) ||
                    (delta.repsDelta != null && delta.repsDelta < 0)
                  ? "text-danger"
                  : "text-muted",
            ].join(" ")}
          >
            {delta.weightDelta != null && delta.weightDelta !== 0
              ? formatSigned(delta.weightDelta, " lb")
              : delta.volumeDelta != null && delta.volumeDelta !== 0
                ? formatSigned(delta.volumeDelta, " vol")
                : delta.repsDelta != null && delta.repsDelta !== 0
                  ? formatSigned(delta.repsDelta, " reps")
                  : "flat"}
          </span>
        ) : null}
      </button>

      {open ? (
        <div id={detailsId} className="space-y-2 border-t border-border px-4 py-3">
          <ul className="flex flex-col gap-2">
            {timeline.map((entry, index) => {
              // timeline is newest-first; previous chronological entry is next in array.
              const previousChronological = timeline[index + 1];
              return (
                <li key={`${entry.sessionId}-${entry.localDate}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {entry.localDate}
                    </p>
                    <p className="text-xs">
                      <EntryDelta
                        entry={entry}
                        previous={previousChronological}
                      />
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatSets(entry)}
                    {entry.loadType === "external" ? (
                      <span className="text-faint"> · vol {entry.volume}</span>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function ExercisesProgressTab({
  sessionHistory,
  exerciseNameById,
}: {
  sessionHistory: GymSession[];
  exerciseNameById: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const progression = useMemo(
    () => buildExerciseProgression(sessionHistory),
    [sessionHistory],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = progression
      .map((p) => ({
        progress: p,
        name: exerciseNameById[p.exerciseId] ?? "Unknown exercise",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter((row) => row.name.toLowerCase().includes(q));
  }, [progression, exerciseNameById, query]);

  if (progression.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-8 text-center text-sm text-muted">
        No accepted lifts yet. Complete a workout to start tracking progression.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Weight and rep history per exercise across accepted sessions.
      </p>
      <TextInput
        label="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter by exercise name…"
      />
      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-8 text-center text-sm text-muted">
          No exercises match this search.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((row, index) => (
            <ExerciseProgressRow
              key={row.progress.exerciseId}
              progress={row.progress}
              name={row.name}
              defaultOpen={index === 0 && !query}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export function GymHistoryPanel() {
  const { recentSessions, sessionHistory, exerciseNameById } = useGym();
  const [tab, setTab] = useState<HistoryTabId>("workouts");

  const exerciseName = useCallback(
    (id: string) => exerciseNameById[id] ?? "Unknown exercise",
    [exerciseNameById],
  );

  return (
    <div className="flex flex-col gap-4">
      <nav
        className="flex flex-wrap gap-1 border-b border-border pb-px"
        aria-label="History views"
      >
        {HISTORY_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "rounded-t-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border border-b-0 border-border bg-bg-elevated text-foreground"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "workouts" ? (
        <WorkoutsTab sessions={recentSessions} exerciseName={exerciseName} />
      ) : (
        <ExercisesProgressTab
          sessionHistory={sessionHistory}
          exerciseNameById={exerciseNameById}
        />
      )}
    </div>
  );
}
