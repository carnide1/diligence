"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  adjustPeriodEnd,
  adjustPeriodStart,
  labelToMinutes,
  validateDayPeriods,
} from "@/lib/dayPeriods";
import { toErrorMessage } from "@/lib/errors";
import { useUserProfile } from "@/contexts/UserProfileContext";
import type { DayPartKey, DayPeriod } from "@/types/user";

type UseDayPeriodsDraftOptions = {
  /** When true, copy profile periods into draft whenever `active` is true. */
  seedOnActivate?: boolean;
  /** Controls seeding / whether edits are allowed (e.g. modal open). */
  active?: boolean;
};

export function useDayPeriodsDraft(options: UseDayPeriodsDraftOptions = {}) {
  const { seedOnActivate = false, active = true } = options;
  const { profile, saveDayPeriods } = useUserProfile();
  const [draft, setDraft] = useState<DayPeriod[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!seedOnActivate || !active || !profile) return;
    const timer = setTimeout(() => {
      setDraft(profile.dayPeriods.map((p) => ({ ...p })));
    }, 0);
    return () => clearTimeout(timer);
  }, [seedOnActivate, active, profile]);

  const periods = useMemo(
    () => draft ?? profile?.dayPeriods ?? [],
    [draft, profile?.dayPeriods],
  );
  const dirty = draft !== null;

  const applyChange = useCallback(
    (result: DayPeriod[] | { error: string }): boolean => {
      if ("error" in result) {
        toast.error(result.error);
        return false;
      }
      setDraft(result);
      return true;
    },
    [],
  );

  const onStartChange = useCallback(
    (key: DayPartKey, value: string) => {
      const minutes = labelToMinutes(value);
      if (minutes === null) return;
      applyChange(adjustPeriodStart(periods, key, minutes));
    },
    [applyChange, periods],
  );

  const onEndChange = useCallback(
    (key: DayPartKey, value: string) => {
      const minutes = labelToMinutes(value);
      if (minutes === null) return;
      applyChange(adjustPeriodEnd(periods, key, minutes));
    },
    [applyChange, periods],
  );

  const reset = useCallback(() => setDraft(null), []);

  const save = useCallback(
    async (successMessage = "Day periods saved") => {
      const error = validateDayPeriods(periods);
      if (error) {
        toast.error(error);
        return false;
      }
      setSaving(true);
      try {
        await saveDayPeriods(periods);
        setDraft(null);
        toast.success(successMessage);
        return true;
      } catch (err) {
        toast.error(toErrorMessage(err, "Save failed"));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [periods, saveDayPeriods],
  );

  return {
    profile,
    periods,
    dirty,
    saving,
    onStartChange,
    onEndChange,
    reset,
    save,
  };
}
