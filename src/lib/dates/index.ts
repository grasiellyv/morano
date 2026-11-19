import { TZDate } from "@date-fns/tz";
import { addDays, format, parseISO } from "date-fns";

/**
 * Returns "yyyy-MM-dd" for the current day in the given timezone.
 * Uses TZDate from @date-fns/tz v1 to shift to the correct local wall-clock day.
 */
export function getLocalDateString(timezone: string): string {
  return format(new TZDate(new Date(), timezone), "yyyy-MM-dd");
}

/**
 * Adds N days to a "yyyy-MM-dd" string and returns the result as "yyyy-MM-dd".
 */
export function addDaysStr(date: string, days: number): string {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}
