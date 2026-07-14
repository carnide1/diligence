import {
  addDays,
  format,
  getDay,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns";

/** Device-local calendar date as YYYY-MM-DD. */
export function toLocalDateString(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export function parseLocalDate(localDate: string): Date {
  return parseISO(localDate);
}

export function addLocalDays(localDate: string, amount: number): string {
  return toLocalDateString(addDays(parseLocalDate(localDate), amount));
}

export function yesterdayLocalDate(today = toLocalDateString()): string {
  return addLocalDays(today, -1);
}

/** Sunday–Saturday week containing localDate. */
export function weekBounds(localDate: string): { start: string; end: string } {
  const start = startOfWeek(parseLocalDate(localDate), { weekStartsOn: 0 });
  return {
    start: toLocalDateString(start),
    end: toLocalDateString(addDays(start, 6)),
  };
}

export function dayOfWeek(localDate: string): number {
  return getDay(parseLocalDate(localDate));
}

export function isSaturday(localDate: string): boolean {
  return dayOfWeek(localDate) === 6;
}

export function compareLocalDates(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Inclusive list from start through end. */
export function eachLocalDate(start: string, end: string): string[] {
  if (compareLocalDates(start, end) > 0) return [];
  const out: string[] = [];
  let cursor = start;
  while (compareLocalDates(cursor, end) <= 0) {
    out.push(cursor);
    cursor = addLocalDays(cursor, 1);
  }
  return out;
}

export function datesBefore(localDate: string, exclusiveEnd: string): string[] {
  return eachLocalDate(localDate, addLocalDays(exclusiveEnd, -1));
}

export { subDays };
