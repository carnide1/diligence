/** Sunday-first weekday labels (JS Date.getDay() order). */
export const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((label, value) => ({
  value,
  label,
}));
