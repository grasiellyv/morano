import { addDaysStr } from "@/lib/dates";

export const RETROACTIVE_WINDOW_DAYS = 30;
export const RETROACTIVE_OCCURRENCE_LIMIT = 3;

export interface RetroactivePolicyResult {
  toInsert: string[];       // dates to persist (at most RETROACTIVE_OCCURRENCE_LIMIT)
  ungeneratedCount: number; // dates intentionally not inserted
}

/**
 * Given all retroactive candidate dates (sorted asc, all before today),
 * applies the 30-day window cap and 3-occurrence limit.
 * Does NOT filter future dates — callers pass only past dates.
 */
export function applyRetroactivePolicy(
  retrodates: string[],  // sorted asc "yyyy-MM-dd", all < today
  today: string,         // "yyyy-MM-dd"
): RetroactivePolicyResult {
  const windowStart = addDaysStr(today, -RETROACTIVE_WINDOW_DAYS);

  const beforeWindow: string[] = [];
  const inWindow: string[] = [];

  for (const date of retrodates) {
    if (date < windowStart) {
      beforeWindow.push(date);
    } else {
      inWindow.push(date);
    }
  }

  const clamped = inWindow.slice(-RETROACTIVE_OCCURRENCE_LIMIT);

  return {
    toInsert: clamped,
    ungeneratedCount: beforeWindow.length + (inWindow.length - clamped.length),
  };
}
