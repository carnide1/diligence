"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { listHabits, listAllHabitCompletions } from "@/lib/habits";
import { listGoalsForStreak, listAllGoalCompletions } from "@/lib/goals";
import {
  buildCalendarDays,
  monthLabel,
  shiftMonth,
  summarizeMonth,
  type CalendarDay,
} from "@/lib/calendarData";
import { toLocalDateString } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import { HabitIcon } from "@/components/icons/HabitIcon";
import { Modal } from "@/components/ui/Modal";
import type { Habit } from "@/types/habit";
import type { Goal } from "@/types/goal";
import type { HabitCompletion } from "@/types/habit";
import type { GoalCompletion } from "@/types/goal";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [anchor, setAnchor] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion[]>(
    [],
  );
  const [goalCompletions, setGoalCompletions] = useState<GoalCompletion[]>([]);
  const [selected, setSelected] = useState<CalendarDay | null>(null);
  const [hovered, setHovered] = useState<CalendarDay | null>(null);

  const today = toLocalDateString();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const [h, g, hc, gc] = await Promise.all([
            listHabits(user.uid, { includeDeleted: true }),
            listGoalsForStreak(user.uid),
            listAllHabitCompletions(user.uid),
            listAllGoalCompletions(user.uid),
          ]);
          if (cancelled) return;
          setHabits(h);
          setGoals(g);
          setHabitCompletions(hc);
          setGoalCompletions(gc);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Failed to load");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user]);

  const days = useMemo(
    () =>
      buildCalendarDays({
        anchor,
        today,
        habits,
        goals,
        habitCompletions,
        goalCompletions,
      }),
    [anchor, today, habits, goals, habitCompletions, goalCompletions],
  );

  const bestHabitStreak = useMemo(
    () => habits.reduce((max, h) => Math.max(max, h.longestStreak), 0),
    [habits],
  );

  const summary = useMemo(
    () =>
      summarizeMonth(days, {
        currentGoalStreak: profile?.currentStreak ?? 0,
        longestGoalStreak: profile?.longestStreak ?? 0,
        bestHabitStreak,
      }),
    [days, profile, bestHabitStreak],
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Calendar
        </h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAnchor((d) => shiftMonth(d, -1))}
          >
            Prev
          </Button>
          <p className="min-w-[9rem] text-center text-sm text-muted">
            {monthLabel(anchor)}
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAnchor((d) => shiftMonth(d, 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryChip
          label="Habit rate"
          value={`${summary.habitRate}%`}
          hint={`${summary.habitCompleted}/${summary.habitScheduled}`}
        />
        <SummaryChip
          label="Goal clears"
          value={`${summary.goalClearDays}`}
          hint={`${summary.daysWithGoals} days w/ goals`}
        />
        <SummaryChip
          label="Goal streak"
          value={`${summary.currentGoalStreak}`}
          hint={`Best ${summary.longestGoalStreak}`}
        />
        <SummaryChip
          label="Best habit"
          value={`${summary.bestHabitStreak}`}
          hint="Longest habit streak"
        />
      </div>

      {loading ? <p className="text-sm text-muted">Loading calendar…</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="overflow-hidden rounded-[var(--radius)] border border-border">
        <div className="grid grid-cols-7 border-b border-border bg-bg-elevated/80">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-1 py-2 text-center text-[10px] uppercase tracking-wide text-faint"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => (
            <button
              key={day.localDate}
              type="button"
              disabled={!day.inMonth}
              onClick={() => day.inMonth && setSelected(day)}
              onMouseEnter={() => day.inMonth && setHovered(day)}
              onMouseLeave={() => setHovered(null)}
              className={[
                "min-h-[4.25rem] border-b border-r border-border p-1.5 text-left transition-colors last:border-r-0",
                day.inMonth
                  ? "hover:bg-bg-overlay/70"
                  : "bg-bg/40 text-faint",
                day.isToday ? "ring-1 ring-inset ring-accent/50" : "",
                selected?.localDate === day.localDate
                  ? "bg-accent-soft/40"
                  : "",
              ].join(" ")}
              title={day.inMonth ? "View day details" : undefined}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={[
                    "text-xs",
                    day.inMonth ? "text-muted" : "text-faint",
                    day.isToday ? "font-semibold text-accent" : "",
                  ].join(" ")}
                >
                  {Number(day.localDate.slice(8))}
                </span>
                <ToneMark tone={day.tone} inMonth={day.inMonth} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {hovered && !selected ? (
        <div className="hidden rounded-[var(--radius)] border border-border bg-bg-elevated/70 px-4 py-3 md:block">
          <p className="text-xs text-faint">{hovered.localDate}</p>
          {hovered.items.length === 0 ? (
            <p className="mt-1 text-sm text-muted">No items</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {hovered.items.slice(0, 4).map((item) => (
                <li key={`${item.kind}-${item.id}`} className="text-sm text-foreground">
                  <span className="text-faint">
                    {item.kind === "habit" ? "Habit: " : "Goal: "}
                  </span>
                  {item.title}
                  <span className="text-muted">
                    {" "}
                    ·{" "}
                    {item.completedAtLabel
                      ? item.completedAtLabel
                      : item.status}
                  </span>
                </li>
              ))}
              {hovered.items.length > 4 ? (
                <li className="text-xs text-faint">Tap for full list</li>
              ) : null}
            </ul>
          )}
        </div>
      ) : null}

      <p className="text-xs text-faint">
        Hover (desktop) for a preview · tap/click for the full day popup.
      </p>

      <Modal
        open={selected !== null}
        title={selected?.localDate ?? "Day"}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-3">
            {selected.items.length === 0 ? (
              <p className="text-sm text-muted">
                {selected.isFuture
                  ? "No upcoming habits scheduled."
                  : "Nothing recorded for this day."}
              </p>
            ) : (
              <ul className="space-y-2">
                {selected.items.map((item) => (
                  <li
                    key={`${item.kind}-${item.id}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="mt-0.5 text-accent">
                      <HabitIcon iconKey={item.icon} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground">
                        <span className="text-faint">
                          {item.kind === "habit" ? "Habit: " : "Goal: "}
                        </span>
                        {item.title}
                      </p>
                      <p className="text-xs text-muted">
                        {item.status === "completed" && item.completedAtLabel
                          ? `Completed at ${item.completedAtLabel}`
                          : item.status === "completed"
                            ? "Completed"
                            : item.status === "upcoming"
                              ? "Scheduled"
                              : item.status === "open"
                                ? "Not completed yet"
                                : "Not completed"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg-elevated/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-0.5 text-lg font-medium text-foreground">{value}</p>
      <p className="text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function ToneMark({
  tone,
  inMonth,
}: {
  tone: CalendarDay["tone"];
  inMonth: boolean;
}) {
  if (!inMonth || tone === "empty") return null;
  const mark =
    tone === "complete"
      ? "✓"
      : tone === "miss"
        ? "×"
        : tone === "upcoming"
          ? "·"
          : tone === "partial"
            ? "∼"
            : "•";
  const color =
    tone === "complete"
      ? "text-success"
      : tone === "miss"
        ? "text-danger"
        : tone === "upcoming"
          ? "text-accent"
          : "text-muted";
  return <span className={`text-xs ${color}`}>{mark}</span>;
}
