"use client";

import { useGym } from "@/contexts/GymContext";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/StatTile";

type GymOverviewProps = {
  onGoToday: () => void;
};

function todayStatusLabel(
  status: "planned" | "accepted" | "rejected" | undefined,
): string {
  if (!status) return "None";
  if (status === "accepted") return "Completed";
  if (status === "planned") return "Planned";
  return "Rejected";
}

function statusChipClass(status: string): string {
  if (status === "Completed") return "bg-success-soft text-success";
  if (status === "Planned") return "bg-accent-soft text-accent";
  if (status === "Rejected") return "bg-danger-soft text-danger";
  return "bg-bg-overlay text-faint";
}

export function GymOverview({ onGoToday }: GymOverviewProps) {
  const {
    stats,
    weekAcceptedCount,
    weekRequired,
    weekAtRiskFlag,
    todaySession,
  } = useGym();

  const statusLabel = todayStatusLabel(todaySession?.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Current streak" value={stats.currentStreak} />
        <StatTile label="Longest streak" value={stats.longestStreak} />
        <StatTile
          label="This week"
          value={`${weekAcceptedCount}/${weekRequired}`}
        />
        <StatTile label="Today" value={statusLabel} />
      </div>

      {weekAtRiskFlag ? (
        <div className="rounded-[var(--radius)] border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          This week is at risk — you need more accepted workouts before Sunday.
        </div>
      ) : null}

      <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Today&apos;s session</p>
            <span
              className={[
                "inline-block rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                statusChipClass(statusLabel),
              ].join(" ")}
            >
              {statusLabel}
            </span>
          </div>
          <Button onClick={onGoToday}>
            {todaySession?.status === "accepted"
              ? "View today"
              : todaySession?.status === "planned"
                ? "Complete workout"
                : "Plan today"}
          </Button>
        </div>
      </div>
    </div>
  );
}
