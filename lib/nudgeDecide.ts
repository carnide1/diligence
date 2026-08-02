import {
  addLocalDays,
  compareLocalDates,
  toLocalDateString,
} from "@/lib/dates";
import { weekAtRisk } from "@/lib/gymWeek";
import { WEEKLY_WORKOUT_TARGET } from "@/types/gym";
import type { NotificationPrefs } from "@/types/user";

export const NAG_HOURS = [8, 12, 17] as const;
export const MAX_NAGS_PER_DAY = 3;

export type NudgeUserSnapshot = {
  uid: string;
  email: string;
  displayName: string;
  timezone: string;
  prefs: NotificationPrefs;
  localHour: number;
  localDate: string;
  /** Emails already sent today for this user. */
  sentToday: number;
  overdueHabitTitles: string[];
  overdueGoalTitles: string[];
  gym: {
    weekNeedsWork: boolean;
    weekAccepted: number;
    weekRequired: number;
    todayStatus: "none" | "planned" | "accepted" | "rejected";
  } | null;
};

export type NudgeEmail = {
  to: string;
  subject: string;
  text: string;
  reasons: string[];
};

function isQuietHour(hour: number): boolean {
  return hour >= 21 || hour < 7;
}

/**
 * Hobby Vercel only allows 1 cron/day, so we do not require specific local
 * hours for production sends. Quiet hours still suppress overnight noise.
 * Manual curls during the day still work the same.
 */
export function decideNudge(snap: NudgeUserSnapshot): NudgeEmail | null {
  if (!snap.prefs.enabled) return null;
  if (!snap.email.trim()) return null;
  if (snap.sentToday >= MAX_NAGS_PER_DAY) return null;
  if (isQuietHour(snap.localHour)) return null;

  const reasons: string[] = [];
  const lines: string[] = [];

  const name = snap.displayName.trim() || "there";

  if (snap.prefs.habitsGoalsNags) {
    if (snap.overdueHabitTitles.length) {
      reasons.push("overdue_habits");
      lines.push(
        `Habits still open today (${snap.overdueHabitTitles.length}):`,
      );
      for (const t of snap.overdueHabitTitles.slice(0, 8)) {
        lines.push(`  • ${t}`);
      }
    }
    if (snap.overdueGoalTitles.length) {
      reasons.push("overdue_goals");
      lines.push(
        `Goals still open today (${snap.overdueGoalTitles.length}):`,
      );
      for (const t of snap.overdueGoalTitles.slice(0, 8)) {
        lines.push(`  • ${t}`);
      }
    }
  }

  if (snap.prefs.gymNags && snap.gym && snap.gym.weekNeedsWork) {
    const g = snap.gym;
    const completedToday = g.todayStatus === "accepted";
    const atRisk = weekAtRisk({
      acceptedCount: g.weekAccepted,
      required: g.weekRequired,
      localDate: snap.localDate,
      completedToday,
    });

    if (g.todayStatus === "none") {
      reasons.push("gym_no_plan");
      lines.push(
        `Gym: no plan submitted today (${g.weekAccepted}/${g.weekRequired} this week). Submit a plan and go.`,
      );
    } else if (g.todayStatus === "planned" || g.todayStatus === "rejected") {
      reasons.push("gym_incomplete");
      lines.push(
        g.todayStatus === "rejected"
          ? "Gym: today's session was rejected — fix actuals and resubmit."
          : "Gym: plan is in — log actuals when you're done so it counts.",
      );
    }

    if (atRisk) {
      reasons.push("gym_week_at_risk");
      lines.push(
        `Gym week at risk: ${g.weekAccepted}/${g.weekRequired} accepted with limited days left.`,
      );
    }
  }

  if (reasons.length === 0) return null;

  const subjectParts: string[] = [];
  if (reasons.includes("gym_week_at_risk")) subjectParts.push("Gym week at risk");
  else if (reasons.includes("gym_no_plan")) subjectParts.push("Gym plan missing");
  else if (reasons.includes("gym_incomplete")) subjectParts.push("Finish gym log");
  if (reasons.includes("overdue_habits") || reasons.includes("overdue_goals")) {
    subjectParts.push("Overdue today");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://diligence.app";
  const text = [
    `Hey ${name},`,
    "",
    ...lines,
    "",
    `Open Diligence: ${appUrl}/today`,
    `Gym: ${appUrl}/gym`,
    "",
    "— Diligence",
  ].join("\n");

  return {
    to: snap.email,
    subject: `Diligence: ${subjectParts.join(" · ") || "Reminder"}`,
    text,
    reasons,
  };
}

/** Local YYYY-MM-DD and hour in an IANA timezone. */
export function localPartsInTimezone(
  timeZone: string,
  now = new Date(),
): { localDate: string; localHour: number } {
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hourFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  });
  const localDate = dateFmt.format(now); // en-CA → YYYY-MM-DD
  const hourRaw = hourFmt.format(now);
  // hour12:false can still yield "24" in some engines for midnight
  let localHour = Number.parseInt(hourRaw, 10);
  if (localHour === 24) localHour = 0;
  return { localDate, localHour };
}

export function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// Re-export helpers useful for tests
export { WEEKLY_WORKOUT_TARGET, toLocalDateString, addLocalDays, compareLocalDates };
