export const DAY_PART_KEYS = [
  "dawning",
  "morning",
  "noon",
  "afternoon",
  "dinner",
  "evening",
  "night",
] as const;

export type DayPartKey = (typeof DAY_PART_KEYS)[number];

export type DayPeriod = {
  key: DayPartKey;
  label: string;
  /** Minutes from local midnight [0, 1440). */
  startMinutes: number;
  /** Minutes from local midnight [0, 1440). May be <= start for Night wrap. */
  endMinutes: number;
};

export type NotificationPrefs = {
  enabled: boolean;
  gymNags: boolean;
  habitsGoalsNags: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: true,
  gymNags: true,
  habitsGoalsNags: true,
};

export type UserProfile = {
  displayName: string;
  email: string;
  createdAt: unknown;
  dayPeriods: DayPeriod[];
  currentStreak: number;
  longestStreak: number;
  lastResolvedLocalDate: string | null;
  timezone: string;
  notificationPrefs: NotificationPrefs;
};

export const DAY_PART_LABELS: Record<DayPartKey, string> = {
  dawning: "Dawning",
  morning: "Morning",
  noon: "Noon",
  afternoon: "Afternoon",
  dinner: "Dinner",
  evening: "Evening",
  night: "Night",
};
