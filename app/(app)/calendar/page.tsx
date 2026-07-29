"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flag, Repeat } from "lucide-react";
import { setMonth, setYear } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { listHabits, listAllHabitCompletions } from "@/lib/habits";
import { listGoalsForStreak, listAllGoalCompletions } from "@/lib/goals";
import {
  buildCalendarDays,
  shiftMonth,
  summarizeMonth,
  type CalendarDay,
} from "@/lib/calendarData";
import { toLocalDateString } from "@/lib/dates";
import { toErrorMessage } from "@/lib/errors";
import { HabitIcon } from "@/components/icons/HabitIcon";
import { CalendarSummaryChip } from "@/components/calendar/CalendarSummaryChip";
import { CalendarMonthNav } from "@/components/calendar/CalendarMonthNav";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarDayModal } from "@/components/calendar/CalendarDayModal";
import type { Habit } from "@/types/habit";
import type { Goal } from "@/types/goal";
import type { HabitCompletion } from "@/types/habit";
import type { GoalCompletion } from "@/types/goal";

export default function CalendarPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [anchor, setAnchor] = useState(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const monthPickerRef = useRef<HTMLDivElement>(null);
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
            setError(toErrorMessage(err, "Failed to load"));
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

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        monthPickerRef.current &&
        !monthPickerRef.current.contains(event.target as Node)
      ) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [pickerOpen]);

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

  const openPicker = () => {
    setPickerYear(anchor.getFullYear());
    setPickerOpen((open) => !open);
  };

  const selectMonth = (monthIndex: number) => {
    setAnchor(setMonth(setYear(anchor, pickerYear), monthIndex));
    setPickerOpen(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Calendar
        </h1>
        <CalendarMonthNav
          anchor={anchor}
          pickerOpen={pickerOpen}
          pickerYear={pickerYear}
          monthPickerRef={monthPickerRef}
          onPrevMonth={() => {
            setAnchor((d) => shiftMonth(d, -1));
            setPickerOpen(false);
          }}
          onNextMonth={() => {
            setAnchor((d) => shiftMonth(d, 1));
            setPickerOpen(false);
          }}
          onTogglePicker={openPicker}
          onPickerYearChange={setPickerYear}
          onSelectMonth={selectMonth}
          onGoToday={() => {
            const now = new Date();
            setAnchor(now);
            setPickerYear(now.getFullYear());
            setPickerOpen(false);
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CalendarSummaryChip
          label="Habit rate"
          value={`${summary.habitRate}%`}
          hint={`${summary.habitCompleted}/${summary.habitScheduled}`}
        />
        <CalendarSummaryChip
          label="Goal clears"
          value={`${summary.goalClearDays}`}
          hint={`${summary.daysWithGoals} days w/ goals`}
        />
        <CalendarSummaryChip
          label="Goal streak"
          value={`${summary.currentGoalStreak}`}
          hint={`Best ${summary.longestGoalStreak}`}
        />
        <CalendarSummaryChip
          label="Best habit"
          value={`${summary.bestHabitStreak}`}
          hint="Longest habit streak"
        />
      </div>

      {loading ? <p className="text-sm text-muted">Loading calendar…</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <CalendarGrid
        days={days}
        selected={selected}
        onSelectDay={setSelected}
        onHoverDay={setHovered}
        onLeaveDay={() => setHovered(null)}
      />

      {hovered && !selected ? (
        <div className="hidden rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-3 md:block">
          <p className="text-xs text-faint">{hovered.localDate}</p>
          {hovered.items.length === 0 ? (
            <p className="mt-1 text-sm text-muted">No items</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {hovered.items.slice(0, 4).map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <span className="text-accent">
                    <HabitIcon iconKey={item.icon} size={18} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <span className="shrink-0 text-faint">
                    {item.kind === "habit" ? (
                      <Repeat size={14} />
                    ) : (
                      <Flag size={14} />
                    )}
                  </span>
                  <span className="shrink-0 text-muted">
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

      <CalendarDayModal
        selected={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
