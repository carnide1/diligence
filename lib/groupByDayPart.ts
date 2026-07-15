import { DAY_PART_KEYS, DAY_PART_LABELS, type DayPartKey } from "@/types/user";

export type DayPartGroup<T> = {
  key: DayPartKey;
  label: string;
  items: T[];
};

/** Groups items by `dayPart` in canonical day-period order. Skips empty groups. */
export function groupByDayPart<T extends { dayPart: DayPartKey }>(
  items: T[],
  labels?: Partial<Record<DayPartKey, string>>,
): DayPartGroup<T>[] {
  return DAY_PART_KEYS.map((key) => ({
    key,
    label: labels?.[key] ?? DAY_PART_LABELS[key],
    items: items.filter((item) => item.dayPart === key),
  })).filter((group) => group.items.length > 0);
}
