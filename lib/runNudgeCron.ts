import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  decideNudge,
  localPartsInTimezone,
  type NudgeUserSnapshot,
} from "@/lib/nudgeDecide";
import { sendNudgeEmail } from "@/lib/sendNudgeEmail";
import { gymWeekBounds, requiredWorkoutsForWeek } from "@/lib/gymWeek";
import { weekBounds } from "@/lib/dates";
import { isWithinActiveRange } from "@/lib/activeRange";
import { isHabitDueOn, parseHabitSchedule } from "@/lib/habitSchedule";
import { DEFAULT_NOTIFICATION_PREFS } from "@/types/user";
import type { NotificationPrefs } from "@/types/user";

function prefsFrom(data: Record<string, unknown>): NotificationPrefs {
  const raw = data.notificationPrefs;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NOTIFICATION_PREFS };
  const o = raw as Record<string, unknown>;
  return {
    enabled: o.enabled !== false,
    gymNags: o.gymNags !== false,
    habitsGoalsNags: o.habitsGoalsNags !== false,
  };
}

async function sentCountToday(
  uid: string,
  localDate: string,
): Promise<number> {
  const snap = await getAdminDb()
    .collection("users")
    .doc(uid)
    .collection("notificationLog")
    .doc(localDate)
    .get();
  if (!snap.exists) return 0;
  const count = snap.data()?.count;
  return typeof count === "number" ? count : 0;
}

async function recordSend(
  uid: string,
  localDate: string,
  reasons: string[],
): Promise<void> {
  const ref = getAdminDb()
    .collection("users")
    .doc(uid)
    .collection("notificationLog")
    .doc(localDate);
  await ref.set(
    {
      count: FieldValue.increment(1),
      lastReasons: reasons,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function buildSnapshot(
  uid: string,
  data: Record<string, unknown>,
  now: Date,
): Promise<NudgeUserSnapshot | null> {
  const email = typeof data.email === "string" ? data.email : "";
  if (!email) return null;

  const timezone =
    typeof data.timezone === "string" && data.timezone
      ? data.timezone
      : "UTC";
  const { localDate, localHour } = localPartsInTimezone(timezone, now);
  const prefs = prefsFrom(data);
  const sentToday = await sentCountToday(uid, localDate);

  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const habitWeek = weekBounds(localDate);

  const [
    habitsSnap,
    goalsSnap,
    weekHabitCompletionsSnap,
    goalCompletionsSnap,
    sessionsSnap,
    absencesSnap,
  ] = await Promise.all([
    userRef.collection("habits").get(),
    userRef.collection("goals").get(),
    userRef
      .collection("habitCompletions")
      .where("localDate", ">=", habitWeek.start)
      .where("localDate", "<=", habitWeek.end)
      .get(),
    userRef
      .collection("goalCompletions")
      .where("localDate", "==", localDate)
      .get(),
    userRef.collection("gymSessions").get(),
    userRef.collection("gymAbsences").get(),
  ]);

  const weekCompletionCounts = new Map<string, number>();
  const completedHabitIdsToday = new Set<string>();
  for (const d of weekHabitCompletionsSnap.docs) {
    const habitId = String(d.data().habitId || "");
    const completionDate = String(d.data().localDate || "");
    if (!habitId) continue;
    weekCompletionCounts.set(
      habitId,
      (weekCompletionCounts.get(habitId) ?? 0) + 1,
    );
    if (completionDate === localDate) {
      completedHabitIdsToday.add(habitId);
    }
  }

  const completedGoalIds = new Set(
    goalCompletionsSnap.docs.map((d) => String(d.data().goalId)),
  );

  const overdueHabitTitles: string[] = [];
  for (const d of habitsSnap.docs) {
    const h = d.data();
    if (h.deletedAt || h.paused) continue;
    if (completedHabitIdsToday.has(d.id)) continue;

    const due = isHabitDueOn(
      {
        schedule: parseHabitSchedule(h.schedule),
        paused: Boolean(h.paused),
        activeStartLocalDate:
          typeof h.activeStartLocalDate === "string"
            ? h.activeStartLocalDate
            : null,
        activeEndLocalDate:
          typeof h.activeEndLocalDate === "string"
            ? h.activeEndLocalDate
            : null,
      },
      localDate,
      weekCompletionCounts.get(d.id) ?? 0,
    );
    if (!due) continue;
    overdueHabitTitles.push(String(h.title || "Habit"));
  }

  const overdueGoalTitles: string[] = [];
  for (const d of goalsSnap.docs) {
    const g = d.data();
    if (g.status === "deleted" || g.status === "completed") continue;
    if (
      !isWithinActiveRange(
        localDate,
        typeof g.activeStartLocalDate === "string"
          ? g.activeStartLocalDate
          : null,
        typeof g.activeEndLocalDate === "string" ? g.activeEndLocalDate : null,
      )
    ) {
      continue;
    }
    if (!completedGoalIds.has(d.id)) {
      overdueGoalTitles.push(String(g.title || "Goal"));
    }
  }

  const absences = absencesSnap.docs.map((d) => {
    const a = d.data();
    return {
      startLocalDate: String(a.startLocalDate || ""),
      endLocalDate: String(a.endLocalDate || ""),
    };
  });
  const weekRequired = requiredWorkoutsForWeek(absences, localDate);
  const { start, end } = gymWeekBounds(localDate);

  const sessions = sessionsSnap.docs.map((d) => {
    const s = d.data();
    return {
      localDate: String(s.localDate || ""),
      status: String(s.status || "planned"),
    };
  });

  const weekAccepted = sessions.filter(
    (s) =>
      s.status === "accepted" &&
      s.localDate >= start &&
      s.localDate <= end,
  ).length;

  const todaySessions = sessions.filter((s) => s.localDate === localDate);
  let todayStatus: "none" | "planned" | "accepted" | "rejected" = "none";
  if (todaySessions.some((s) => s.status === "accepted")) todayStatus = "accepted";
  else if (todaySessions.some((s) => s.status === "planned"))
    todayStatus = "planned";
  else if (todaySessions.some((s) => s.status === "rejected"))
    todayStatus = "rejected";

  const weekNeedsWork = weekRequired > 0 && weekAccepted < weekRequired;

  return {
    uid,
    email,
    displayName: typeof data.displayName === "string" ? data.displayName : "",
    timezone,
    prefs,
    localHour,
    localDate,
    sentToday,
    overdueHabitTitles,
    overdueGoalTitles,
    gym: {
      weekNeedsWork,
      weekAccepted,
      weekRequired,
      todayStatus,
    },
  };
}

export async function runNudgeCron(now = new Date()): Promise<{
  checked: number;
  sent: number;
  errors: string[];
}> {
  const db = getAdminDb();
  const usersSnap = await db.collection("users").get();
  let sent = 0;
  const errors: string[] = [];

  for (const doc of usersSnap.docs) {
    try {
      const snap = await buildSnapshot(
        doc.id,
        doc.data() as Record<string, unknown>,
        now,
      );
      if (!snap) continue;
      const email = decideNudge(snap);
      if (!email) continue;
      await sendNudgeEmail(email);
      await recordSend(doc.id, snap.localDate, email.reasons);
      sent += 1;
    } catch (err) {
      errors.push(
        `${doc.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { checked: usersSnap.size, sent, errors };
}
