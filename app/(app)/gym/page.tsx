"use client";

import { useState } from "react";
import { useGym } from "@/contexts/GymContext";
import { Button } from "@/components/ui/Button";
import { GymOverview } from "@/components/gym/GymOverview";
import { GymTodayPanel } from "@/components/gym/GymTodayPanel";
import { GymExercisesPanel } from "@/components/gym/GymExercisesPanel";
import { GymTemplatesPanel } from "@/components/gym/GymTemplatesPanel";
import { GymAbsencesPanel } from "@/components/gym/GymAbsencesPanel";
import { GymHistoryPanel } from "@/components/gym/GymHistoryPanel";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "today", label: "Today" },
  { id: "exercises", label: "Exercises" },
  { id: "templates", label: "Templates" },
  { id: "breaks", label: "Breaks" },
  { id: "history", label: "History" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function GymPage() {
  const { loading, error, refresh } = useGym();
  const [section, setSection] = useState<SectionId>("overview");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Gym
        </h1>
        <p className="text-sm text-muted">
          Weekly workouts, progressive lifts, and streak tracking.
        </p>
      </div>

      <nav
        className="flex flex-wrap gap-1 border-b border-border pb-px"
        aria-label="Gym sections"
      >
        {SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={[
                "rounded-t-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border border-b-0 border-border bg-bg-elevated text-foreground"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              {s.label}
            </button>
          );
        })}
      </nav>

      {loading ? <p className="text-sm text-muted">Loading gym…</p> : null}

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

      {!loading && !error ? (
        <>
          {section === "overview" ? (
            <GymOverview onGoToday={() => setSection("today")} />
          ) : null}
          {section === "today" ? <GymTodayPanel /> : null}
          {section === "exercises" ? <GymExercisesPanel /> : null}
          {section === "templates" ? <GymTemplatesPanel /> : null}
          {section === "breaks" ? <GymAbsencesPanel /> : null}
          {section === "history" ? <GymHistoryPanel /> : null}
        </>
      ) : null}
    </div>
  );
}
