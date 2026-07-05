import type { DayForecast, HourForecast } from "./types.ts";

/**
 * Godziny do paska "Najbliższe godziny": dziś od bieżącej godziny;
 * jeśli zostało < 6 wpisów, doklej początek jutra. Maks. 24 wpisy.
 */
export function upcomingHours(
  days: DayForecast[],
  todayDate: string,
  currentHour: number,
): HourForecast[] {
  const todayIdx = days.findIndex((d) => d.date === todayDate);
  if (todayIdx === -1) return days[0]?.hours ?? [];

  const today = days[todayIdx];
  const result = today.hours.filter((h) => {
    const hour = parseInt(h.time.slice(11, 13), 10);
    return hour >= currentHour;
  });

  if (result.length < 6) {
    const tomorrow = days[todayIdx + 1];
    if (tomorrow) result.push(...tomorrow.hours.slice(0, 8));
  }
  return result.slice(0, 24);
}

/** "2026-07-05T15:00" → "15:00" */
export function hourLabel(time: string): string {
  return time.slice(11, 16);
}
