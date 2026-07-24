const RECENT_KEY = "diligence.letterboxd.recent";
const MAX_RECENT = 5;

export type RecentLetterboxdUrl = {
  url: string;
  label: string;
  usedAt: number;
};

export function loadRecentUrls(): RecentLetterboxdUrl[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentLetterboxdUrl =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as RecentLetterboxdUrl).url === "string" &&
          typeof (item as RecentLetterboxdUrl).label === "string" &&
          typeof (item as RecentLetterboxdUrl).usedAt === "number",
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberUrl(
  url: string,
  label: string,
  existing: RecentLetterboxdUrl[] = loadRecentUrls(),
): RecentLetterboxdUrl[] {
  const next: RecentLetterboxdUrl[] = [
    { url, label, usedAt: Date.now() },
    ...existing.filter((item) => item.url !== url),
  ].slice(0, MAX_RECENT);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  }
  return next;
}
