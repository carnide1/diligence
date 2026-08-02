"use client";

import { useGym } from "@/contexts/GymContext";
import type { GymSessionStatus } from "@/types/gym";

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

export function GymHistoryPanel() {
  const { recentSessions } = useGym();

  if (recentSessions.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-8 text-center text-sm text-muted">
        No sessions this week yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">Sessions in the current gym week.</p>
      <ul className="flex flex-col gap-3">
        {recentSessions.map((s) => {
          const count =
            s.actualExercises?.length ?? s.plannedExercises.length;
          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{s.localDate}</p>
                <p className="mt-1 text-xs text-faint">
                  {count} exercise{count === 1 ? "" : "s"}
                </p>
              </div>
              <span
                className={[
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                  statusClass(s.status),
                ].join(" ")}
              >
                {statusLabel(s.status)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
