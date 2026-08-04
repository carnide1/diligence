"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDateString } from "@/lib/dates";
import { toErrorMessage } from "@/lib/errors";
import {
  archiveExercise,
  completeDailySession,
  createAbsence,
  createExercise,
  createTemplate,
  deleteTemplate,
  getSessionForDate,
  listAbsences,
  listExercises,
  listSessions,
  listTemplates,
  refreshGymStreaks,
  saveDailyPlan,
  updateExercise,
  updateTemplate,
} from "@/lib/gym";
import { gymWeekBounds, requiredWorkoutsForWeek, weekAtRisk } from "@/lib/gymWeek";
import type {
  GymAbsence,
  GymAbsenceInput,
  GymExercise,
  GymExerciseInput,
  GymSession,
  GymSessionCompleteInput,
  GymSessionPlanInput,
  GymStats,
  GymTemplate,
  GymTemplateInput,
} from "@/types/gym";

type GymContextValue = {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  exercises: GymExercise[];
  templates: GymTemplate[];
  absences: GymAbsence[];
  stats: GymStats;
  todaySession: GymSession | null;
  weekAcceptedCount: number;
  weekRequired: number;
  weekAtRiskFlag: boolean;
  addExercise: (input: GymExerciseInput) => Promise<void>;
  editExercise: (id: string, input: GymExerciseInput) => Promise<void>;
  removeExercise: (id: string) => Promise<void>;
  addTemplate: (input: GymTemplateInput) => Promise<void>;
  editTemplate: (id: string, input: GymTemplateInput) => Promise<void>;
  removeTemplate: (id: string) => Promise<void>;
  planToday: (input: Omit<GymSessionPlanInput, "localDate">) => Promise<void>;
  completeToday: (input: GymSessionCompleteInput) => Promise<GymSession>;
  addAbsence: (input: GymAbsenceInput) => Promise<void>;
  recentSessions: GymSession[];
};

const GymContext = createContext<GymContextValue | null>(null);

export function GymProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<GymExercise[]>([]);
  const [templates, setTemplates] = useState<GymTemplate[]>([]);
  const [absences, setAbsences] = useState<GymAbsence[]>([]);
  const [stats, setStats] = useState<GymStats>({
    currentStreak: 0,
    longestStreak: 0,
    lastResolvedWeekId: null,
  });
  const [todaySession, setTodaySession] = useState<GymSession | null>(null);
  const [recentSessions, setRecentSessions] = useState<GymSession[]>([]);
  const [weekAcceptedCount, setWeekAcceptedCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setExercises([]);
      setTemplates([]);
      setAbsences([]);
      setTodaySession(null);
      setRecentSessions([]);
      setWeekAcceptedCount(0);
      setStats({
        currentStreak: 0,
        longestStreak: 0,
        lastResolvedWeekId: null,
      });
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const today = toLocalDateString();
      const { start, end } = gymWeekBounds(today);
      const [ex, tpl, abs, nextStats, todaySess, sessions] = await Promise.all([
        listExercises(user.uid),
        listTemplates(user.uid),
        listAbsences(user.uid),
        refreshGymStreaks(user.uid, today),
        getSessionForDate(user.uid, today),
        listSessions(user.uid, { from: start, to: end }),
      ]);
      setExercises(ex);
      setTemplates(tpl);
      setAbsences(abs);
      setStats(nextStats);
      setTodaySession(todaySess);
      setRecentSessions(sessions);
      setWeekAcceptedCount(
        sessions.filter((s) => s.status === "accepted").length,
      );
    } catch (err) {
      console.error(err);
      setError(toErrorMessage(err, "Failed to load gym data"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const weekRequired = useMemo(
    () => requiredWorkoutsForWeek(absences, toLocalDateString()),
    [absences],
  );

  const weekAtRiskFlag = useMemo(
    () =>
      weekAtRisk({
        acceptedCount: weekAcceptedCount,
        required: weekRequired,
        localDate: toLocalDateString(),
        completedToday: todaySession?.status === "accepted",
      }),
    [weekAcceptedCount, weekRequired, todaySession?.status],
  );

  const addExercise = useCallback(
    async (input: GymExerciseInput) => {
      if (!user) throw new Error("Sign in required");
      await createExercise(user.uid, input);
      await refresh();
    },
    [user, refresh],
  );

  const editExercise = useCallback(
    async (id: string, input: GymExerciseInput) => {
      if (!user) throw new Error("Sign in required");
      const previous = exercises.find((e) => e.id === id);
      await updateExercise(user.uid, id, input, {
        previousLocation: previous?.location,
      });
      await refresh();
    },
    [user, refresh, exercises],
  );

  const removeExercise = useCallback(
    async (id: string) => {
      if (!user) throw new Error("Sign in required");
      await archiveExercise(user.uid, id);
      await refresh();
    },
    [user, refresh],
  );

  const addTemplate = useCallback(
    async (input: GymTemplateInput) => {
      if (!user) throw new Error("Sign in required");
      await createTemplate(user.uid, input);
      await refresh();
    },
    [user, refresh],
  );

  const editTemplate = useCallback(
    async (id: string, input: GymTemplateInput) => {
      if (!user) throw new Error("Sign in required");
      await updateTemplate(user.uid, id, input);
      await refresh();
    },
    [user, refresh],
  );

  const removeTemplate = useCallback(
    async (id: string) => {
      if (!user) throw new Error("Sign in required");
      await deleteTemplate(user.uid, id);
      await refresh();
    },
    [user, refresh],
  );

  const planToday = useCallback(
    async (input: Omit<GymSessionPlanInput, "localDate">) => {
      if (!user) throw new Error("Sign in required");
      await saveDailyPlan(user.uid, {
        ...input,
        localDate: toLocalDateString(),
      });
      await refresh();
    },
    [user, refresh],
  );

  const completeToday = useCallback(
    async (input: GymSessionCompleteInput) => {
      if (!user) throw new Error("Sign in required");
      if (!todaySession) throw new Error("Save a plan first");
      const result = await completeDailySession(
        user.uid,
        todaySession.id,
        input,
      );
      await refresh();
      return result;
    },
    [user, todaySession, refresh],
  );

  const addAbsence = useCallback(
    async (input: GymAbsenceInput) => {
      if (!user) throw new Error("Sign in required");
      await createAbsence(user.uid, input);
      await refresh();
    },
    [user, refresh],
  );

  const value = useMemo(
    () => ({
      loading,
      error,
      refresh,
      exercises,
      templates,
      absences,
      stats,
      todaySession,
      weekAcceptedCount,
      weekRequired,
      weekAtRiskFlag,
      addExercise,
      editExercise,
      removeExercise,
      addTemplate,
      editTemplate,
      removeTemplate,
      planToday,
      completeToday,
      addAbsence,
      recentSessions,
    }),
    [
      loading,
      error,
      refresh,
      exercises,
      templates,
      absences,
      stats,
      todaySession,
      weekAcceptedCount,
      weekRequired,
      weekAtRiskFlag,
      addExercise,
      editExercise,
      removeExercise,
      addTemplate,
      editTemplate,
      removeTemplate,
      planToday,
      completeToday,
      addAbsence,
      recentSessions,
    ],
  );

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
}

export function useGym(): GymContextValue {
  const ctx = useContext(GymContext);
  if (!ctx) throw new Error("useGym must be used within GymProvider");
  return ctx;
}
