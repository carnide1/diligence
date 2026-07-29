"use client";

import { useMemo } from "react";
import { formatPeriodRange } from "@/lib/dayPeriods";
import { groupByDayPart } from "@/lib/groupByDayPart";
import { useUserProfile } from "@/contexts/UserProfileContext";
import type { DayPartKey } from "@/types/user";

type WithDayPart = { dayPart: DayPartKey };

/** Group items by day part and build range labels from the user profile. */
export function useDayPartGroups<T extends WithDayPart>(items: T[]) {
  const { profile } = useUserProfile();

  const groups = useMemo(() => {
    const labels = Object.fromEntries(
      (profile?.dayPeriods ?? []).map((p) => [p.key, p.label]),
    );
    return groupByDayPart(items, labels);
  }, [items, profile?.dayPeriods]);

  const rangeByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const period of profile?.dayPeriods ?? []) {
      map.set(period.key, formatPeriodRange(period));
    }
    return map;
  }, [profile?.dayPeriods]);

  return { groups, rangeByKey, profile };
}
